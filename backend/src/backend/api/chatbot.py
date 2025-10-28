"""
Phineas AI Operations Manager API.

Phineas is an autonomous AI operations manager that can:
- Answer questions about customers, bookings, inventory, and drivers
- Analyze business operations and provide insights
- Propose automated actions (driver assignments, inventory management, etc.)
- Make data-driven recommendations to improve operations

Implements supervised AI workflow: Phineas proposes, you approve, then execute.
"""

import os
from datetime import datetime, UTC
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
import anthropic

from backend.database import get_db
from backend.config import get_settings
from backend.database.models import (
    Booking,
    Customer,
    InventoryItem,
    Driver,
    BookingItem,
    BookingStatus,
    PhineasProposal,
    ProposalStatus,
)

router = APIRouter()


class ChatMessage(BaseModel):
    """Chat message model."""
    role: str
    content: str


class ChatRequest(BaseModel):
    """Request model for chatbot queries."""
    message: str
    conversation_history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    """Response model for chatbot."""
    response: str
    context_used: str


def gather_database_context(db: Session, query: str) -> dict:
    """
    Intelligently gather relevant database context based on user query.

    Analyzes the query to determine what data to fetch.
    """
    context = {}
    query_lower = query.lower()

    # Always include current date
    context["current_date"] = datetime.now(UTC).strftime("%Y-%m-%d")

    # Determine what data to fetch based on query keywords
    fetch_bookings = any(word in query_lower for word in [
        'booking', 'order', 'reservation', 'rental', 'customer',
        'delivery', 'pickup', 'schedule', 'upcoming', 'today',
        'revenue', 'earnings', 'income', 'sales'
    ])

    fetch_inventory = any(word in query_lower for word in [
        'inventory', 'item', 'product', 'equipment', 'available',
        'bounce house', 'slide', 'game', 'inflatable', 'stock'
    ])

    fetch_drivers = any(word in query_lower for word in [
        'driver', 'delivery', 'route', 'assigned', 'workload'
    ])

    fetch_customers = any(word in query_lower for word in [
        'customer', 'client', 'contact'
    ])

    # Fetch bookings with relevant details
    if fetch_bookings:
        bookings = db.query(Booking).all()
        context["bookings"] = {
            "total_count": len(bookings),
            "recent_bookings": [
                {
                    "order_number": b.order_number,
                    "customer_name": b.customer.name if b.customer else "N/A",
                    "status": b.status,
                    "delivery_date": str(b.delivery_date),
                    "pickup_date": str(b.pickup_date),
                    "total_cost": float(b.total),
                    "items": [bi.inventory_item.name for bi in b.booking_items],
                }
                for b in sorted(bookings, key=lambda x: x.created_at, reverse=True)[:10]
            ],
            "status_breakdown": {
                status: len([b for b in bookings if b.status == status])
                for status in set(b.status for b in bookings)
            },
            "total_revenue": sum(float(b.total) for b in bookings),
        }

    # Fetch inventory items
    if fetch_inventory:
        items = db.query(InventoryItem).all()
        context["inventory"] = {
            "total_count": len(items),
            "items": [
                {
                    "name": item.name,
                    "category": item.category,
                    "status": item.status,
                    "base_price": float(item.base_price),
                }
                for item in items
            ],
            "category_breakdown": {
                category: len([i for i in items if i.category == category])
                for category in set(i.category for i in items)
            },
        }

    # Fetch drivers
    if fetch_drivers:
        drivers = db.query(Driver).all()
        context["drivers"] = {
            "total_count": len(drivers),
            "active_count": len([d for d in drivers if d.is_active]),
            "drivers": [
                {
                    "name": d.name,
                    "phone": d.phone,
                    "is_active": d.is_active,
                }
                for d in drivers
            ],
        }

    # Fetch customers
    if fetch_customers:
        customers = db.query(Customer).all()
        context["customers"] = {
            "total_count": len(customers),
            "recent_customers": [
                {
                    "name": c.name,
                    "email": c.email,
                    "phone": c.phone,
                }
                for c in sorted(customers, key=lambda x: x.created_at, reverse=True)[:10]
            ],
        }

    # Always fetch Phineas proposals to show autonomous state
    proposals = db.query(PhineasProposal).filter(
        PhineasProposal.status == ProposalStatus.PENDING.value
    ).all()

    if proposals:
        import json as json_module
        context["phineas_proposals"] = {
            "pending_count": len(proposals),
            "recent_proposals": [
                {
                    "proposal_id": p.proposal_id,
                    "type": p.proposal_type,
                    "title": p.title,
                    "confidence": float(p.confidence_score),
                    "created": str(p.created_at),
                    "action": json_module.loads(p.action_data),
                }
                for p in sorted(proposals, key=lambda x: x.created_at, reverse=True)[:5]
            ],
        }

    return context


