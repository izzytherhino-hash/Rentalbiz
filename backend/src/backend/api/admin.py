"""
Admin API endpoints.

Handles admin dashboard operations:
- View all bookings with filters
- Detect conflicts
- Manage drivers and assignments
- Update booking status
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import date

from backend.database import get_db
from backend.database.models import (
    Booking,
    BookingItem,
    Driver,
    InventoryItem,
)
from backend.database.schemas import (
    Booking as BookingSchema,
    BookingUpdate,
)
from backend.features.booking.utils import detect_all_conflicts

router = APIRouter()


@router.get("/bookings", response_model=List[BookingSchema])
async def get_all_bookings(
    date_filter: date = None,
    status: str = None,
    driver_id: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """
    Get all bookings with optional filters.

    Used by admin dashboard calendar view and booking management.

    Args:
        date_filter: Filter by delivery or pickup date
        status: Filter by booking status
        driver_id: Filter by assigned driver
        skip: Pagination offset
        limit: Maximum results
        db: Database session

    Returns:
        List of bookings with full details

    Example:
        GET /api/admin/bookings?date_filter=2025-10-20&status=confirmed
    """
    query = db.query(Booking).options(
        joinedload(Booking.customer),
        joinedload(Booking.booking_items).joinedload(BookingItem.inventory_item),
        joinedload(Booking.assigned_driver),
        joinedload(Booking.pickup_driver)
    )

    if date_filter:
        query = query.filter(
            (Booking.delivery_date == date_filter) | (Booking.pickup_date == date_filter)
        )

    if status:
        query = query.filter(Booking.status == status)

    if driver_id:
        query = query.filter(
            (Booking.assigned_driver_id == driver_id) | (Booking.pickup_driver_id == driver_id)
        )

    bookings = query.order_by(Booking.delivery_date.desc()).offset(skip).limit(limit).all()
    return bookings


@router.get("/conflicts")
async def get_conflicts(db: Session = Depends(get_db)):
    """
    Detect all booking conflicts in the system.

    Shows items that are double-booked with overlapping dates.
    Critical for preventing scheduling issues.

    Returns:
        List of conflicts with item and booking details

    Example:
        GET /api/admin/conflicts
        Response: [
            {
                "item_id": "...",
                "item_name": "Bounce House",
                "booking1": {...},
                "booking2": {...}
            }
        ]
    """
    conflicts = detect_all_conflicts(db)

    return {
        "total_conflicts": len(conflicts),
        "conflicts": conflicts,
    }


@router.get("/stats")
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Get dashboard statistics for admin overview.

    Returns:
        Key metrics for dashboard widgets

    Example:
        GET /api/admin/stats
    """
    from backend.database.models import BookingStatus
    from datetime import datetime, UTC

    today = datetime.now(UTC).date()

    # Deliveries today
    deliveries_today = (
        db.query(Booking)
        .filter(Booking.delivery_date == today)
        .count()
    )

    # Active rentals
    active_rentals = (
        db.query(Booking)
        .filter(Booking.status == BookingStatus.ACTIVE.value)
        .count()
    )

    # Unassigned bookings
    unassigned = (
        db.query(Booking)
        .filter(Booking.assigned_driver_id.is_(None))
        .filter(Booking.status.notin_([
            BookingStatus.CANCELLED.value,
            BookingStatus.COMPLETED.value
        ]))
        .count()
    )

    # Total conflicts
    conflicts = detect_all_conflicts(db)
    total_conflicts = len(conflicts)

    # Total drivers
    total_drivers = db.query(Driver).filter(Driver.is_active == True).count()

    # Available inventory
    available_inventory = (
        db.query(InventoryItem)
        .filter(InventoryItem.status == "available")
        .count()
    )

    return {
        "deliveries_today": deliveries_today,
        "active_rentals": active_rentals,
        "unassigned_bookings": unassigned,
        "total_conflicts": total_conflicts,
        "total_drivers": total_drivers,
        "available_inventory": available_inventory,
    }


@router.patch("/bookings/{booking_id}", response_model=BookingSchema)
async def update_booking(
    booking_id: str,
    update_data: BookingUpdate,
    db: Session = Depends(get_db),
):
    """
    Update booking details.

    Used for assigning drivers, updating status, etc.

    Args:
        booking_id: Booking UUID
        update_data: Fields to update
        db: Database session

    Returns:
        Updated booking

    Raises:
        HTTPException: If booking not found

    Example:
        PATCH /api/admin/bookings/{booking_id}
        {
            "assigned_driver_id": "driver-uuid",
            "status": "confirmed"
        }
    """
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(booking, field, value)

    db.commit()
    db.refresh(booking)

    return booking


