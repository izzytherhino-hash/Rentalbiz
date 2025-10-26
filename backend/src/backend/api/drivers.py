"""
Driver API endpoints.

Handles driver dashboard operations:
- Get driver route for a specific date
- Mark stops as complete
- Record inventory movements
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import date, datetime, UTC

from backend.database import get_db
from backend.database.models import (
    Driver,
    Booking,
    BookingItem,
    InventoryMovement,
    InventoryItem,
    BookingStatus,
    MovementType,
    LocationType,
)
from backend.database.schemas import (
    Driver as DriverSchema,
    DriverCreate,
    DriverUpdate,
    InventoryMovementCreate,
)

router = APIRouter()


@router.get("/", response_model=List[DriverSchema])
async def list_drivers(
    is_active: bool = None,
    db: Session = Depends(get_db),
):
    """
    List all drivers.

    Args:
        is_active: Filter by active status
        db: Database session

    Returns:
        List of drivers with stats
    """
    query = db.query(Driver)

    if is_active is not None:
        query = query.filter(Driver.is_active == is_active)

    drivers = query.all()
    return drivers


@router.post("/", response_model=DriverSchema, status_code=status.HTTP_201_CREATED)
async def create_driver(
    driver_data: DriverCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new driver.

    Args:
        driver_data: Driver information
        db: Database session

    Returns:
        Created driver

    Example:
        POST /api/drivers/
        {
            "name": "John Smith",
            "email": "john@example.com",
            "phone": "(555) 123-4567",
            "license_number": "DL123456",
            "is_active": true
        }
    """
    driver = Driver(**driver_data.model_dump())
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver


@router.get("/{driver_id}", response_model=DriverSchema)
async def get_driver(
    driver_id: str,
    db: Session = Depends(get_db),
):
    """
    Get driver details.

    Args:
        driver_id: Driver UUID
        db: Database session

    Returns:
        Driver information

    Raises:
        HTTPException: If driver not found
    """
    driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()

    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found",
        )

    return driver


@router.patch("/{driver_id}", response_model=DriverSchema)
async def update_driver(
    driver_id: str,
    driver_data: DriverUpdate,
    db: Session = Depends(get_db),
):
    """
    Update driver information.

    Args:
        driver_id: Driver UUID
        driver_data: Updated driver information
        db: Database session

    Returns:
        Updated driver

    Raises:
        HTTPException: If driver not found

    Example:
        PATCH /api/drivers/{driver_id}
        {
            "name": "John Smith Jr.",
            "is_active": false
        }
    """
    driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()

    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found",
        )

    # Update fields
    update_dict = driver_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(driver, field, value)

    db.commit()
    db.refresh(driver)
    return driver


