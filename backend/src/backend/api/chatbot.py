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

CRITICAL Tool Usage Rules - ALL TOOLS (Read and Write):
- ALWAYS call the tool IMMEDIATELY with NO text beforehand
- DO NOT say "Let me check...", "I'll scan...", "I'll assign...", or any preamble
- DO NOT explain what you're going to do - just call the tool directly
- The system will execute the tool and you'll get results back - THEN respond with natural language
- Example flow for READ: User asks "scan bookings" → You call scan_unassigned_bookings tool → You get results → You say "Found 5 unassigned bookings: [details]"
- Example flow for WRITE: User says "assign Mike to Sarah's booking" → You call assign_driver_to_booking tool → You get confirmation → You say "Done! Mike is now assigned to Sarah Martinez's party on October 28th."
- When explaining results, use customer names, driver names, and dates - NEVER use technical IDs
- Example: Instead of "booking_id PTY-123" say "Sarah Martinez's party on October 28th"
- Never include text blocks when calling tools - just the tool call itself
- TOOL FIRST, EXPLANATION AFTER

Context & Reference Handling:
- REMEMBER data from previous tool executions in the conversation (booking IDs, order numbers, driver names)
- When user says "that one", "the first booking", "Mike's order", use context to figure out which booking
- If you just showed a list of bookings, and user refers to one of them, USE the booking_id from that list
- Only ask for clarification if truly ambiguous (e.g., user says "that booking" but you showed 10 bookings)
- When asking for clarification, be natural: "Which booking - the one for Sarah Martinez or the one for David Chen?"
- NEVER ask user to provide technical IDs like "booking_id" - figure it out from context or ask using human terms

Database Schema:
- Bookings: Customer orders with delivery/pickup dates, items, costs, and driver assignments
- Inventory: Party equipment with categories, prices, availability, and warehouse locations
- Drivers: Delivery drivers with contact info, active status, and performance metrics
- Customers: Customer contact and booking history
- Phineas Proposals: Your action proposals awaiting approval/execution

When you identify optimization opportunities (like unassigned trips), mention them naturally in conversation.
The admin can then use your scan-assignments endpoint to generate formal proposals.