@router.get("/drivers/unassigned-bookings")
async def get_unassigned_bookings(db: Session = Depends(get_db)):
    """
    Get all bookings without assigned drivers.

    Helps admin identify bookings that need driver assignment.

    Returns:
        List of unassigned bookings

    Example:
        GET /api/admin/drivers/unassigned-bookings
    """
    from backend.database.models import BookingStatus

    unassigned = (
        db.query(Booking)
        .options(
            joinedload(Booking.customer),
            joinedload(Booking.booking_items)
        )
        .filter(Booking.assigned_driver_id.is_(None))
        .filter(Booking.status.notin_([
            BookingStatus.CANCELLED.value,
            BookingStatus.COMPLETED.value
        ]))
        .order_by(Booking.delivery_date.asc())
        .all()
    )

    return {
        "total": len(unassigned),
        "bookings": [
            {
                "booking_id": booking.booking_id,
                "order_number": booking.order_number,
                "customer_name": booking.customer.name,
                "delivery_date": str(booking.delivery_date),
                "items_count": len(booking.booking_items),
            }
            for booking in unassigned
        ],
    }


@router.get("/drivers/workload")
async def get_drivers_workload(db: Session = Depends(get_db)):
    """
    Get workload statistics for all drivers.

    Shows how many bookings each driver has assigned.

    Returns:
        Driver workload data

    Example:
        GET /api/admin/drivers/workload
    """
    from backend.database.models import BookingStatus

    drivers = db.query(Driver).filter(Driver.is_active == True).all()

    workload = []
    for driver in drivers:
        assigned_count = (
            db.query(Booking)
            .filter(
                (Booking.assigned_driver_id == driver.driver_id) |
                (Booking.pickup_driver_id == driver.driver_id)
            )
            .filter(Booking.status.notin_([
                BookingStatus.CANCELLED.value,
                BookingStatus.COMPLETED.value
            ]))
            .count()
        )

        workload.append({
            "driver_id": driver.driver_id,
            "driver_name": driver.name,
            "assigned_bookings": assigned_count,
            "total_deliveries": driver.total_deliveries,
            "total_earnings": float(driver.total_earnings),
        })

    return {"drivers": workload}


@router.post("/migrate-schema")
async def migrate_schema(db: Session = Depends(get_db)):
    """
    Add missing columns to existing database tables.

    This endpoint safely adds columns that don't exist without affecting existing data.

    Returns:
        dict: Migration status
    """
    from sqlalchemy import text

    migrations_applied = []
    errors = []

    try:
        # List of ALTER TABLE statements to add missing columns
        migrations = [
            # Add description to inventory_items
            """
            ALTER TABLE inventory_items
            ADD COLUMN IF NOT EXISTS description TEXT
            """,
            # Add image_url to inventory_items
            """
            ALTER TABLE inventory_items
            ADD COLUMN IF NOT EXISTS image_url TEXT
            """,
            # Add website_visible to inventory_items
            """
            ALTER TABLE inventory_items
            ADD COLUMN IF NOT EXISTS website_visible BOOLEAN DEFAULT TRUE
            """,
            # Add requires_power to inventory_items
            """
            ALTER TABLE inventory_items
            ADD COLUMN IF NOT EXISTS requires_power BOOLEAN DEFAULT FALSE
            """,
            # Add min_space_sqft to inventory_items
            """
            ALTER TABLE inventory_items
            ADD COLUMN IF NOT EXISTS min_space_sqft INTEGER DEFAULT 0
            """,
            # Add on_time_deliveries to drivers
            """
            ALTER TABLE drivers
            ADD COLUMN IF NOT EXISTS on_time_deliveries INTEGER DEFAULT 0
            """,
            # Add late_deliveries to drivers
            """
            ALTER TABLE drivers
            ADD COLUMN IF NOT EXISTS late_deliveries INTEGER DEFAULT 0
            """,
            # Add avg_rating to drivers
            """
            ALTER TABLE drivers
            ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0.0
            """,
            # Add total_ratings to drivers
            """
            ALTER TABLE drivers
            ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0
            """,
        ]

        # Execute each migration
        for migration in migrations:
            try:
                db.execute(text(migration))
                db.commit()
                # Extract column name for reporting
                col_name = migration.split("ADD COLUMN IF NOT EXISTS")[1].split()[0] if "ADD COLUMN" in migration else "unknown"
                migrations_applied.append(f"Added column: {col_name}")
            except Exception as e:
                error_msg = f"Migration failed: {str(e)}"
                errors.append(error_msg)
                db.rollback()

        return {
            "success": len(errors) == 0,
            "message": "Schema migration completed",
            "migrations_applied": migrations_applied,
            "errors": errors if errors else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during migration: {str(e)}"
        )


@router.post("/seed-database")
async def seed_database(db: Session = Depends(get_db)):
    """
    Seed the database with initial sample data.

    WARNING: This will only work on empty databases. Use with caution in production.

    Returns:
        dict: Summary of seeded data
    """
    from backend.database.seed import seed_database as run_seed

    # Check if database is already seeded
    existing_items = db.query(InventoryItem).count()
    if existing_items > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database already contains {existing_items} items. Cannot seed."
        )

    try:
        # Run the seed function
        run_seed()

        # Get counts
        item_count = db.query(InventoryItem).count()
        driver_count = db.query(Driver).count()
        booking_count = db.query(Booking).count()

        return {
            "success": True,
            "message": "Database seeded successfully",
            "summary": {
                "inventory_items": item_count,
                "drivers": driver_count,
                "bookings": booking_count
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error seeding database: {str(e)}"
        )
