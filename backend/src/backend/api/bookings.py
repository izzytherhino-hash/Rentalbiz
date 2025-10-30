"""
Booking API endpoints.

Handles customer booking flow:
- Check equipment availability
- Create new bookings
- Update booking status
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, UTC
from decimal import Decimal

from backend.database import get_db
from backend.database.models import (
    Customer,
    Booking,
    BookingItem,
    InventoryItem,
    BookingStatus,
    PaymentStatus,
)
from backend.database.schemas import (
    AvailabilityCheck,
    AvailabilityResponse,
    BookingCreate,
    CustomerBookingCreate,
    Booking as BookingSchema,
    PartySpaceDetails,
    InventoryItem as InventoryItemSchema,
)
from backend.features.booking.utils import (
    filter_available_items,
    check_availability,
    generate_order_number,
    calculate_rental_days,
    calculate_booking_total,
)

router = APIRouter()


@router.post("/check-availability", response_model=AvailabilityResponse)
async def check_booking_availability(
    data: AvailabilityCheck,
    db: Session = Depends(get_db),
):
    """
    Check if requested items are available for the date range.

    Prevents double-booking by detecting conflicts with existing reservations.

    Args:
        data: Item IDs and date range to check
        db: Database session

    Returns:
        Availability status with conflict details if any

    Example:
        POST /api/bookings/check-availability
        {
            "item_ids": ["item-uuid-1", "item-uuid-2"],
            "delivery_date": "2025-10-20",
            "pickup_date": "2025-10-22"
        }
    """
    result = check_availability(
        db=db,
        item_ids=data.item_ids,
        delivery_date=data.delivery_date,
        pickup_date=data.pickup_date,
    )

    return AvailabilityResponse(**result)


@router.post("/filter-items", response_model=List[InventoryItemSchema])
async def filter_items_by_space(
    space_details: PartySpaceDetails,
    db: Session = Depends(get_db),
):
    """
    Filter inventory items based on party space requirements.

    Smart filtering shows only items that fit customer's:
    - Available area (square feet)
    - Surface type (grass, concrete, indoor, etc.)
    - Power availability

    Args:
        space_details: Party space requirements
        db: Database session

    Returns:
        List of inventory items that meet requirements

    Example:
        POST /api/bookings/filter-items
        {
            "area_size": 400,
            "surface": "grass",
            "has_power": true
        }
    """
    items = filter_available_items(
        db=db,
        area_size=space_details.area_size,
        surface=space_details.surface,
        has_power=space_details.has_power,
    )

    return items


@router.post("/", response_model=BookingSchema, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new booking.

    Creates customer record if needed, generates order number,
    calculates totals, and creates booking with items.

    Args:
        booking_data: Booking details including items and customer info
        db: Database session

    Returns:
        Created booking with order number

    Raises:
        HTTPException: If items are not available or validation fails

    Example:
        POST /api/bookings
        {
            "customer_id": "customer-uuid",
            "delivery_date": "2025-10-20",
            "pickup_date": "2025-10-22",
            "delivery_address": "123 Main St",
            "items": [
                {"inventory_item_id": "item-uuid", "price": 250.00}
            ],
            "subtotal": 250.00,
            "delivery_fee": 50.00,
            "total": 300.00
        }
    """
    # Check availability first
    item_ids = [item.inventory_item_id for item in booking_data.items]
    availability = check_availability(
        db=db,
        item_ids=item_ids,
        delivery_date=booking_data.delivery_date,
        pickup_date=booking_data.pickup_date,
    )

    if not availability["available"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Items not available for requested dates",
                "conflicts": availability["conflicts"],
            },
        )

    # Verify customer exists
    customer = db.query(Customer).filter(
        Customer.customer_id == booking_data.customer_id
    ).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    # Calculate rental days
    rental_days = calculate_rental_days(
        booking_data.delivery_date,
        booking_data.pickup_date,
    )

    # Generate order number
    order_number = generate_order_number()

    # Create booking
    booking = Booking(
        order_number=order_number,
        customer_id=booking_data.customer_id,
        delivery_date=booking_data.delivery_date,
        delivery_time_window=booking_data.delivery_time_window,
        pickup_date=booking_data.pickup_date,
        pickup_time_window=booking_data.pickup_time_window,
        rental_days=rental_days,
        delivery_address=booking_data.delivery_address,
        delivery_lat=booking_data.delivery_lat,
        delivery_lng=booking_data.delivery_lng,
        setup_instructions=booking_data.setup_instructions,
        subtotal=booking_data.subtotal,
        delivery_fee=booking_data.delivery_fee,
        tip=booking_data.tip,
        total=booking_data.total,
        status=BookingStatus.PENDING.value,
        payment_status=PaymentStatus.PENDING.value,
    )

    db.add(booking)
    db.flush()  # Get booking ID

    # Create booking items
    for item_data in booking_data.items:
        # Verify item exists
        item = db.query(InventoryItem).filter(
            InventoryItem.inventory_item_id == item_data.inventory_item_id
        ).first()
        if not item:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item {item_data.inventory_item_id} not found",
            )

        booking_item = BookingItem(
            booking_id=booking.booking_id,
            inventory_item_id=item_data.inventory_item_id,
            quantity=item_data.quantity,
            price=item_data.price,
            pickup_warehouse_id=item.current_warehouse_id,
            return_warehouse_id=item.default_warehouse_id,  # Default return location
        )
        db.add(booking_item)

    # Update customer stats
    customer.total_bookings += 1
    customer.total_spent += booking_data.total

    # Commit transaction
    db.commit()
    db.refresh(booking)

    return booking


