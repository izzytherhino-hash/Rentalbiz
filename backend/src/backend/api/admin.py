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


@router.get("/drivers/recommendations/{booking_id}")
async def get_driver_recommendations(booking_id: str, db: Session = Depends(get_db)):
    """
    Get recommended drivers for a booking based on route optimization.

    Analyzes driver routes, proximity, and availability to recommend
    the best drivers for a specific booking.

    Args:
        booking_id: Booking UUID
        db: Database session

    Returns:
        List of recommended drivers with scores and reasoning

    Example:
        GET /api/admin/drivers/recommendations/{booking_id}
        Response: {
            "booking_id": "...",
            "recommendations": [
                {
                    "driver_id": "...",
                    "driver_name": "Mike Johnson",
                    "score": 2.5,
                    "distance_to_delivery": 1.2,
                    "route_disruption": 1.8,
                    "current_stops": 3,
                    "reason": "Minimal disruption (1.8mi added)"
                }
            ]
        }
    """
    from services.route_optimizer import recommend_drivers

    # Get the booking
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    # Get all drivers and bookings for route analysis
    drivers = db.query(Driver).all()
    all_bookings = db.query(Booking).all()

    # Convert to dicts for route optimizer
    drivers_dict = [
        {
            "id": d.driver_id,
            "name": d.name,
            "is_active": d.is_active
        }
        for d in drivers
    ]

    bookings_dict = [
        {
            "id": b.booking_id,
            "delivery_date": str(b.delivery_date),
            "pickup_date": str(b.pickup_date),
            "delivery_address": b.delivery_address,
            "delivery_driver_id": b.assigned_driver_id,
            "pickup_driver_id": b.pickup_driver_id
        }
        for b in all_bookings
    ]

    new_booking_dict = {
        "id": booking.booking_id,
        "delivery_date": str(booking.delivery_date),
        "pickup_date": str(booking.pickup_date),
        "delivery_address": booking.delivery_address
    }

    # Get recommendations
    recommendations = recommend_drivers(
        drivers_dict,
        bookings_dict,
        new_booking_dict,
        max_recommendations=5
    )

    return {
        "booking_id": booking_id,
        "delivery_address": booking.delivery_address,
        "delivery_date": str(booking.delivery_date),
        "recommendations": [rec.to_dict() for rec in recommendations]
    }


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


@router.post("/clear-and-reseed")
async def clear_and_reseed(db: Session = Depends(get_db)):
    """
    Clear ALL database data and reseed with fresh data.

    Deletes everything from all tables and reseeds with:
    - 3 warehouses
    - 8 inventory items
    - 3 drivers
    - 10 customers
    - 15 bookings

    WARNING: This will delete ALL data in the database!

    Returns:
        dict: Summary of reseeded data
    """
    from backend.database.seed import seed_database as run_seed
    from backend.database.models import (
        Customer, InventoryItem, Driver, Warehouse,
        BookingItem, InventoryPhoto, Notification, Payment, InventoryMovement
    )

    try:
        # Get counts before deletion
        old_counts = {
            "bookings": db.query(Booking).count(),
            "customers": db.query(Customer).count(),
            "drivers": db.query(Driver).count(),
            "inventory": db.query(InventoryItem).count(),
            "warehouses": db.query(Warehouse).count(),
        }

        # Delete all data in correct order (respecting foreign keys)
        print("🗑️  Deleting all database data...")
        db.query(BookingItem).delete()
        db.query(Booking).delete()
        db.query(InventoryPhoto).delete()
        db.query(InventoryMovement).delete()
        db.query(Payment).delete()
        db.query(Notification).delete()
        db.query(InventoryItem).delete()
        db.query(Customer).delete()
        db.query(Driver).delete()
        db.query(Warehouse).delete()
        db.commit()
        print("✅ All data deleted successfully")

        # Reseed everything fresh
        print("🌱 Reseeding database with fresh data...")
        run_seed()
        print("✅ Database reseeded successfully")

        # Get counts after seeding
        new_counts = {
            "warehouses": db.query(Warehouse).count(),
            "inventory": db.query(InventoryItem).count(),
            "drivers": db.query(Driver).count(),
            "customers": db.query(Customer).count(),
            "bookings": db.query(Booking).count(),
        }

        return {
            "success": True,
            "message": "Database cleared and reseeded successfully",
            "old_counts": old_counts,
            "new_counts": new_counts
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing and reseeding: {str(e)}"
        )


