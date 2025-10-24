"""
Business logic utilities for booking management.

Contains core algorithms for:
- Equipment filtering based on space requirements
- Conflict detection for double-booking prevention
- Order number generation
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from backend.database.models import (
    InventoryItem,
    Booking,
    BookingItem,
    BookingStatus,
)


def filter_available_items(
    db: Session,
    area_size: int,
    surface: str,
    has_power: bool,
) -> List[InventoryItem]:
    """
    Filter inventory items based on party space requirements.

    This is the CRITICAL smart filtering algorithm that only shows items
    that fit the customer's space, surface type, and power availability.

    Args:
        db: Database session
        area_size: Available area in square feet
        surface: Surface type (grass, concrete, asphalt, artificial_turf, indoor)
        has_power: Whether power outlet is available

    Returns:
        List of inventory items that meet requirements

    Example:
        >>> items = filter_available_items(db, 400, "grass", True)
        >>> # Returns items that fit in 400 sqft grass area with power
    """
    query = db.query(InventoryItem).filter(InventoryItem.status == "available")

    all_items = query.all()
    filtered_items = []

    for item in all_items:
        # Check area size requirement
        if item.min_space_sqft and area_size < item.min_space_sqft:
            continue

        # Check surface compatibility
        if item.allowed_surfaces:
            allowed = item.allowed_surfaces.split(",")
            if surface not in allowed:
                continue

        # Check power requirement
        if item.requires_power and not has_power:
            continue

        filtered_items.append(item)

    return filtered_items


def check_availability(
    db: Session,
    item_ids: List[str],
    delivery_date: date,
    pickup_date: date,
) -> Dict[str, Any]:
    """
    Check if items are available for the requested date range.

    Detects conflicts with existing bookings to prevent double-booking.

    Args:
        db: Database session
        item_ids: List of inventory item IDs to check
        delivery_date: Requested delivery date
        pickup_date: Requested pickup date

    Returns:
        Dict with 'available' (bool), 'conflicts' (list), and 'message' (str)

    Example:
        >>> result = check_availability(db, ["item-123"], date(2025, 10, 20), date(2025, 10, 22))
        >>> if result["available"]:
        >>>     # Proceed with booking
    """
    conflicts = []

    # Query all non-cancelled bookings that overlap with requested dates
    overlapping_bookings = (
        db.query(Booking)
        .filter(
            Booking.status.notin_([BookingStatus.CANCELLED.value, BookingStatus.COMPLETED.value])
        )
        .filter(
            Booking.delivery_date <= pickup_date,
            Booking.pickup_date >= delivery_date,
        )
        .all()
    )

    # Check each requested item against overlapping bookings
    for item_id in item_ids:
        item = db.query(InventoryItem).filter(InventoryItem.inventory_item_id == item_id).first()
        if not item:
            conflicts.append({
                "item_id": item_id,
                "reason": "Item not found",
            })
            continue

        # Check if item appears in any overlapping booking
        for booking in overlapping_bookings:
            booking_item_ids = [bi.inventory_item_id for bi in booking.booking_items]
            if item_id in booking_item_ids:
                conflicts.append({
                    "item_id": item_id,
                    "item_name": item.name,
                    "conflicting_booking": booking.order_number,
                    "conflict_dates": f"{booking.delivery_date} to {booking.pickup_date}",
                })

    available = len(conflicts) == 0
    message = "All items available" if available else f"Found {len(conflicts)} conflict(s)"

    return {
        "available": available,
        "conflicts": conflicts,
        "message": message,
    }


def generate_order_number() -> str:
    """
    Generate unique order number for booking.

    Format: PR-XXXX where XXXX is a random 4-digit number.

    Returns:
        Order number string (e.g., "PR-2847")

    Example:
        >>> order_num = generate_order_number()
        >>> print(order_num)  # "PR-8374"
    """
    import random
    return f"PR-{random.randint(1000, 9999)}"


def calculate_rental_days(delivery_date: date, pickup_date: date) -> int:
    """
    Calculate number of rental days.

    Args:
        delivery_date: Delivery date
        pickup_date: Pickup date

    Returns:
        Number of days (minimum 1)

    Example:
        >>> days = calculate_rental_days(date(2025, 10, 20), date(2025, 10, 22))
        >>> print(days)  # 3
    """
    delta = pickup_date - delivery_date
    return max(1, delta.days + 1)  # Include both start and end date


def calculate_booking_total(
    items: List[Dict[str, Any]],
    delivery_fee: Decimal = Decimal("50.00"),
    tip: Decimal = Decimal("0.00"),
) -> Dict[str, Decimal]:
    """
    Calculate booking totals.

    Args:
        items: List of items with 'price' field
        delivery_fee: Delivery fee (default $50)
        tip: Driver tip (default $0)

    Returns:
        Dict with subtotal, delivery_fee, tip, and total

    Example:
        >>> items = [{"price": Decimal("250")}, {"price": Decimal("75")}]
        >>> totals = calculate_booking_total(items)
        >>> print(totals["total"])  # 375.00
    """
    subtotal = sum(Decimal(str(item.get("price", 0))) for item in items)
    total = subtotal + delivery_fee + tip

    return {
        "subtotal": subtotal,
        "delivery_fee": delivery_fee,
        "tip": tip,
        "total": total,
    }


def detect_all_conflicts(db: Session) -> List[Dict[str, Any]]:
    """
    Detect ALL conflicts in the system.

    Used by admin dashboard to show double-booked items.

    Args:
        db: Database session

    Returns:
        List of conflicts with item and booking details

    Example:
        >>> conflicts = detect_all_conflicts(db)
        >>> for conflict in conflicts:
        >>>     print(f"{conflict['item_name']} double-booked")
    """
    conflicts = []
    item_bookings = {}

    # Get all active bookings
    active_bookings = (
        db.query(Booking)
        .filter(
            Booking.status.notin_([BookingStatus.CANCELLED.value, BookingStatus.COMPLETED.value])
        )
        .all()
    )

    # Group bookings by item
    for booking in active_bookings:
        for booking_item in booking.booking_items:
            item_id = booking_item.inventory_item_id
            if item_id not in item_bookings:
                item_bookings[item_id] = []
            item_bookings[item_id].append({
                "booking_id": booking.booking_id,
                "order_number": booking.order_number,
                "customer_name": booking.customer.name,
                "delivery_date": booking.delivery_date,
                "pickup_date": booking.pickup_date,
            })

    # Check for overlaps
    for item_id, bookings in item_bookings.items():
        if len(bookings) < 2:
            continue

        # Compare each booking with others
        for i, booking1 in enumerate(bookings):
            for booking2 in bookings[i + 1:]:
                # Check if dates overlap
                if (booking1["delivery_date"] <= booking2["pickup_date"] and
                    booking2["delivery_date"] <= booking1["pickup_date"]):

                    item = db.query(InventoryItem).filter(
                        InventoryItem.inventory_item_id == item_id
                    ).first()

                    conflicts.append({
                        "item_id": item_id,
                        "item_name": item.name if item else "Unknown",
                        "booking1": booking1,
                        "booking2": booking2,
                    })

    return conflicts
