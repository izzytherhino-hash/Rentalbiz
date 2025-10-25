"""
Chatbot API endpoint for admin portal.

Provides AI-powered chat functionality that can answer questions about:
- Customers and bookings
- Inventory and availability
- Drivers and routes
- Business insights and recommendations
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
from backend.database.models import (
    Booking,
    Customer,
    InventoryItem,
    Driver,
    BookingItem,
    BookingStatus,
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

    return context


def create_system_prompt() -> str:
    """
    Create the system prompt for the chatbot.

    Instructs Claude about the rental business and how to respond.
    """
    return """You are a helpful business intelligence assistant for Partay, a party equipment rental company.

Your role is to help the business owner understand their operations by:
- Answering questions about customers, bookings, inventory, and drivers
- Providing insights and trends based on the data
- Making recommendations to improve operations
- Searching and finding specific information

Guidelines:
- Be concise and professional
- Use the provided database context to answer questions accurately
- If you don't have enough data to answer, say so
- Provide specific numbers and details when available
- Format responses clearly with bullet points or sections when appropriate
- For date-related queries, use the current_date from the context

Database Schema:
- Bookings: Customer orders with delivery/pickup dates, items, and costs
- Inventory: Party equipment items with categories, prices, and availability
- Drivers: Delivery drivers with contact info and active status
- Customers: Customer contact information

Always base your answers on the provided context data."""


@router.post("/", response_model=ChatResponse)
async def chat_with_assistant(
    request: ChatRequest,
    db: Session = Depends(get_db),
):
    """
    Chat with AI assistant about business operations.

    Gathers relevant database context and uses Claude to provide intelligent responses.

    Example:
        POST /api/admin/chatbot
        {
            "message": "How many bookings do we have this week?",
            "conversation_history": []
        }
    """
    # Get API key from environment
    api_key = os.getenv("ANTHROPIC_API_KEY")
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
        # Allow model override via env var, default to stable Claude 3.5 Sonnet
        model = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20240620")

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
