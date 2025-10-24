"""
Inventory API endpoints.

Handles inventory management:
- List all inventory items
- Get item details
- Get item availability calendar
- Real-time location tracking
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import date

from backend.database import get_db
from backend.database.models import (
    InventoryItem,
    Booking,
    BookingItem,
    BookingStatus,
)
from backend.database.schemas import (
    InventoryItem as InventoryItemSchema,
    InventoryItemUpdate,
)

router = APIRouter()


@router.get("/", response_model=List[InventoryItemSchema])
async def list_inventory(
    category: str = None,
    status: str = None,
    warehouse_id: str = None,
    db: Session = Depends(get_db),
):
    """
    List all inventory items with optional filters.

    Args:
        category: Filter by category (Inflatable, Concession, etc.)
        status: Filter by status (available, rented, maintenance)
        warehouse_id: Filter by current warehouse location
        db: Database session

    Returns:
        List of inventory items with real-time location

    Example:
        GET /api/inventory?category=Inflatable&status=available
    """
    query = db.query(InventoryItem)

    if category:
        query = query.filter(InventoryItem.category == category)

    if status:
        query = query.filter(InventoryItem.status == status)

    if warehouse_id:
        query = query.filter(InventoryItem.current_warehouse_id == warehouse_id)

    items = query.all()
    return items


@router.get("/{item_id}", response_model=InventoryItemSchema)
async def get_inventory_item(
    item_id: str,
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a specific inventory item.

    Args:
        item_id: Inventory item UUID
        db: Database session

    Returns:
        Inventory item details

    Raises:
        HTTPException: If item not found
    """
    item = db.query(InventoryItem).filter(
        InventoryItem.inventory_item_id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found",
        )

    return item


@router.get("/{item_id}/calendar")
async def get_item_calendar(
    item_id: str,
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db),
):
    """
    Get booking calendar for a specific item.

    Shows when the item is booked, helping with scheduling and
    identifying available dates.

    Args:
        item_id: Inventory item UUID
        start_date: Calendar start date (optional)
        end_date: Calendar end date (optional)
        db: Database session

    Returns:
        List of bookings for this item

    Example:
        GET /api/inventory/{item_id}/calendar?start_date=2025-10-01&end_date=2025-10-31
    """
    # Verify item exists
    item = db.query(InventoryItem).filter(
        InventoryItem.inventory_item_id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found",
        )

    # Query bookings for this item
    query = (
        db.query(Booking)
        .join(BookingItem)
        .filter(BookingItem.inventory_item_id == item_id)
        .filter(Booking.status.notin_([
            BookingStatus.CANCELLED.value,
            BookingStatus.COMPLETED.value
        ]))
    )

    if start_date:
        query = query.filter(Booking.pickup_date >= start_date)

    if end_date:
        query = query.filter(Booking.delivery_date <= end_date)

    bookings = query.all()

    # Format response
    calendar_items = []
    for booking in bookings:
        calendar_items.append({
            "booking_id": booking.booking_id,
            "order_number": booking.order_number,
            "customer_name": booking.customer.name,
            "delivery_date": str(booking.delivery_date),
            "pickup_date": str(booking.pickup_date),
            "status": booking.status,
        })

    return {
        "item_id": item_id,
        "item_name": item.name,
        "bookings": calendar_items,
    }


@router.get("/{item_id}/availability")
async def check_item_availability(
    item_id: str,
    delivery_date: date,
    pickup_date: date,
    db: Session = Depends(get_db),
):
    """
    Check if a specific item is available for date range.

    Args:
        item_id: Inventory item UUID
        delivery_date: Requested delivery date
        pickup_date: Requested pickup date
        db: Database session

    Returns:
        Availability status and conflicting bookings if any

    Example:
        GET /api/inventory/{item_id}/availability?delivery_date=2025-10-20&pickup_date=2025-10-22
    """
    # Verify item exists
    item = db.query(InventoryItem).filter(
        InventoryItem.inventory_item_id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found",
        )

    # Check for overlapping bookings
    conflicts = (
        db.query(Booking)
        .join(BookingItem)
        .filter(BookingItem.inventory_item_id == item_id)
        .filter(Booking.status.notin_([
            BookingStatus.CANCELLED.value,
            BookingStatus.COMPLETED.value
        ]))
        .filter(
            Booking.delivery_date <= pickup_date,
            Booking.pickup_date >= delivery_date,
        )
        .all()
    )

    available = len(conflicts) == 0

    return {
        "available": available,
        "item_id": item_id,
        "item_name": item.name,
        "requested_dates": {
            "delivery": str(delivery_date),
            "pickup": str(pickup_date),
        },
        "conflicts": [
            {
                "order_number": booking.order_number,
                "delivery_date": str(booking.delivery_date),
                "pickup_date": str(booking.pickup_date),
            }
            for booking in conflicts
        ] if not available else [],
    }


@router.patch("/{item_id}", response_model=InventoryItemSchema)
async def update_inventory_item(
    item_id: str,
    update_data: InventoryItemUpdate,
    db: Session = Depends(get_db),
):
    """
    Update inventory item details.

    Used for updating status, location, or item properties.

    Args:
        item_id: Inventory item UUID
        update_data: Fields to update
        db: Database session

    Returns:
        Updated inventory item

    Raises:
        HTTPException: If item not found
    """
    item = db.query(InventoryItem).filter(
        InventoryItem.inventory_item_id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found",
        )

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    return item