@router.get("/{driver_id}/route/{route_date}")
async def get_driver_route(
    driver_id: str,
    route_date: date,
    db: Session = Depends(get_db),
):
    """
    Get driver's route for a specific date.

    Returns organized stops in order:
    1. Warehouse pickups (load items)
    2. Customer deliveries (drop off)
    3. Customer pickups (collect from ended rentals)
    4. Warehouse returns (return items to correct warehouse)

    Args:
        driver_id: Driver UUID
        route_date: Date for route
        db: Database session

    Returns:
        Organized list of stops with items and instructions

    Example:
        GET /api/drivers/{driver_id}/route/2025-10-20
    """
    # Verify driver exists
    driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found",
        )

    # Get deliveries for this date
    deliveries = (
        db.query(Booking)
        .filter(Booking.assigned_driver_id == driver_id)
        .filter(Booking.delivery_date == route_date)
        .all()
    )

    # Get pickups for this date
    pickups = (
        db.query(Booking)
        .filter(Booking.pickup_driver_id == driver_id)
        .filter(Booking.pickup_date == route_date)
        .all()
    )

    # Organize stops
    stops = []
    stop_number = 1

    # 1. Warehouse pickups - items to load at start of route
    warehouse_pickups = {}
    for booking in deliveries:
        for booking_item in booking.booking_items:
            warehouse_id = booking_item.pickup_warehouse_id
            if warehouse_id:
                if warehouse_id not in warehouse_pickups:
                    warehouse_pickups[warehouse_id] = {
                        "items": [],
                        "warehouse": booking_item.pickup_warehouse
                    }
                warehouse_pickups[warehouse_id]["items"].append({
                    "name": booking_item.inventory_item.name,
                    "for_order": booking.order_number,
                })

    for warehouse_id, data in warehouse_pickups.items():
        stops.append({
            "stop_number": stop_number,
            "type": "warehouse_pickup",
            "warehouse_id": warehouse_id,
            "warehouse_name": data["warehouse"].name,
            "address": data["warehouse"].address,
            "delivery_lat": data["warehouse"].address_lat,
            "delivery_lng": data["warehouse"].address_lng,
            "items": data["items"],
            "status": "pending",
        })
        stop_number += 1

    # 2. Customer deliveries
    for booking in deliveries:
        items = [bi.inventory_item.name for bi in booking.booking_items]
        stops.append({
            "stop_number": stop_number,
            "type": "delivery",
            "booking_id": booking.booking_id,
            "order_number": booking.order_number,
            "customer_name": booking.customer.name,
            "customer_phone": booking.customer.phone,
            "address": booking.delivery_address,
            "delivery_lat": booking.delivery_lat,
            "delivery_lng": booking.delivery_lng,
            "time_window": booking.delivery_time_window,
            "items": items,
            "instructions": booking.setup_instructions,
            "delivery_fee": float(booking.delivery_fee),
            "tip": float(booking.tip),
            "status": booking.status,
        })
        stop_number += 1

    # 3. Customer pickups
    for booking in pickups:
        items_info = []
        for booking_item in booking.booking_items:
            item_name = booking_item.inventory_item.name
            return_warehouse = booking_item.return_warehouse

            # Check if there's a next booking for this item
            next_booking = find_next_booking(
                db,
                booking_item.inventory_item_id,
                route_date
            )

            items_info.append({
                "name": item_name,
                "return_warehouse": return_warehouse.name if return_warehouse else "Default",
                "has_next_booking": next_booking is not None,
                "next_booking_date": str(next_booking.delivery_date) if next_booking else None,
            })

        stops.append({
            "stop_number": stop_number,
            "type": "pickup",
            "booking_id": booking.booking_id,
            "order_number": booking.order_number,
            "customer_name": booking.customer.name,
            "customer_phone": booking.customer.phone,
            "address": booking.delivery_address,
            "delivery_lat": booking.delivery_lat,
            "delivery_lng": booking.delivery_lng,
            "time_window": booking.pickup_time_window,
            "items": items_info,
            "instructions": booking.setup_instructions,
            "status": booking.status,
        })
        stop_number += 1

    # 4. Warehouse returns (grouped by warehouse)
    warehouse_returns = {}
    for booking in pickups:
        for booking_item in booking.booking_items:
            warehouse_id = booking_item.return_warehouse_id
            if warehouse_id:
                if warehouse_id not in warehouse_returns:
                    warehouse_returns[warehouse_id] = {
                        "items": [],
                        "warehouse": booking_item.return_warehouse
                    }
                warehouse_returns[warehouse_id]["items"].append({
                    "name": booking_item.inventory_item.name,
                    "from_order": booking.order_number,
                })

    for warehouse_id, data in warehouse_returns.items():
        stops.append({
            "stop_number": stop_number,
            "type": "warehouse_return",
            "warehouse_id": warehouse_id,
            "warehouse_name": data["warehouse"].name,
            "address": data["warehouse"].address,
            "delivery_lat": data["warehouse"].address_lat,
            "delivery_lng": data["warehouse"].address_lng,
            "items": data["items"],
            "status": "pending",
        })
        stop_number += 1

    # Calculate earnings
    total_earnings = sum(
        float(booking.delivery_fee) + float(booking.tip)
        for booking in deliveries
    )

    # Organize stops by type for frontend
    warehouse_pickup_stops = [s for s in stops if s["type"] == "warehouse_pickup"]
    delivery_stops = [s for s in stops if s["type"] == "delivery"]
    pickup_stops = [s for s in stops if s["type"] == "pickup"]
    warehouse_return_stops = [s for s in stops if s["type"] == "warehouse_return"]

    return {
        "driver_id": driver_id,
        "driver_name": driver.name,
        "route_date": str(route_date),
        "total_stops": len(stops),
        "total_earnings": total_earnings,
        "warehouse_pickups": warehouse_pickup_stops,
        "deliveries": delivery_stops,
        "pickups": pickup_stops,
        "warehouse_returns": warehouse_return_stops,
    }


def find_next_booking(db: Session, item_id: str, after_date: date):
    """
    Find the next booking for an item after a given date.

    Used to determine where item should be returned.
    """
    return (
        db.query(Booking)
        .join(BookingItem)
        .filter(BookingItem.inventory_item_id == item_id)
        .filter(Booking.delivery_date > after_date)
        .filter(Booking.status.notin_([BookingStatus.CANCELLED.value]))
        .order_by(Booking.delivery_date.asc())
        .first()
    )


@router.post("/movements", status_code=status.HTTP_201_CREATED)
async def record_inventory_movement(
    movement_data: InventoryMovementCreate,
    db: Session = Depends(get_db),
):
    """
    Record an inventory movement.

    Logs when items move between locations for audit trail
    and real-time inventory tracking.

    Args:
        movement_data: Movement details
        db: Database session

    Returns:
        Created movement record

    Example:
        POST /api/drivers/movements
        {
            "inventory_item_id": "item-uuid",
            "booking_id": "booking-uuid",
            "movement_type": "delivery_to_customer",
            "from_location_type": "warehouse",
            "from_location_id": "warehouse-uuid",
            "to_location_type": "customer",
            "to_location_id": "customer-uuid",
            "driver_id": "driver-uuid"
        }
    """
    movement = InventoryMovement(**movement_data.model_dump())
    db.add(movement)

    # Update item's current location if applicable
    if movement_data.movement_type == MovementType.RETURN_TO_WAREHOUSE.value:
        item = db.query(InventoryItem).filter(
            InventoryItem.inventory_item_id == movement_data.inventory_item_id
        ).first()
        if item:
            item.current_warehouse_id = movement_data.to_location_id
            item.status = "available"

    elif movement_data.movement_type == MovementType.DELIVERY_TO_CUSTOMER.value:
        item = db.query(InventoryItem).filter(
            InventoryItem.inventory_item_id == movement_data.inventory_item_id
        ).first()
        if item:
            item.current_warehouse_id = None
            item.status = "rented"

    db.commit()
    db.refresh(movement)

    return {
        "movement_id": movement.inventory_movement_id,
        "message": "Movement recorded successfully",
    }
