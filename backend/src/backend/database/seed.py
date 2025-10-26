"""
Seed database with sample data for development.

Creates:
- 2 warehouses (Warehouse A - Main, Warehouse B - North)
- 3 drivers with performance metrics (Mike Johnson, Sarah Chen, James Rodriguez)
- 8 inventory items (bounce houses, concessions, etc.)
- 5 customers with sample bookings
"""

from decimal import Decimal
from sqlalchemy.orm import Session

from backend.database.connection import SessionLocal, engine
from backend.database import Base
from backend.database.models import (
    Warehouse,
    Driver,
    InventoryItem,
    InventoryPhoto,
    Customer,
    Booking,
    BookingItem,
    InventoryStatus,
    BookingStatus,
    PaymentStatus,
)
from datetime import date, timedelta


def seed_warehouses(db: Session) -> dict[str, str]:
    """
    Seed warehouse data.

    Returns:
        Dict mapping warehouse names to their IDs
    """
    warehouses_data = [
        {
            "name": "Warehouse A - Main",
            "address": "22 E Dyer Ave, Santa Ana, CA 92707",
            "address_lat": Decimal("33.7456"),
            "address_lng": Decimal("-117.8678"),
            "is_active": True,
        },
        {
            "name": "Warehouse B - North",
            "address": "Crystal Cove Shopping Center, Newport Beach, CA 92657",
            "address_lat": Decimal("33.5733"),
            "address_lng": Decimal("-117.8418"),
            "is_active": True,
        },
    ]

    warehouse_ids = {}
    for data in warehouses_data:
        warehouse = Warehouse(**data)
        db.add(warehouse)
        db.flush()  # Get the ID
        warehouse_ids[data["name"]] = warehouse.warehouse_id

    print(f"✅ Created {len(warehouses_data)} warehouses")
    return warehouse_ids


def seed_drivers(db: Session) -> dict[str, str]:
    """
    Seed driver data with performance metrics.

    Returns:
        Dict mapping driver names to their IDs
    """
    drivers_data = [
        {
            "name": "Mike Johnson",
            "email": "mike.johnson@partay.com",
            "phone": "(714) 555-0101",
            "license_number": "CA-DL-12345678",
            "is_active": True,
            # Performance metrics - top performer
            "total_deliveries": 47,
            "total_earnings": Decimal("3525.00"),
            "on_time_deliveries": 44,
            "late_deliveries": 3,
            "avg_rating": Decimal("4.8"),
            "total_ratings": 42,
        },
        {
            "name": "Sarah Chen",
            "email": "sarah.chen@partay.com",
            "phone": "(714) 555-0102",
            "license_number": "CA-DL-23456789",
            "is_active": True,
            # Performance metrics - consistent performer
            "total_deliveries": 38,
            "total_earnings": Decimal("2850.00"),
            "on_time_deliveries": 35,
            "late_deliveries": 3,
            "avg_rating": Decimal("4.6"),
            "total_ratings": 35,
        },
        {
            "name": "James Rodriguez",
            "email": "james.rodriguez@partay.com",
            "phone": "(714) 555-0103",
            "license_number": "CA-DL-34567890",
            "is_active": True,
            # Performance metrics - newer driver
            "total_deliveries": 23,
            "total_earnings": Decimal("1725.00"),
            "on_time_deliveries": 20,
            "late_deliveries": 3,
            "avg_rating": Decimal("4.5"),
            "total_ratings": 20,
        },
    ]

    driver_ids = {}
    for data in drivers_data:
        driver = Driver(**data)
        db.add(driver)
        db.flush()
        driver_ids[data["name"]] = driver.driver_id

    print(f"✅ Created {len(drivers_data)} drivers with performance metrics")
    return driver_ids