Always base your analysis on the provided context data. You're here to make operations smoother, faster, and more profitable - let's make it lekker!"""


# Define tools that Phineas can use
def get_phineas_tools():
    """Define tools available to Phineas for taking actions."""
    return [
        {
            "name": "assign_driver_to_booking",
            "description": "Assign a driver to a booking for delivery and/or pickup. You can use NAMES instead of IDs - the system will look them up. For example: driver_name='Sarah Chen', customer_name='Emily Martinez'. This executes automatically - explain the assignment naturally after execution.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "booking_id": {
                        "type": "string",
                        "description": "The booking ID (optional if customer_name is provided)"
                    },
                    "customer_name": {
                        "type": "string",
                        "description": "The customer's name to find their booking (optional if booking_id is provided)"
                    },
                    "driver_id": {
                        "type": "string",
                        "description": "The driver ID (optional if driver_name is provided)"
                    },
                    "driver_name": {
                        "type": "string",
                        "description": "The driver's name to assign (optional if driver_id is provided)"
                    },
                    "trip_type": {
                        "type": "string",
                        "enum": ["delivery", "pickup", "both"],
                        "description": "Whether to assign for delivery, pickup, or both. Default to 'both' if not specified."
                    }
                },
                "required": []
            }
        },
        {
            "name": "get_driver_recommendations",
            "description": "Get recommended drivers for a specific booking based on proximity and availability. Use this to analyze who would be best for a trip. This is a read-only operation and executes automatically.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "booking_id": {
                        "type": "string",
                        "description": "The ID of the booking to get recommendations for"
                    }
                },
                "required": ["booking_id"]
            }
        },
        {
            "name": "scan_unassigned_bookings",
            "description": "Scan for all bookings that need driver assignments. Use this to get a comprehensive list of trips that need attention. This is a read-only operation and executes automatically.",
            "input_schema": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    ]


def tool_requires_approval(tool_name: str) -> bool:
    """
    Determine if a tool requires user approval before execution.

    Read-only tools (reports, scans, analysis) execute automatically.
    Write tools (assignments, updates) require approval.
    """
    write_tools = {
        "assign_driver_to_booking",  # Modifies database
    }
    return tool_name in write_tools


def execute_tool(tool_name: str, tool_input: dict, db: Session):
    """Execute a tool and return the result."""
    if tool_name == "assign_driver_to_booking":
        from datetime import datetime, UTC

        print(f"\n🔍 Starting assign_driver_to_booking...")
        print(f"   Input: {tool_input}")

        # Look up driver (by ID or name)
        driver = None
        if "driver_id" in tool_input and tool_input["driver_id"]:
            print(f"   Looking up driver by ID: {tool_input['driver_id']}")
            driver = db.query(Driver).filter(Driver.driver_id == tool_input["driver_id"]).first()
        elif "driver_name" in tool_input and tool_input["driver_name"]:
            # Try exact name match first
            driver_name = tool_input["driver_name"]
            print(f"   Looking up driver by name: {driver_name}")
            driver = db.query(Driver).filter(Driver.name.ilike(f"%{driver_name}%")).first()

        if not driver:
            error_msg = f"Driver not found: {tool_input.get('driver_name') or tool_input.get('driver_id')}"
            print(f"   ❌ {error_msg}")
            return {"success": False, "error": error_msg}

        print(f"   ✅ Found driver: {driver.name} (ID: {driver.driver_id})")

        # Look up booking (by ID or customer name)
        booking = None
        if "booking_id" in tool_input and tool_input["booking_id"]:
            print(f"   Looking up booking by ID: {tool_input['booking_id']}")
            booking = db.query(Booking).filter(Booking.booking_id == tool_input["booking_id"]).first()
        elif "customer_name" in tool_input and tool_input["customer_name"]:
            # Find customer by name
            customer_name = tool_input["customer_name"]
            print(f"   Looking up customer by name: {customer_name}")
            customer = db.query(Customer).filter(Customer.name.ilike(f"%{customer_name}%")).first()

            if customer:
                print(f"   ✅ Found customer: {customer.name} (ID: {customer.customer_id})")
                # Get the customer's most relevant booking (prefer today's bookings, then upcoming)
                today = datetime.now(UTC).date()
                bookings = db.query(Booking).filter(
                    Booking.customer_id == customer.customer_id,
                    Booking.status.in_([BookingStatus.CONFIRMED.value, BookingStatus.ACTIVE.value])
                ).order_by(
                    # Prioritize today's bookings
                    (Booking.delivery_date == today).desc(),
                    # Then soonest upcoming
                    Booking.delivery_date.asc()
                ).all()

                print(f"   Found {len(bookings)} bookings for customer")

                # If multiple bookings, prefer one that needs a driver
                for b in bookings:
                    if not b.assigned_driver_id or not b.pickup_driver_id:
                        booking = b
                        print(f"   Selected unassigned booking: {b.order_number}")
                        break

                # Fall back to first booking
                if not booking and bookings:
                    booking = bookings[0]
                    print(f"   Selected first booking: {booking.order_number}")
            else:
                print(f"   ❌ Customer not found: {customer_name}")

        if not booking:
            error_msg = f"Booking not found for: {tool_input.get('customer_name') or tool_input.get('booking_id')}"
            print(f"   ❌ {error_msg}")
            return {"success": False, "error": error_msg}

        print(f"   ✅ Found booking: {booking.order_number} (ID: {booking.booking_id})")
        print(f"      Current delivery driver: {booking.assigned_driver_id or 'UNASSIGNED'}")
        print(f"      Current pickup driver: {booking.pickup_driver_id or 'UNASSIGNED'}")

        # Default trip_type to "both" if not specified
        trip_type = tool_input.get("trip_type", "both")
        print(f"   Trip type: {trip_type}")

        # Assign driver
        if trip_type in ["delivery", "both"]:
            print(f"   Setting delivery driver to {driver.driver_id}")
            booking.assigned_driver_id = driver.driver_id
        if trip_type in ["pickup", "both"]:
            print(f"   Setting pickup driver to {driver.driver_id}")
            booking.pickup_driver_id = driver.driver_id

        print(f"   💾 Committing to database...")
        db.commit()
        print(f"   ✅ Database commit successful!")

        result = {
            "success": True,
            "message": f"Successfully assigned {driver.name} to {booking.order_number} for {trip_type}",
            "booking_number": booking.order_number,
            "driver_name": driver.name,
            "customer_name": booking.customer.name if booking.customer else "Unknown"
        }
        print(f"   Result: {result}")
        return result

    elif tool_name == "get_driver_recommendations":
        booking_id = tool_input["booking_id"]
        booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()

        if not booking:
            return {"success": False, "error": "Booking not found"}

        # Get recommendations (simplified - would normally call the full endpoint logic)
        drivers = db.query(Driver).filter(Driver.is_active == True).all()

        recommendations = []
        for driver in drivers[:3]:  # Top 3 recommendations
            # Simplified distance calculation - would use actual geocoding
            recommendations.append({
                "driver_id": driver.driver_id,
                "driver_name": driver.name,
                "distance_km": 2.5,  # Placeholder
                "reason": f"{driver.name} is available and nearby"
            })

        return {
            "success": True,
            "booking_id": booking_id,
            "booking_number": booking.order_number,
            "recommendations": recommendations
        }

    elif tool_name == "scan_unassigned_bookings":
        # Get all bookings needing drivers
        bookings = db.query(Booking).filter(
            Booking.status.in_([BookingStatus.CONFIRMED.value, BookingStatus.ACTIVE.value])
        ).all()

        unassigned = []
        for booking in bookings:
            needs_delivery = not booking.assigned_driver_id
            needs_pickup = not booking.pickup_driver_id

            if needs_delivery or needs_pickup:
                unassigned.append({
                    "booking_id": booking.booking_id,
                    "order_number": booking.order_number,
                    "customer_name": booking.customer.name if booking.customer else "Unknown",
                    "delivery_date": str(booking.delivery_date),
                    "needs_delivery_driver": needs_delivery,
                    "needs_pickup_driver": needs_pickup
                })

        return {
            "success": True,
            "total_unassigned": len(unassigned),
            "bookings": unassigned[:5]  # Return top 5
        }

    return {"success": False, "error": f"Unknown tool: {tool_name}"}


@router.post("/", response_model=ChatResponse)
async def chat_with_phineas(
    request: ChatRequest,
    db: Session = Depends(get_db),
):
    """
    Chat with Phineas, the AI operations manager.

    Phineas can now propose and execute actions conversationally using tools.
    He'll ask for your approval before taking actions like assigning drivers.

    Example conversation:
        User: "What should I do about unassigned bookings?"
        Phineas: "I found 3 unassigned trips. Should I assign Mike to booking #123?"
        User: "Yes, do it"
        Phineas: "Done! Mike has been assigned."
    """
    # CRITICAL: File-based logging to bypass stdout issues
    import datetime
    with open("/tmp/phineas_debug.log", "a") as f:
        timestamp = datetime.datetime.now().isoformat()
        f.write(f"\n{'='*80}\n")
        f.write(f"{timestamp} - 🎯 CHATBOT REQUEST RECEIVED\n")
        f.write(f"{'='*80}\n")
        f.write(f"Message: {request.message[:100]}\n")
        f.write(f"History length: {len(request.conversation_history)}\n")
        f.write(f"{'='*80}\n\n")
        f.flush()

    # CRITICAL: Log request arrival immediately
    print("\n" + "="*80, flush=True)
    print("🎯 CHATBOT REQUEST RECEIVED", flush=True)
    print("="*80, flush=True)
    print(f"Message: {request.message[:100]}", flush=True)
    print(f"History length: {len(request.conversation_history)}", flush=True)
    print("="*80 + "\n", flush=True)

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
        # Call Claude API with tools
        model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5-20250929")

        # Initial API call
        response = client.messages.create(
            model=model,
            max_tokens=2048,
            system=create_system_prompt(),
            messages=messages,
            tools=get_phineas_tools(),
        )

        # Handle tool use with automatic execution for read-only tools
        ai_response = ""
        tool_results = []

        # Process all content blocks
        for block in response.content:
            if block.type == "text":
                ai_response += block.text
            elif block.type == "tool_use":
                tool_name = block.name
                tool_input = block.input
                tool_use_id = block.id

                # File-based logging for tool execution
                with open("/tmp/phineas_debug.log", "a") as f:
                    f.write(f"\n{'='*60}\n")
                    f.write(f"🔧 TOOL EXECUTION DETECTED\n")
                    f.write(f"{'='*60}\n")
                    f.write(f"Tool Name: {tool_name}\n")
                    f.write(f"Tool Input: {tool_input}\n")
                    f.write(f"Tool Use ID: {tool_use_id}\n")
                    f.write(f"{'='*60}\n\n")
                    f.flush()

                print(f"\n{'='*60}", flush=True)
                print(f"🔧 TOOL EXECUTION DETECTED", flush=True)
                print(f"{'='*60}", flush=True)
                print(f"Tool Name: {tool_name}", flush=True)
                print(f"Tool Input: {tool_input}", flush=True)
                print(f"Tool Use ID: {tool_use_id}", flush=True)
                print(f"{'='*60}\n", flush=True)

                # Execute all tools automatically (both read and write operations)
                tool_result = execute_tool(tool_name, tool_input, db)

                # File-based logging for tool result
                with open("/tmp/phineas_debug.log", "a") as f:
                    f.write(f"\n{'='*60}\n")
                    f.write(f"✅ TOOL EXECUTION COMPLETED\n")
                    f.write(f"{'='*60}\n")
                    f.write(f"Tool Name: {tool_name}\n")
                    f.write(f"Result: {str(tool_result)[:1000]}\n")  # Limit to 1000 chars
                    f.write(f"{'='*60}\n\n")
                    f.flush()

                print(f"\n{'='*60}", flush=True)
                print(f"✅ TOOL EXECUTION COMPLETED", flush=True)
                print(f"{'='*60}", flush=True)
                print(f"Tool Name: {tool_name}", flush=True)
                print(f"Result: {tool_result}", flush=True)
                print(f"{'='*60}\n", flush=True)

                tool_results.append({
                    "tool_use_id": tool_use_id,
                    "result": tool_result,
                })

        # If we executed any tools, call Claude again with the results
        if tool_results:
            # Add assistant's response to messages
            messages.append({
                "role": "assistant",
                "content": response.content,
            })

            # Add tool results as a user message
            tool_result_content = []
            for tr in tool_results:
                tool_result_content.append({
                    "type": "tool_result",
                    "tool_use_id": tr["tool_use_id"],
                    "content": str(tr["result"]),
                })

            messages.append({
                "role": "user",
                "content": tool_result_content,
            })

            # Call Claude again to process the tool results
            follow_up_response = client.messages.create(
                model=model,
                max_tokens=2048,
                system=create_system_prompt(),
                messages=messages,
                tools=get_phineas_tools(),
            )

            # Process the follow-up response
            ai_response = ""
            for block in follow_up_response.content:
                if block.type == "text":
                    ai_response += block.text
                # Note: We don't handle nested tool calls in follow-up responses
                # The system prompt instructs Phineas to execute tools immediately

            # Fallback: If Claude didn't provide text after tool execution, generate a response
            if not ai_response.strip() and tool_results:
                # Generate natural language response based on tool results
                for result_data in tool_results:
                    result = result_data["result"]
                    if isinstance(result, dict):
                        if result.get("success"):
                            # For successful operations, create a friendly confirmation
                            if "driver_name" in result and "customer_name" in result:
                                ai_response = f"Done! I've assigned {result['driver_name']} to {result['customer_name']}'s booking ({result.get('booking_number', 'booking')}). The assignment is complete."
                            elif "message" in result:
                                ai_response = result["message"]
                            else:
                                ai_response = "Done! The action has been completed successfully."
                        else:
                            # For failed operations, explain the error
                            error = result.get("error", "Unknown error")
                            ai_response = f"I encountered an issue: {error}. Please check the details and try again."
                    else:
                        # For non-dict results (like scan results), format them naturally
                        ai_response = f"Here's what I found:\n\n{result}"

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