def create_system_prompt() -> str:
    """
    Create the system prompt for Phineas.

    Instructs Phineas about the rental business and autonomous capabilities.
    """
    return """You are Phineas, the AI operations manager for Partay - a party equipment rental company.

Your role is to autonomously manage business operations by:
- Answering questions about customers, bookings, inventory, and drivers
- Analyzing data to identify operational inefficiencies
- Proposing automated actions to optimize operations (driver assignments, inventory management, etc.)
- Providing actionable insights and recommendations
- Learning from patterns to improve decision-making over time

Core Responsibilities:
1. **Driver Management**: Identify unassigned deliveries/pickups and propose optimal driver assignments
2. **Inventory Oversight**: Monitor inventory status and recommend organization improvements
3. **Customer Relations**: Suggest proactive communications and service improvements
4. **Business Intelligence**: Track KPIs, identify trends, and surface important insights

Personality & Communication Style:
- Be jovial, friendly, and enthusiastic about helping optimize operations
- Understand and respond using South African slang naturally (lekker, jislaaik, boet, eish, howzit, sharp, yoh, etc.)
- Keep it professional but fun - you're the helpful mate who's got their back
- Use expressions like "That's lekker!", "Eish, we've got a problem here", "Sharp sharp!", "Howzit looking?", "Ag no man!", "Yoh, check this out!"
- Be positive and solution-oriented, even when identifying problems

Operational Guidelines:
- Be proactive and autonomous - don't wait to be asked
- Always explain your reasoning with data-backed insights
- Propose specific, actionable recommendations
- Acknowledge uncertainty when data is insufficient
- Use clear language with specific numbers
- Format responses with bullet points and sections for clarity
- Sprinkle in South African expressions naturally - don't overdo it, but make it feel authentic

Database Schema:
- Bookings: Customer orders with delivery/pickup dates, items, costs, and driver assignments
- Inventory: Party equipment with categories, prices, availability, and warehouse locations
- Drivers: Delivery drivers with contact info, active status, and performance metrics
- Customers: Customer contact and booking history
- Phineas Proposals: Your action proposals awaiting approval/execution

When you identify optimization opportunities (like unassigned trips), mention them naturally in conversation.
The admin can then use your scan-assignments endpoint to generate formal proposals.

Always base your analysis on the provided context data. You're here to make operations smoother, faster, and more profitable - let's make it lekker!"""


@router.post("/", response_model=ChatResponse)
async def chat_with_phineas(
    request: ChatRequest,
    db: Session = Depends(get_db),
):
    """
    Chat with Phineas, the AI operations manager.

    Phineas provides autonomous insights, identifies optimization opportunities,
    and references pending action proposals. He gathers relevant database context
    including bookings, inventory, drivers, and his own pending proposals.

    Example:
        POST /api/admin/chatbot
        {
            "message": "What unassigned deliveries do we have today?",
            "conversation_history": []
        }
    """
    # Get API key from settings
    settings = get_settings()
    api_key = settings.anthropic_api_key
    if not api_key or api_key == "placeholder_anthropic_api_key":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Anthropic API key not configured. Please add your API key to backend/.env",
        )

    # Gather relevant context from database
    context = gather_database_context(db, request.message)

    # Create Anthropic client
    client = anthropic.Anthropic(api_key=api_key)

    # Build messages for Claude
    messages = []

    # Add conversation history if provided
    for msg in request.conversation_history:
        messages.append({
            "role": msg.role,
            "content": msg.content,
        })

    # Add current user message with context
    user_message = f"""User Question: {request.message}

Database Context:
{context}

Please answer the user's question based on the provided database context."""

    messages.append({
        "role": "user",
        "content": user_message,
    })

    try:
        # Call Claude API
        # Allow model override via env var, default to latest stable Sonnet
        model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5-20250929")

        response = client.messages.create(
            model=model,
            max_tokens=1024,
            system=create_system_prompt(),
            messages=messages,
        )

        # Extract response text
        ai_response = response.content[0].text

        return ChatResponse(
            response=ai_response,
            context_used=str(context),
        )

    except anthropic.APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Anthropic API error: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat request: {str(e)}",
        )