def seed_inventory_items(db: Session, warehouse_ids: dict[str, str]) -> None:
    """
    Seed inventory item data.

    Args:
        warehouse_ids: Dict mapping warehouse names to their IDs
    """
    warehouse_a_id = warehouse_ids["Warehouse A - Main"]
    warehouse_b_id = warehouse_ids["Warehouse B - North"]

    items_data = [
        {
            "name": "Bounce House Castle",
            "category": "Inflatable",
            "base_price": Decimal("250.00"),
            "requires_power": True,
            "min_space_sqft": 225,  # 15x15
            "allowed_surfaces": "grass,artificial_turf",
            "default_warehouse_id": warehouse_a_id,
            "current_warehouse_id": warehouse_a_id,
            "status": InventoryStatus.AVAILABLE.value,
        },
        {
            "name": "Water Slide Mega",
            "category": "Inflatable",
            "base_price": Decimal("350.00"),
            "requires_power": True,
            "min_space_sqft": 400,  # 20x20
            "allowed_surfaces": "grass,artificial_turf",
            "default_warehouse_id": warehouse_a_id,
            "current_warehouse_id": warehouse_a_id,
            "status": InventoryStatus.AVAILABLE.value,
        },
        {
            "name": "Obstacle Course",
            "category": "Inflatable",
            "base_price": Decimal("400.00"),
            "requires_power": True,
            "min_space_sqft": 600,  # 30x20
            "allowed_surfaces": "grass,artificial_turf",
            "default_warehouse_id": warehouse_a_id,
            "current_warehouse_id": warehouse_a_id,
            "status": InventoryStatus.AVAILABLE.value,
        },
        {
            "name": "Cotton Candy Machine",
            "category": "Concession",
            "base_price": Decimal("75.00"),
            "requires_power": True,
            "min_space_sqft": 0,
            "allowed_surfaces": "grass,concrete,asphalt,artificial_turf,indoor",
            "default_warehouse_id": warehouse_a_id,
            "current_warehouse_id": warehouse_a_id,
            "status": InventoryStatus.AVAILABLE.value,
        },
        {
            "name": "Photo Booth Deluxe",
            "category": "Entertainment",
            "base_price": Decimal("200.00"),
            "requires_power": True,
            "min_space_sqft": 64,  # 8x8
            "allowed_surfaces": "grass,concrete,asphalt,artificial_turf,indoor",
            "default_warehouse_id": warehouse_b_id,
            "current_warehouse_id": warehouse_b_id,
            "status": InventoryStatus.AVAILABLE.value,
        },
        {
            "name": "Popcorn Machine",
            "category": "Concession",
            "base_price": Decimal("65.00"),
            "requires_power": True,
            "min_space_sqft": 0,
            "allowed_surfaces": "grass,concrete,asphalt,artificial_turf,indoor",
            "default_warehouse_id": warehouse_b_id,
            "current_warehouse_id": warehouse_b_id,
            "status": InventoryStatus.AVAILABLE.value,
        },
        {
            "name": "Mini Bounce House",
            "category": "Inflatable",
            "base_price": Decimal("150.00"),
            "requires_power": True,
            "min_space_sqft": 144,  # 12x12
            "allowed_surfaces": "grass,artificial_turf",
            "default_warehouse_id": warehouse_b_id,
            "current_warehouse_id": warehouse_b_id,
            "status": InventoryStatus.AVAILABLE.value,
        },
        {
            "name": "Tables & Chairs Set",
            "category": "Furniture",
            "base_price": Decimal("50.00"),
            "requires_power": False,
            "min_space_sqft": 0,
            "allowed_surfaces": "grass,concrete,asphalt,artificial_turf,indoor",
            "default_warehouse_id": warehouse_b_id,
            "current_warehouse_id": warehouse_b_id,
            "status": InventoryStatus.AVAILABLE.value,
        },
    ]

    for data in items_data:
        item = InventoryItem(**data)
        db.add(item)

    print(f"✅ Created {len(items_data)} inventory items")


