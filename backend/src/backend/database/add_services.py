"""
Add new service inventory items to existing database (non-destructive).

This script adds 5 new service items if they don't already exist:
- WiFi Rental
- Face Painting Service
- Ice Cream Truck
- Taco Truck
- Tent Sleep Over Party
"""

import sys
from pathlib import Path
from decimal import Decimal
from uuid import uuid4

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy.orm import Session
from backend.database.connection import engine
from backend.database.models import InventoryItem, InventoryPhoto, Warehouse
from backend.database.models import InventoryStatus


def add_service_items():
    """Add new service items if they don't already exist."""
    with Session(engine) as session:
        # Get warehouses
        warehouses = session.query(Warehouse).all()
        if not warehouses:
            print("No warehouses found. Please seed warehouses first.")
            return

        warehouse_a = warehouses[0]
        warehouse_b = warehouses[1] if len(warehouses) > 1 else warehouse_a

        # Define service items with their photos
        service_items = [
            {
                "name": "WiFi Rental",
                "category": "Services",
                "base_price": Decimal("100.00"),
                "requires_power": True,
                "min_space_sqft": 0,
                "allowed_surfaces": "grass,concrete,asphalt,artificial_turf,indoor",
                "default_warehouse_id": warehouse_a.warehouse_id,
                "current_warehouse_id": warehouse_a.warehouse_id,
                "status": InventoryStatus.AVAILABLE.value,
                "description": "Professional-grade mobile WiFi hotspot rental. Perfect for outdoor events, parties, and gatherings. Provides reliable high-speed internet for up to 50 devices.",
                "photos": [
                    {"url": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&h=800&fit=crop&q=85", "order": 0, "thumbnail": True},
                    {"url": "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=1200&h=800&fit=crop&q=85", "order": 1, "thumbnail": False},
                ]
            },
            {
                "name": "Face Painting Service",
                "category": "Services",
                "base_price": Decimal("150.00"),
                "requires_power": False,
                "min_space_sqft": 25,
                "allowed_surfaces": "grass,concrete,asphalt,artificial_turf,indoor",
                "default_warehouse_id": warehouse_a.warehouse_id,
                "current_warehouse_id": warehouse_a.warehouse_id,
                "status": InventoryStatus.AVAILABLE.value,
                "description": "Professional face painting artist for your event. Includes all supplies and can paint 15-20 faces per hour with fun designs for kids and adults.",
                "photos": [
                    {"url": "https://images.unsplash.com/photo-1522075782449-e45a34f1ddfb?w=1200&h=800&fit=crop&q=85", "order": 0, "thumbnail": True},
                    {"url": "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1200&h=800&fit=crop&q=85", "order": 1, "thumbnail": False},
                ]
            },
            {
                "name": "Ice Cream Truck",
                "category": "Services",
                "base_price": Decimal("400.00"),
                "requires_power": False,
                "min_space_sqft": 200,
                "allowed_surfaces": "concrete,asphalt",
                "default_warehouse_id": warehouse_b.warehouse_id,
                "current_warehouse_id": warehouse_b.warehouse_id,
                "status": InventoryStatus.AVAILABLE.value,
                "description": "Fully stocked ice cream truck rental for 2 hours. Includes variety of ice cream treats, music, and friendly service. Perfect for birthday parties and community events.",
                "photos": [
                    {"url": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=1200&h=800&fit=crop&q=85", "order": 0, "thumbnail": True},
                    {"url": "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=1200&h=800&fit=crop&q=85", "order": 1, "thumbnail": False},
                ]
            },
            {
                "name": "Taco Truck",
                "category": "Services",
                "base_price": Decimal("600.00"),
                "requires_power": False,
                "min_space_sqft": 300,
                "allowed_surfaces": "concrete,asphalt",
                "default_warehouse_id": warehouse_b.warehouse_id,
                "current_warehouse_id": warehouse_b.warehouse_id,
                "status": InventoryStatus.AVAILABLE.value,
                "description": "Authentic taco truck catering service. Includes professional chef, all ingredients, and service for up to 50 guests. Choice of meat, vegetarian, and vegan options.",
                "photos": [
                    {"url": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200&h=800&fit=crop&q=85", "order": 0, "thumbnail": True},
                    {"url": "https://images.unsplash.com/photo-1613514785940-daed07799d9b?w=1200&h=800&fit=crop&q=85", "order": 1, "thumbnail": False},
                ]
            },
            {
                "name": "Tent Sleep Over Party",
                "category": "Services",
                "base_price": Decimal("350.00"),
                "requires_power": False,
                "min_space_sqft": 400,
                "allowed_surfaces": "grass,indoor",
                "default_warehouse_id": warehouse_a.warehouse_id,
                "current_warehouse_id": warehouse_a.warehouse_id,
                "status": InventoryStatus.AVAILABLE.value,
                "description": "Adorable teepee tent setup for the ultimate camping-themed sleepover party. Includes 4-6 decorated teepees with cozy bedding, fairy lights, and themed decorations. Perfect for kids' slumber parties and indoor camping experiences.",
                "photos": [
                    {"url": "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=1200&h=800&fit=crop&q=85", "order": 0, "thumbnail": True},
                    {"url": "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200&h=800&fit=crop&q=85", "order": 1, "thumbnail": False},
                ]
            },
        ]

        added_count = 0
        skipped_count = 0

        for item_data in service_items:
            # Check if item already exists
            existing = session.query(InventoryItem).filter(
                InventoryItem.name == item_data["name"]
            ).first()

            if existing:
                print(f"⏭️  Skipped '{item_data['name']}' - already exists")
                skipped_count += 1
                continue

            # Extract photos from item data
            photos_data = item_data.pop("photos")

            # Create inventory item
            item = InventoryItem(
                inventory_item_id=str(uuid4()),
                **item_data
            )
            session.add(item)
            session.flush()  # Get the inventory_item_id

            # Add photos
            for photo_data in photos_data:
                photo = InventoryPhoto(
                    photo_id=str(uuid4()),
                    inventory_item_id=item.inventory_item_id,
                    **photo_data
                )
                session.add(photo)

            print(f"✅ Added '{item_data['name']}' with {len(photos_data)} photos")
            added_count += 1

        session.commit()

        print(f"\n{'='*60}")
        print(f"Summary:")
        print(f"  ✅ Added: {added_count} items")
        print(f"  ⏭️  Skipped: {skipped_count} items (already exist)")
        print(f"{'='*60}\n")

        # Show total inventory count
        total_items = session.query(InventoryItem).count()
        service_items_count = session.query(InventoryItem).filter(
            InventoryItem.category == "Services"
        ).count()

        print(f"📊 Database now contains:")
        print(f"   Total inventory items: {total_items}")
        print(f"   Service items: {service_items_count}")


if __name__ == "__main__":
    print("Adding new service items to database...\n")
    add_service_items()