@router.post("/reseed-bookings")
async def reseed_bookings(db: Session = Depends(get_db)):
    """
    Reseed all bookings with updated data.

    Deletes all existing bookings and reseeds with latest booking data (15 bookings).
    Useful for updating production with new seed data.

    WARNING: This will delete all existing bookings!

    Returns:
        dict: Summary of reseeded bookings
    """
    from backend.database.seed import seed_bookings
    from backend.database.models import Customer, InventoryItem, Driver, Warehouse

    try:
        # Get current booking count
        old_booking_count = db.query(Booking).count()

        # Delete all existing bookings and booking items
        from backend.database.models import BookingItem
        db.query(BookingItem).delete()
        db.query(Booking).delete()
        db.commit()
        print(f"🗑️  Deleted {old_booking_count} existing bookings")

        # Get existing data
        customers = {c.name: c.customer_id for c in db.query(Customer).all()}
        drivers = {d.name: d.driver_id for d in db.query(Driver).all()}
        warehouses = {w.name: w.warehouse_id for w in db.query(Warehouse).all()}

        # Reseed bookings
        seed_bookings(db, customers, drivers, warehouses)
        db.commit()

        # Get new count
        new_booking_count = db.query(Booking).count()

        return {
            "success": True,
            "message": f"Reseeded bookings successfully",
            "old_bookings": old_booking_count,
            "new_bookings": new_booking_count
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reseeding bookings: {str(e)}"
        )


@router.post("/seed-inventory-photos")
async def seed_inventory_photos(
    clear_existing: bool = False,
    db: Session = Depends(get_db)
):
    """
    Seed inventory photos for existing items.

    Args:
        clear_existing: If True, delete all existing photos first

    Returns:
        dict: Summary of seeded photos
    """
    from backend.database.seed import seed_inventory_photos as run_seed_photos

    try:
        # Clear existing photos if requested
        if clear_existing:
            from backend.database.models import InventoryPhoto
            deleted_count = db.query(InventoryPhoto).delete()
            db.commit()
            print(f"🗑️  Deleted {deleted_count} existing photos")

        # Run the photo seeding function
        result = run_seed_photos(db)
        db.commit()

        # Get photo count
        from backend.database.models import InventoryPhoto
        photo_count = db.query(InventoryPhoto).count()

        return {
            "success": True,
            "message": "Inventory photos seeded successfully",
            "photos_created": photo_count,
            "cleared_old_photos": clear_existing,
            "details": result
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error seeding photos: {str(e)}"
        )


@router.post("/update-driver-performance")
async def update_driver_performance(db: Session = Depends(get_db)):
    """
    Update existing drivers with performance metrics.

    This endpoint adds realistic performance data to existing drivers
    for testing and demonstration purposes.

    Returns:
        Success message with updated driver stats

    Example:
        POST /api/admin/update-driver-performance
    """
    from decimal import Decimal

    try:
        # Update Mike Johnson - top performer
        mike = db.query(Driver).filter(Driver.name == "Mike Johnson").first()
        if mike:
            mike.total_deliveries = 47
            mike.total_earnings = Decimal("3525.00")
            mike.on_time_deliveries = 44
            mike.late_deliveries = 3
            mike.avg_rating = Decimal("4.8")
            mike.total_ratings = 42

        # Update Sarah Chen - consistent performer
        sarah = db.query(Driver).filter(Driver.name == "Sarah Chen").first()
        if sarah:
            sarah.total_deliveries = 38
            sarah.total_earnings = Decimal("2850.00")
            sarah.on_time_deliveries = 35
            sarah.late_deliveries = 3
            sarah.avg_rating = Decimal("4.6")
            sarah.total_ratings = 35

        # Update James Rodriguez - newer driver
        james = db.query(Driver).filter(Driver.name == "James Rodriguez").first()
        if james:
            james.total_deliveries = 23
            james.total_earnings = Decimal("1725.00")
            james.on_time_deliveries = 20
            james.late_deliveries = 3
            james.avg_rating = Decimal("4.5")
            james.total_ratings = 20

        db.commit()

        # Get updated counts
        drivers = db.query(Driver).all()
        driver_stats = []
        for d in drivers:
            on_time_pct = round((d.on_time_deliveries / (d.on_time_deliveries + d.late_deliveries)) * 100) if (d.on_time_deliveries + d.late_deliveries) > 0 else 0
            driver_stats.append({
                "name": d.name,
                "total_deliveries": d.total_deliveries,
                "avg_rating": float(d.avg_rating) if d.avg_rating else 0.0,
                "total_ratings": d.total_ratings,
                "on_time_percentage": on_time_pct
            })

        return {
            "success": True,
            "message": "Driver performance metrics updated successfully",
            "drivers": driver_stats
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating driver performance: {str(e)}"
        )
