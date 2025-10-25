"""
Unit tests for Pydantic schemas.

Tests schema validation, serialization, and field validators.
"""

import pytest
from decimal import Decimal
from datetime import date

from backend.database.schemas import (
    InventoryItem,
    InventoryItemCreate,
    BookingCreate,
    BookingItemCreate,
)


class TestInventoryItemSchema:
    """Tests for InventoryItem schema validation."""

    def test_allowed_surfaces_string_to_list_conversion(self):
        """Test that allowed_surfaces converts from comma-separated string to list."""
        # Simulate data from database with comma-separated string
        data = {
            "inventory_item_id": "test-123",
            "name": "Test Item",
            "category": "Test",
            "description": None,
            "image_url": None,
            "base_price": Decimal("100.00"),
            "default_warehouse_id": "warehouse-123",
            "current_warehouse_id": "warehouse-123",
            "status": "available",
            "created_at": "2025-10-24T12:00:00",
            "allowed_surfaces": "grass,artificial_turf,concrete",  # String input
            "website_visible": True,
            "requires_power": False,
        }

        item = InventoryItem(**data)

        # Should be converted to list
        assert isinstance(item.allowed_surfaces, list)
        assert item.allowed_surfaces == ["grass", "artificial_turf", "concrete"]

    def test_allowed_surfaces_already_list(self):
        """Test that allowed_surfaces works when already a list."""
        data = {
            "inventory_item_id": "test-123",
            "name": "Test Item",
            "category": "Test",
            "description": None,
            "image_url": None,
            "base_price": Decimal("100.00"),
            "default_warehouse_id": "warehouse-123",
            "current_warehouse_id": "warehouse-123",
            "status": "available",
            "created_at": "2025-10-24T12:00:00",
            "allowed_surfaces": ["grass", "concrete"],  # Already a list
            "website_visible": True,
            "requires_power": False,
        }

        item = InventoryItem(**data)

        assert isinstance(item.allowed_surfaces, list)
        assert item.allowed_surfaces == ["grass", "concrete"]

    def test_allowed_surfaces_none(self):
        """Test that allowed_surfaces handles None value."""
        data = {
            "inventory_item_id": "test-123",
            "name": "Test Item",
            "category": "Test",
            "description": None,
            "image_url": None,
            "base_price": Decimal("100.00"),
            "default_warehouse_id": "warehouse-123",
            "current_warehouse_id": "warehouse-123",
            "status": "available",
            "created_at": "2025-10-24T12:00:00",
            "allowed_surfaces": None,
            "website_visible": True,
            "requires_power": False,
        }

        item = InventoryItem(**data)

        assert item.allowed_surfaces is None

    def test_allowed_surfaces_empty_string(self):
        """Test that allowed_surfaces handles empty string."""
        data = {
            "inventory_item_id": "test-123",
            "name": "Test Item",
            "category": "Test",
            "description": None,
            "image_url": None,
            "base_price": Decimal("100.00"),
            "default_warehouse_id": "warehouse-123",
            "current_warehouse_id": "warehouse-123",
            "status": "available",
            "created_at": "2025-10-24T12:00:00",
            "allowed_surfaces": "",  # Empty string
            "website_visible": True,
            "requires_power": False,
        }

        item = InventoryItem(**data)

        # Empty string should convert to empty list
        assert item.allowed_surfaces == []

    def test_allowed_surfaces_with_whitespace(self):
        """Test that allowed_surfaces trims whitespace."""
        data = {
            "inventory_item_id": "test-123",
            "name": "Test Item",
            "category": "Test",
            "description": None,
            "image_url": None,
            "base_price": Decimal("100.00"),
            "default_warehouse_id": "warehouse-123",
            "current_warehouse_id": "warehouse-123",
            "status": "available",
            "created_at": "2025-10-24T12:00:00",
            "allowed_surfaces": " grass , concrete , artificial_turf ",
            "website_visible": True,
            "requires_power": False,
        }

        item = InventoryItem(**data)

        # Should trim whitespace
        assert item.allowed_surfaces == ["grass", "concrete", "artificial_turf"]


class TestBookingSchema:
    """Tests for Booking schema validation."""

    def test_pickup_date_after_delivery_date_valid(self):
        """Test that valid pickup date (after delivery) passes validation."""
        data = {
            "customer_id": "cust-123",
            "delivery_date": date(2025, 10, 20),
            "pickup_date": date(2025, 10, 22),  # After delivery
            "delivery_address": "123 Main St",
            "subtotal": Decimal("100.00"),
            "delivery_fee": Decimal("25.00"),
            "total": Decimal("125.00"),
            "items": [
                {
                    "inventory_item_id": "item-123",
                    "quantity": 1,
                    "price": Decimal("100.00"),
                }
            ],
        }

        booking = BookingCreate(**data)

        assert booking.delivery_date < booking.pickup_date

    def test_pickup_date_before_delivery_date_invalid(self):
        """Test that pickup date before delivery date raises ValidationError."""
        data = {
            "customer_id": "cust-123",
            "delivery_date": date(2025, 10, 22),
            "pickup_date": date(2025, 10, 20),  # Before delivery - invalid!
            "delivery_address": "123 Main St",
            "subtotal": Decimal("100.00"),
            "delivery_fee": Decimal("25.00"),
            "total": Decimal("125.00"),
            "items": [
                {
                    "inventory_item_id": "item-123",
                    "quantity": 1,
                    "price": Decimal("100.00"),
                }
            ],
        }

        with pytest.raises(ValueError, match="Pickup date must be on or after delivery date"):
            BookingCreate(**data)

    def test_same_day_pickup_and_delivery_valid(self):
        """Test that same-day pickup and delivery is allowed."""
        data = {
            "customer_id": "cust-123",
            "delivery_date": date(2025, 10, 20),
            "pickup_date": date(2025, 10, 20),  # Same day
            "delivery_address": "123 Main St",
            "subtotal": Decimal("100.00"),
            "delivery_fee": Decimal("25.00"),
            "total": Decimal("125.00"),
            "items": [
                {
                    "inventory_item_id": "item-123",
                    "quantity": 1,
                    "price": Decimal("100.00"),
                }
            ],
        }

        booking = BookingCreate(**data)

        assert booking.delivery_date == booking.pickup_date