def seed_inventory_photos(db: Session) -> None:
    """
    Seed sample photos for inventory items.

    ⚠️  IMPORTANT: These are TEMPORARY placeholder images for development/demo purposes.

    Current images are party-themed stock photos from Unsplash that DO NOT show
    actual party rental equipment. For production use, you must:

    1. Replace with professional photos of your actual inventory items
    2. Upload via the photo management API endpoints already implemented
    3. Ensure proper licensing/permissions for all images used

    Note: Supplier images (Magic Jump, etc.) require customer accounts and cannot
    be programmatically accessed. You'll need to either:
    - Take photos of your own equipment
    - Purchase/license images from suppliers you work with
    - Manually download from your supplier account and upload via API
    """
    # Get all inventory items
    items = db.query(InventoryItem).all()

    # ========================================================================
    # ⚠️  TEMPORARY PLACEHOLDER IMAGES - REPLACE WITH ACTUAL EQUIPMENT PHOTOS
    # ========================================================================
    # These are curated stock photos from Unsplash that relate to each category.
    # While better matched than before, they still don't show actual rental equipment.
    # Use these only for development/demo - replace before production!
    photo_data_map = {
        # High-quality Unsplash photos for party rental equipment
        # NOTE: These are curated stock photos - replace with actual equipment photos for production
        "Bounce House Castle": [
            {"url": "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&h=800&fit=crop&q=85", "order": 0, "thumbnail": True},
            {"url": "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1200&h=800&fit=crop&q=85", "order": 1, "thumbnail": False},
        ],
        "Water Slide Mega": [
            {"url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=800&fit=crop&q=85", "order": 0, "thumbnail": True},
            {"url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=800&fit=crop&q=85", "order": 1, "thumbnail": False},
        ],
        "Obstacle Course": [
            {"url": "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&h=800&fit=crop&q=85", "order": 0, "thumbnail": True},
            {"url": "https://images.unsplash.com/photo-1526566661780-1a67ea3c863e?w=1200&h=800&fit=crop&q=85", "order": 1, "thumbnail": False},
        ],
        "Mini Bounce House": [
            {"url": "https://images.unsplash.com/photo-1515041219749-89347f83291a?w=1200&h=800&fit=crop&q=85", "order": 0, "thumbnail": True},
            {"url": "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1200&h=800&fit=crop&q=85", "order": 1, "thumbnail": False},
        ],
        "Cotton Candy Machine": [
            {"url": "https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=1200&h=800&fit=crop&q=85", "order": 0, "thumbnail": True},
            {"url": "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=1200&h=800&fit=crop&q=85", "order": 1, "thumbnail": False},
        ],
        "Popcorn Machine": [
            {"url": "https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=1200&h=800&fit=crop&q=85", "order": 0, "thumbnail": True},
            {"url": "https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=1200&h=800&fit=crop&q=85", "order": 1, "thumbnail": False},
        ],
        "Photo Booth Deluxe": [
            {"url": "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&h=800&fit=crop&q=85", "order": 0, "thumbnail": True},
            {"url": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=800&fit=crop&q=85", "order": 1, "thumbnail": False},
        ],
        "Tables & Chairs Set": [
            {"url": "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&h=800&fit=crop&q=85", "order": 0, "thumbnail": True},
            {"url": "https://images.unsplash.com/photo-1478145787956-f6f12c59624d?w=1200&h=800&fit=crop&q=85", "order": 1, "thumbnail": False},
        ],
    }

    total_photos = 0
    for item in items:
        if item.name in photo_data_map:
            for photo_info in photo_data_map[item.name]:
                photo = InventoryPhoto(
                    inventory_item_id=item.inventory_item_id,
                    image_url=photo_info["url"],
                    display_order=photo_info["order"],
                    is_thumbnail=photo_info["thumbnail"]
                )
                db.add(photo)
                total_photos += 1

    print(f"✅ Created {total_photos} inventory photos")


def seed_customers(db: Session) -> dict[str, str]:
    """
    Seed customer data.

    Returns:
        Dict mapping customer names to their IDs
    """
    customers_data = [
        {
            "name": "Emily Martinez",
            "email": "emily.martinez@email.com",
            "phone": "(949) 555-0201",
            "address": "1234 Oak Street, Irvine, CA 92602",
            "address_lat": Decimal("33.6846"),
            "address_lng": Decimal("-117.8265"),
        },
        {
            "name": "David Thompson",
            "email": "david.thompson@email.com",
            "phone": "(949) 555-0202",
            "address": "5678 Maple Avenue, Newport Beach, CA 92660",
            "address_lat": Decimal("33.6189"),
            "address_lng": Decimal("-117.9298"),
        },
        {
            "name": "Jessica Williams",
            "email": "jessica.williams@email.com",
            "phone": "(714) 555-0203",
            "address": "9012 Pine Drive, Costa Mesa, CA 92626",
            "address_lat": Decimal("33.6595"),
            "address_lng": Decimal("-117.9195"),
        },
        {
            "name": "Michael Brown",
            "email": "michael.brown@email.com",
            "phone": "(714) 555-0204",
            "address": "3456 Cedar Lane, Huntington Beach, CA 92648",
            "address_lat": Decimal("33.6603"),
            "address_lng": Decimal("-117.9992"),
        },
        {
            "name": "Amanda Garcia",
            "email": "amanda.garcia@email.com",
            "phone": "(949) 555-0205",
            "address": "7890 Birch Court, Laguna Beach, CA 92651",
            "address_lat": Decimal("33.5427"),
            "address_lng": Decimal("-117.7854"),
        },
    ]

    customer_ids = {}
    for data in customers_data:
        customer = Customer(**data)
        db.add(customer)
        db.flush()
        customer_ids[data["name"]] = customer.customer_id

    print(f"✅ Created {len(customers_data)} customers")
    return customer_ids


def seed_bookings(
    db: Session,
    customer_ids: dict[str, str],
    driver_ids: dict[str, str],
    warehouse_ids: dict[str, str],
) -> None:
    """
    Seed booking data with realistic scenarios.

    Args:
        customer_ids: Dict mapping customer names to their IDs
        driver_ids: Dict mapping driver names to their IDs
        warehouse_ids: Dict mapping warehouse names to their IDs
    """
    # Get inventory items for bookings
    items = db.query(InventoryItem).all()
    bounce_house = next((i for i in items if "Bounce House Castle" in i.name), None)
    water_slide = next((i for i in items if "Water Slide" in i.name), None)
    cotton_candy = next((i for i in items if "Cotton Candy" in i.name), None)
    popcorn = next((i for i in items if "Popcorn" in i.name), None)
    photo_booth = next((i for i in items if "Photo Booth" in i.name), None)
    tables = next((i for i in items if "Tables" in i.name), None)

    today = date.today()

    # Helper function to calculate booking totals
    def calculate_booking_totals(items_list, delivery_fee, tip):
        subtotal = sum(item["inventory_item"].base_price * item["quantity"] for item in items_list)
        total = subtotal + delivery_fee + tip
        return {
            "subtotal": subtotal,
            "delivery_fee": delivery_fee,
            "tip": tip,
            "total": total
        }

    bookings_data = [
        # Booking 1: Past completed booking
        {
            "customer_id": customer_ids["Emily Martinez"],
            "delivery_date": today - timedelta(days=7),
            "pickup_date": today - timedelta(days=5),
            "delivery_address": "1234 Oak Street, Irvine, CA 92602",
            "delivery_lat": Decimal("33.6846"),
            "delivery_lng": Decimal("-117.8265"),
            "setup_instructions": "Setup in backyard. Access through side gate.",
            "status": BookingStatus.COMPLETED.value,
            "assigned_driver_id": driver_ids["Mike Johnson"],
            "pickup_driver_id": driver_ids["Mike Johnson"],
            "payment_status": PaymentStatus.PAID.value,
            "delivery_fee": Decimal("75.00"),
            "tip": Decimal("25.00"),
            "items": [
                {"inventory_item": bounce_house, "quantity": 1},
                {"inventory_item": cotton_candy, "quantity": 1},
            ],
        },
        # Booking 2: Upcoming delivery tomorrow
        {
            "customer_id": customer_ids["David Thompson"],
            "delivery_date": today + timedelta(days=1),
            "pickup_date": today + timedelta(days=3),
            "delivery_time_window": "10:00 AM - 12:00 PM",
            "pickup_time_window": "2:00 PM - 4:00 PM",
            "delivery_address": "5678 Maple Avenue, Newport Beach, CA 92660",
            "delivery_lat": Decimal("33.6189"),
            "delivery_lng": Decimal("-117.9298"),
            "setup_instructions": "Front lawn setup. Park in driveway.",
            "status": BookingStatus.CONFIRMED.value,
            "assigned_driver_id": driver_ids["Sarah Chen"],
            "payment_status": PaymentStatus.PAID.value,
            "delivery_fee": Decimal("85.00"),
            "tip": Decimal("50.00"),
            "items": [
                {"inventory_item": water_slide, "quantity": 1},
                {"inventory_item": photo_booth, "quantity": 1},
                {"inventory_item": popcorn, "quantity": 1},
            ],
        },
        # Booking 3: Active rental (delivered, not picked up yet)
        {
            "customer_id": customer_ids["Jessica Williams"],
            "delivery_date": today - timedelta(days=1),
            "pickup_date": today + timedelta(days=1),
            "delivery_address": "9012 Pine Drive, Costa Mesa, CA 92626",
            "delivery_lat": Decimal("33.6595"),
            "delivery_lng": Decimal("-117.9195"),
            "setup_instructions": "Backyard party. Please call when arriving.",
            "status": BookingStatus.ACTIVE.value,
            "assigned_driver_id": driver_ids["James Rodriguez"],
            "pickup_driver_id": driver_ids["James Rodriguez"],
            "payment_status": PaymentStatus.PAID.value,
            "delivery_fee": Decimal("50.00"),
            "tip": Decimal("30.00"),
            "items": [
                {"inventory_item": bounce_house, "quantity": 1},
                {"inventory_item": cotton_candy, "quantity": 1},
                {"inventory_item": tables, "quantity": 1},
            ],
        },
        # Booking 4: Future booking next weekend
        {
            "customer_id": customer_ids["Michael Brown"],
            "delivery_date": today + timedelta(days=5),
            "pickup_date": today + timedelta(days=7),
            "delivery_time_window": "9:00 AM - 11:00 AM",
            "pickup_time_window": "3:00 PM - 5:00 PM",
            "delivery_address": "3456 Cedar Lane, Huntington Beach, CA 92648",
            "delivery_lat": Decimal("33.6603"),
            "delivery_lng": Decimal("-117.9992"),
            "setup_instructions": "Birthday party setup in garage.",
            "status": BookingStatus.CONFIRMED.value,
            "assigned_driver_id": driver_ids["Mike Johnson"],
            "payment_status": PaymentStatus.PAID.value,
            "delivery_fee": Decimal("60.00"),
            "tip": Decimal("35.00"),
            "items": [
                {"inventory_item": water_slide, "quantity": 1},
                {"inventory_item": tables, "quantity": 2},
                {"inventory_item": popcorn, "quantity": 1},
            ],
        },
        # Booking 5: Pending booking (not confirmed yet)
        {
            "customer_id": customer_ids["Amanda Garcia"],
            "delivery_date": today + timedelta(days=10),
            "pickup_date": today + timedelta(days=12),
            "delivery_address": "7890 Birch Court, Laguna Beach, CA 92651",
            "delivery_lat": Decimal("33.5427"),
            "delivery_lng": Decimal("-117.7854"),
            "setup_instructions": "Beach house party. Large backyard.",
            "status": BookingStatus.PENDING.value,
            "payment_status": PaymentStatus.PENDING.value,
            "delivery_fee": Decimal("95.00"),
            "tip": Decimal("40.00"),
            "items": [
                {"inventory_item": water_slide, "quantity": 1},
                {"inventory_item": bounce_house, "quantity": 1},
                {"inventory_item": cotton_candy, "quantity": 1},
                {"inventory_item": photo_booth, "quantity": 1},
            ],
        },
        # Booking 6: Out for delivery today
        {
            "customer_id": customer_ids["Emily Martinez"],
            "delivery_date": today,
            "pickup_date": today + timedelta(days=2),
            "delivery_time_window": "1:00 PM - 3:00 PM",
            "pickup_time_window": "4:00 PM - 6:00 PM",
            "delivery_address": "4321 Sunset Drive, Newport Beach, CA 92663",
            "delivery_lat": Decimal("33.6212"),
            "delivery_lng": Decimal("-117.9289"),
            "setup_instructions": "Pool party setup. Access through back gate.",
            "status": BookingStatus.OUT_FOR_DELIVERY.value,
            "assigned_driver_id": driver_ids["Sarah Chen"],
            "payment_status": PaymentStatus.PAID.value,
            "delivery_fee": Decimal("70.00"),
            "tip": Decimal("45.00"),
            "items": [
                {"inventory_item": water_slide, "quantity": 1},
                {"inventory_item": cotton_candy, "quantity": 1},
                {"inventory_item": tables, "quantity": 2},
            ],
        },
        # Booking 7: Completed last month
        {
            "customer_id": customer_ids["Amanda Garcia"],
            "delivery_date": today - timedelta(days=30),
            "pickup_date": today - timedelta(days=28),
            "delivery_address": "8765 Ocean View, Laguna Beach, CA 92651",
            "delivery_lat": Decimal("33.5437"),
            "delivery_lng": Decimal("-117.7834"),
            "setup_instructions": "Graduation party. Front yard.",
            "status": BookingStatus.COMPLETED.value,
            "assigned_driver_id": driver_ids["Mike Johnson"],
            "pickup_driver_id": driver_ids["Sarah Chen"],
            "payment_status": PaymentStatus.PAID.value,
            "delivery_fee": Decimal("80.00"),
            "tip": Decimal("55.00"),
            "items": [
                {"inventory_item": photo_booth, "quantity": 1},
                {"inventory_item": tables, "quantity": 3},
                {"inventory_item": popcorn, "quantity": 1},
            ],
        },
        # Booking 8: Tomorrow's delivery
        {
            "customer_id": customer_ids["Emily Martinez"],
            "delivery_date": today + timedelta(days=1),
            "pickup_date": today + timedelta(days=3),
            "delivery_time_window": "8:00 AM - 10:00 AM",
            "pickup_time_window": "5:00 PM - 7:00 PM",
            "delivery_address": "2468 Park Avenue, Santa Ana, CA 92701",
            "delivery_lat": Decimal("33.7455"),
            "delivery_lng": Decimal("-117.8677"),
            "setup_instructions": "Corporate event. Setup in parking lot.",
            "status": BookingStatus.CONFIRMED.value,
            "assigned_driver_id": driver_ids["James Rodriguez"],
            "payment_status": PaymentStatus.PAID.value,
            "delivery_fee": Decimal("65.00"),
            "tip": Decimal("20.00"),
            "items": [
                {"inventory_item": obstacle_course, "quantity": 1},
                {"inventory_item": popcorn, "quantity": 2},
                {"inventory_item": cotton_candy, "quantity": 1},
            ],
        },
        # Booking 9: Active rental (ends tomorrow)
        {
            "customer_id": customer_ids["Michael Brown"],
            "delivery_date": today - timedelta(days=2),
            "pickup_date": today + timedelta(days=1),
            "delivery_address": "1357 Valley Road, Irvine, CA 92603",
            "delivery_lat": Decimal("33.6839"),
            "delivery_lng": Decimal("-117.8267"),
            "setup_instructions": "Birthday party. Backyard setup near pool.",
            "status": BookingStatus.ACTIVE.value,
            "assigned_driver_id": driver_ids["Mike Johnson"],
            "pickup_driver_id": driver_ids["Mike Johnson"],
            "payment_status": PaymentStatus.PAID.value,
            "delivery_fee": Decimal("55.00"),
            "tip": Decimal("30.00"),
            "items": [
                {"inventory_item": mini_bounce, "quantity": 1},
                {"inventory_item": tables, "quantity": 2},
            ],
        },
        # Booking 10: Future booking in 2 weeks
        {
            "customer_id": customer_ids["David Thompson"],
            "delivery_date": today + timedelta(days=14),
            "pickup_date": today + timedelta(days=16),
            "delivery_time_window": "11:00 AM - 1:00 PM",
            "pickup_time_window": "2:00 PM - 4:00 PM",
            "delivery_address": "9876 Beach Boulevard, Huntington Beach, CA 92646",
            "delivery_lat": Decimal("33.6594"),
            "delivery_lng": Decimal("-118.0008"),
            "setup_instructions": "Wedding reception. Setup in garden area.",
            "status": BookingStatus.CONFIRMED.value,
            "assigned_driver_id": driver_ids["Sarah Chen"],
            "payment_status": PaymentStatus.PAID.value,
            "delivery_fee": Decimal("100.00"),
            "tip": Decimal("75.00"),
            "items": [
                {"inventory_item": photo_booth, "quantity": 1},
                {"inventory_item": tables, "quantity": 4},
            ],
        },
        # Booking 11: Completed 2 weeks ago
        {
            "customer_id": customer_ids["Jessica Williams"],
            "delivery_date": today - timedelta(days=14),
            "pickup_date": today - timedelta(days=12),
            "delivery_address": "5432 Spring Street, Costa Mesa, CA 92627",
            "delivery_lat": Decimal("33.6611"),
            "delivery_lng": Decimal("-117.9167"),
            "setup_instructions": "School fundraiser. Setup in gymnasium.",
            "status": BookingStatus.COMPLETED.value,
            "assigned_driver_id": driver_ids["James Rodriguez"],
            "pickup_driver_id": driver_ids["James Rodriguez"],
            "payment_status": PaymentStatus.PAID.value,
            "delivery_fee": Decimal("90.00"),
            "tip": Decimal("60.00"),
            "items": [
                {"inventory_item": obstacle_course, "quantity": 1},
                {"inventory_item": cotton_candy, "quantity": 2},
                {"inventory_item": popcorn, "quantity": 2},
            ],
        },
        # Booking 12: This weekend
        {
            "customer_id": customer_ids["Amanda Garcia"],
            "delivery_date": today + timedelta(days=3),
            "pickup_date": today + timedelta(days=5),
            "delivery_time_window": "9:00 AM - 11:00 AM",
            "pickup_time_window": "6:00 PM - 8:00 PM",
            "delivery_address": "6789 Highland Avenue, Newport Beach, CA 92660",
            "delivery_lat": Decimal("33.6178"),
            "delivery_lng": Decimal("-117.9312"),
            "setup_instructions": "Kids birthday party. Driveway setup.",
            "status": BookingStatus.CONFIRMED.value,
            "assigned_driver_id": driver_ids["Sarah Chen"],
            "payment_status": PaymentStatus.PAID.value,
            "delivery_fee": Decimal("75.00"),
            "tip": Decimal("40.00"),
            "items": [
                {"inventory_item": bounce_house, "quantity": 1},
                {"inventory_item": mini_bounce, "quantity": 1},
                {"inventory_item": cotton_candy, "quantity": 1},
            ],
        },
        # Booking 13: Next week Monday
        {
            "customer_id": customer_ids["Emily Martinez"],
            "delivery_date": today + timedelta(days=7),
            "pickup_date": today + timedelta(days=9),
            "delivery_time_window": "10:00 AM - 12:00 PM",
            "pickup_time_window": "3:00 PM - 5:00 PM",
            "delivery_address": "3210 Fairview Road, Santa Ana, CA 92704",
            "delivery_lat": Decimal("33.7478"),
            "delivery_lng": Decimal("-117.8889"),
            "setup_instructions": "Church event. Setup in fellowship hall.",
            "status": BookingStatus.CONFIRMED.value,
            "assigned_driver_id": driver_ids["Mike Johnson"],
            "payment_status": PaymentStatus.PAID.value,
            "delivery_fee": Decimal("85.00"),
            "tip": Decimal("50.00"),
            "items": [
                {"inventory_item": water_slide, "quantity": 1},
                {"inventory_item": photo_booth, "quantity": 1},
                {"inventory_item": tables, "quantity": 3},
            ],
        },
        # Booking 14: Yesterday's pickup
        {
            "customer_id": customer_ids["Amanda Garcia"],
            "delivery_date": today - timedelta(days=3),
            "pickup_date": today - timedelta(days=1),
            "delivery_address": "7531 Marina Drive, Newport Beach, CA 92662",
            "delivery_lat": Decimal("33.6234"),
            "delivery_lng": Decimal("-117.9321"),
            "setup_instructions": "Boat dock party. Setup on dock area.",
            "status": BookingStatus.COMPLETED.value,
            "assigned_driver_id": driver_ids["Sarah Chen"],
            "pickup_driver_id": driver_ids["Sarah Chen"],
            "payment_status": PaymentStatus.PAID.value,
            "delivery_fee": Decimal("95.00"),
            "tip": Decimal("65.00"),
            "items": [
                {"inventory_item": tables, "quantity": 2},
                {"inventory_item": photo_booth, "quantity": 1},
            ],
        },
        # Booking 15: Unassigned - needs driver
        {
            "customer_id": customer_ids["Emily Martinez"],
            "delivery_date": today + timedelta(days=2),
            "pickup_date": today + timedelta(days=4),
            "delivery_time_window": "12:00 PM - 2:00 PM",
            "pickup_time_window": "5:00 PM - 7:00 PM",
            "delivery_address": "9999 Pacific Coast Highway, Laguna Beach, CA 92651",
            "delivery_lat": Decimal("33.5445"),
            "delivery_lng": Decimal("-117.7821"),
            "setup_instructions": "Beachfront property. Limited parking.",
            "status": BookingStatus.CONFIRMED.value,
            "payment_status": PaymentStatus.PAID.value,
            "delivery_fee": Decimal("110.00"),
            "tip": Decimal("70.00"),
            "items": [
                {"inventory_item": obstacle_course, "quantity": 1},
                {"inventory_item": water_slide, "quantity": 1},
                {"inventory_item": cotton_candy, "quantity": 1},
                {"inventory_item": popcorn, "quantity": 1},
            ],
        },
    ]

    for booking_data in bookings_data:
        # Extract items data
        items_data = booking_data.pop("items")

        # Calculate totals from inventory prices
        totals = calculate_booking_totals(items_data, booking_data["delivery_fee"], booking_data["tip"])
        booking_data.update(totals)

        # Create booking
        booking = Booking(**booking_data)
        db.add(booking)
        db.flush()  # Get booking ID

        # Create booking items with prices from inventory
        for item_data in items_data:
            inventory_item = item_data["inventory_item"]
            booking_item = BookingItem(
                booking_id=booking.booking_id,
                inventory_item_id=inventory_item.inventory_item_id,
                quantity=item_data["quantity"],
                price=inventory_item.base_price,  # Use actual inventory item price
                pickup_warehouse_id=inventory_item.current_warehouse_id,
                return_warehouse_id=inventory_item.default_warehouse_id,
            )
            db.add(booking_item)

        # Update customer stats
        customer = db.query(Customer).filter(
            Customer.customer_id == booking_data["customer_id"]
        ).first()
        if customer:
            customer.total_bookings += 1
            customer.total_spent += booking_data["total"]

    print(f"✅ Created {len(bookings_data)} bookings with items")


def seed_database() -> None:
    """
    Main function to seed the database with all sample data.

    Creates:
    - 2 warehouses
    - 3 drivers
    - 8 inventory items
    - 5 customers
    - 5 bookings with various statuses (completed, active, upcoming, pending)
    """
    # Create tables first
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created/verified")

    db = SessionLocal()
    try:
        print("🌱 Starting database seeding...")

        # Check what data already exists
        existing_warehouses = db.query(Warehouse).count()
        existing_drivers = db.query(Driver).count()
        existing_items = db.query(InventoryItem).count()
        existing_customers = db.query(Customer).count()
        existing_bookings = db.query(Booking).count()

        # Seed warehouses, drivers, and inventory if needed
        if existing_warehouses == 0:
            warehouse_ids = seed_warehouses(db)
            driver_ids = seed_drivers(db)
            seed_inventory_items(db, warehouse_ids)
            seed_inventory_photos(db)
        else:
            # Get existing IDs
            warehouses = db.query(Warehouse).all()
            warehouse_ids = {w.name: w.warehouse_id for w in warehouses}

            drivers = db.query(Driver).all()
            driver_ids = {d.name: d.driver_id for d in drivers}

            print(f"ℹ️  Using existing {existing_warehouses} warehouses, {existing_drivers} drivers, {existing_items} items")

            # Seed photos if they don't exist
            existing_photos = db.query(InventoryPhoto).count()
            if existing_photos == 0:
                seed_inventory_photos(db)

        # Always seed customers and bookings if they don't exist
        if existing_customers == 0:
            customer_ids = seed_customers(db)
        else:
            print(f"⚠️  Database already has {existing_customers} customers. Skipping customer seeding.")
            customers = db.query(Customer).all()
            customer_ids = {c.name: c.customer_id for c in customers}

        if existing_bookings == 0:
            seed_bookings(db, customer_ids, driver_ids, warehouse_ids)
        else:
            print(f"⚠️  Database already has {existing_bookings} bookings. Skipping booking seeding.")

        # Commit all changes
        db.commit()
        print("🎉 Database seeding completed successfully!")
        print("\n📋 Summary:")
        print(f"   • {db.query(Warehouse).count()} warehouses")
        print(f"   • {db.query(Driver).count()} drivers")
        print(f"   • {db.query(InventoryItem).count()} inventory items")
        print(f"   • {db.query(InventoryPhoto).count()} inventory photos")
        print(f"   • {db.query(Customer).count()} customers")
        print(f"   • {db.query(Booking).count()} bookings")
        print(f"   • {db.query(BookingItem).count()} booking items")

    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