@router.post("/customer", response_model=BookingSchema, status_code=status.HTTP_201_CREATED)
async def create_customer_booking(
    booking_data: CustomerBookingCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new booking with customer details (simplified customer booking flow).

    This endpoint handles:
    - Finding or creating the customer by email
    - Calculating prices automatically
    - Creating the booking

    Args:
        booking_data: Customer and booking information
        db: Database session

    Returns:
        Created booking with all details

    Raises:
        HTTPException: If items are unavailable or not found

    Example:
        POST /api/bookings/customer
        {
            "customer_name": "John Doe",
            "customer_email": "john@example.com",
            "customer_phone": "7145550100",
            "delivery_date": "2025-10-26",
            "pickup_date": "2025-10-27",
            "delivery_address": "123 Main St",
            "items": [
                {"inventory_item_id": "item-uuid-1", "quantity": 1},
                {"inventory_item_id": "item-uuid-2", "quantity": 1}
            ]
        }
    """
    # Find or create customer by email
    customer = db.query(Customer).filter(Customer.email == booking_data.customer_email).first()

    if not customer:
        # Create new customer
        customer = Customer(
            name=booking_data.customer_name,
            email=booking_data.customer_email,
            phone=booking_data.customer_phone,
        )
        db.add(customer)
        db.flush()  # Get customer ID

    # Check availability
    item_ids = [item.inventory_item_id for item in booking_data.items]
    availability = check_availability(
        db=db,
        item_ids=item_ids,
        delivery_date=booking_data.delivery_date,
        pickup_date=booking_data.pickup_date,
    )

    if not availability["available"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Items not available for requested dates",
                "conflicts": availability["conflicts"],
            },
        )

    # Calculate prices
    subtotal = Decimal("0.00")
    item_prices = {}

    for item_data in booking_data.items:
        # Get item to get price
        item = db.query(InventoryItem).filter(
            InventoryItem.inventory_item_id == item_data.inventory_item_id
        ).first()

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item {item_data.inventory_item_id} not found",
            )

        # Calculate rental days
        rental_days = calculate_rental_days(
            booking_data.delivery_date,
            booking_data.pickup_date,
        )

        # Calculate item price (base_price * days * quantity)
        item_price = item.base_price * rental_days * item_data.quantity
        item_prices[item_data.inventory_item_id] = item_price
        subtotal += item_price

    # Calculate fees
    delivery_fee = Decimal("50.00")  # Flat delivery fee
    total = subtotal + delivery_fee

    # Generate order number
    order_number = generate_order_number()

    # Calculate rental days
    rental_days = calculate_rental_days(
        booking_data.delivery_date,
        booking_data.pickup_date,
    )

    # Create booking
    booking = Booking(
        order_number=order_number,
        customer_id=customer.customer_id,
        delivery_date=booking_data.delivery_date,
        pickup_date=booking_data.pickup_date,
        rental_days=rental_days,
        delivery_address=booking_data.delivery_address,
        delivery_lat=Decimal(str(booking_data.delivery_latitude)) if booking_data.delivery_latitude else None,
        delivery_lng=Decimal(str(booking_data.delivery_longitude)) if booking_data.delivery_longitude else None,
        setup_instructions=booking_data.notes,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        tip=Decimal("0.00"),
        total=total,
        status=BookingStatus.PENDING.value,
        payment_status=PaymentStatus.PENDING.value,
    )

    db.add(booking)
    db.flush()  # Get booking ID

    # Create booking items
    for item_data in booking_data.items:
        item = db.query(InventoryItem).filter(
            InventoryItem.inventory_item_id == item_data.inventory_item_id
        ).first()

        booking_item = BookingItem(
            booking_id=booking.booking_id,
            inventory_item_id=item_data.inventory_item_id,
            quantity=item_data.quantity,
            price=item_prices[item_data.inventory_item_id],
            pickup_warehouse_id=item.current_warehouse_id,
            return_warehouse_id=item.default_warehouse_id,
        )
        db.add(booking_item)

    # Update customer stats
    customer.total_bookings += 1
    customer.total_spent += total

    # Commit transaction
    db.commit()
    db.refresh(booking)

    return booking


@router.get("/{booking_id}", response_model=BookingSchema)
async def get_booking(
    booking_id: str,
    db: Session = Depends(get_db),
):
    """
    Get booking details by ID.

    Args:
        booking_id: Booking UUID
        db: Database session

    Returns:
        Booking details with items

    Raises:
        HTTPException: If booking not found
    """
    from sqlalchemy.orm import joinedload

    booking = (
        db.query(Booking)
        .options(
            joinedload(Booking.customer),
            joinedload(Booking.booking_items).joinedload(BookingItem.inventory_item),
            joinedload(Booking.assigned_driver),
            joinedload(Booking.pickup_driver)
        )
        .filter(Booking.booking_id == booking_id)
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    return booking


@router.get("/", response_model=List[BookingSchema])
async def list_bookings(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    delivery_date: str = None,
    db: Session = Depends(get_db),
):
    """
    List all bookings with optional filters.

    Args:
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        status: Filter by booking status
        delivery_date: Filter by delivery date (YYYY-MM-DD)
        db: Database session

    Returns:
        List of bookings

    Example:
        GET /api/bookings?status=confirmed&delivery_date=2025-10-20
    """
    from sqlalchemy.orm import joinedload

    query = (
        db.query(Booking)
        .options(
            joinedload(Booking.customer),
            joinedload(Booking.booking_items).joinedload(BookingItem.inventory_item),
            joinedload(Booking.assigned_driver),
            joinedload(Booking.pickup_driver)
        )
    )

    if status:
        query = query.filter(Booking.status == status)

    if delivery_date:
        from datetime import datetime
        date_obj = datetime.strptime(delivery_date, "%Y-%m-%d").date()
        query = query.filter(Booking.delivery_date == date_obj)

    bookings = query.offset(skip).limit(limit).all()
    return bookings
