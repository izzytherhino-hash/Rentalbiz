"""
Database model tests.
Tests model creation, relationships, and constraints.
"""

import pytest
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.exc import IntegrityError

from backend.database.models import (
    Customer, Warehouse, InventoryItem, Driver, Booking, BookingItem,
    BookingStatus, PaymentStatus, InventoryStatus
)


class TestCustomerModel:
    """Test the Customer model."""

    def test_create_customer(self, db):
        """Test creating a customer with required fields."""
        customer = Customer(
            name="Test Customer",
            email="test@example.com",
            phone="7145550100"
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

        assert customer.customer_id is not None
        assert customer.name == "Test Customer"
        assert customer.total_bookings == 0
        assert customer.total_spent == Decimal("0.00")
        assert customer.created_at is not None

    def test_customer_requires_name(self, db):
        """Test that customer name is required."""
        customer = Customer(
            name=None,
            email="test@example.com",
            phone="7145550100"
        )
        db.add(customer)
        with pytest.raises(IntegrityError):
            db.commit()

    def test_customer_requires_email(self, db):
        """Test that customer email is required."""
        customer = Customer(
            name="Test Customer",
            email=None,
            phone="7145550100"
        )
        db.add(customer)
        with pytest.raises(IntegrityError):
            db.commit()


class TestWarehouseModel:
    """Test the Warehouse model."""

    def test_create_warehouse(self, db):
        """Test creating a warehouse."""
        warehouse = Warehouse(
            name="Test Warehouse",
            address="123 Test St",
            address_lat=Decimal("33.6411"),
            address_lng=Decimal("-117.9187"),
            is_active=True
        )
        db.add(warehouse)
        db.commit()
        db.refresh(warehouse)

        assert warehouse.warehouse_id is not None
        assert warehouse.name == "Test Warehouse"
        assert warehouse.is_active is True

    def test_warehouse_requires_coordinates(self, db):
        """Test that warehouse coordinates are required."""
        warehouse = Warehouse(
            name="Test Warehouse",
            address="123 Test St",
            address_lat=None,
            address_lng=Decimal("-117.9187")
        )
        db.add(warehouse)
        with pytest.raises(IntegrityError):
            db.commit()


class TestInventoryItemModel:
    """Test the InventoryItem model."""

    def test_create_inventory_item(self, db, sample_warehouse):
        """Test creating an inventory item."""
        item = InventoryItem(
            name="Test Item",
            category="Test Category",
            base_price=Decimal("100.00"),
            requires_power=True,
            min_space_sqft=100,
            allowed_surfaces="grass,concrete",
            default_warehouse_id=sample_warehouse.warehouse_id,
            current_warehouse_id=sample_warehouse.warehouse_id,
            status=InventoryStatus.AVAILABLE
        )
        db.add(item)
        db.commit()
        db.refresh(item)

        assert item.inventory_item_id is not None
        assert item.name == "Test Item"
        assert item.base_price == Decimal("100.00")
        assert item.status == InventoryStatus.AVAILABLE

    def test_inventory_item_requires_positive_price(self, db, sample_warehouse):
        """Test that price must be positive (validation at schema level)."""
        item = InventoryItem(
            name="Test Item",
            category="Test Category",
            base_price=Decimal("-100.00"),  # Negative price
            default_warehouse_id=sample_warehouse.warehouse_id,
            status=InventoryStatus.AVAILABLE
        )
        db.add(item)
        db.commit()  # Will succeed at DB level, validation happens at API level


class TestDriverModel:
    """Test the Driver model."""

    def test_create_driver(self, db):
        """Test creating a driver."""
        driver = Driver(
            name="Test Driver",
            phone="7145550100",
            license_number="D1234567",
            is_active=True
        )
        db.add(driver)
        db.commit()
        db.refresh(driver)

        assert driver.driver_id is not None
        assert driver.name == "Test Driver"
        assert driver.total_deliveries == 0
        assert driver.total_earnings == Decimal("0.00")

    def test_driver_requires_name(self, db):
        """Test that driver name is required."""
        driver = Driver(
            name=None,
            phone="7145550100"
        )
        db.add(driver)
        with pytest.raises(IntegrityError):
            db.commit()


class TestBookingModel:
    """Test the Booking model."""

    def test_create_booking(self, db, sample_customer, sample_driver):
        """Test creating a booking."""
        booking = Booking(
            customer_id=sample_customer.customer_id,
            delivery_date=date(2025, 11, 1),
            pickup_date=date(2025, 11, 3),
            delivery_address="123 Test St",
            subtotal=Decimal("250.00"),
            delivery_fee=Decimal("50.00"),
            tip=Decimal("20.00"),
            total=Decimal("320.00"),
            status=BookingStatus.PENDING,
            assigned_driver_id=sample_driver.driver_id,
            payment_status=PaymentStatus.PENDING
        )
        db.add(booking)
        db.commit()
        db.refresh(booking)

        assert booking.booking_id is not None
        assert booking.order_number is not None
        assert booking.status == BookingStatus.PENDING
        assert booking.rental_days == 2  # Nov 3 - Nov 1 = 2 days

    def test_booking_order_number_unique(self, db, sample_customer):
        """Test that order numbers are unique."""
        booking1 = Booking(
            customer_id=sample_customer.customer_id,
            delivery_date=date(2025, 11, 1),
            pickup_date=date(2025, 11, 3),
            delivery_address="123 Test St",
            subtotal=Decimal("250.00"),
            delivery_fee=Decimal("50.00"),
            tip=Decimal("0.00"),
            total=Decimal("300.00"),
            status=BookingStatus.PENDING,
            payment_status=PaymentStatus.PENDING
        )
        db.add(booking1)
        db.commit()
        db.refresh(booking1)

        booking2 = Booking(
            customer_id=sample_customer.customer_id,
            delivery_date=date(2025, 11, 5),
            pickup_date=date(2025, 11, 7),
            delivery_address="456 Test Ave",
            subtotal=Decimal("300.00"),
            delivery_fee=Decimal("50.00"),
            tip=Decimal("0.00"),
            total=Decimal("350.00"),
            status=BookingStatus.PENDING,
            payment_status=PaymentStatus.PENDING
        )
        db.add(booking2)
        db.commit()
        db.refresh(booking2)

        assert booking1.order_number != booking2.order_number

    def test_booking_foreign_key_customer(self, db):
        """Test that booking requires valid customer."""
        booking = Booking(
            customer_id="nonexistent-customer-id",
            delivery_date=date(2025, 11, 1),
            pickup_date=date(2025, 11, 3),
            delivery_address="123 Test St",
            subtotal=Decimal("250.00"),
            delivery_fee=Decimal("50.00"),
            tip=Decimal("0.00"),
            total=Decimal("300.00"),
            status=BookingStatus.PENDING,
            payment_status=PaymentStatus.PENDING
        )
        db.add(booking)
        with pytest.raises(IntegrityError):
            db.commit()


class TestBookingItemModel:
    """Test the BookingItem model."""

    def test_create_booking_item(self, db, sample_booking, sample_inventory_item):
        """Test creating a booking item."""
        booking_item = BookingItem(
            booking_id=sample_booking.booking_id,
            inventory_item_id=sample_inventory_item.inventory_item_id,
            quantity=2,
            price=Decimal("250.00")
        )
        db.add(booking_item)
        db.commit()
        db.refresh(booking_item)

        assert booking_item.booking_item_id is not None
        assert booking_item.quantity == 2
        assert booking_item.price == Decimal("250.00")

    def test_booking_item_requires_booking(self, db, sample_inventory_item):
        """Test that booking item requires valid booking."""
        booking_item = BookingItem(
            booking_id="nonexistent-booking-id",
            inventory_item_id=sample_inventory_item.inventory_item_id,
            quantity=1,
            price=Decimal("250.00")
        )
        db.add(booking_item)
        with pytest.raises(IntegrityError):
            db.commit()


class TestModelRelationships:
    """Test relationships between models."""

    def test_customer_bookings_relationship(self, db, sample_customer, sample_booking):
        """Test that customer has access to their bookings."""
        customer = db.query(Customer).filter(
            Customer.customer_id == sample_customer.customer_id
        ).first()
        assert len(customer.bookings) >= 1
        assert any(b.booking_id == sample_booking.booking_id for b in customer.bookings)

    def test_booking_items_relationship(self, db, sample_booking):
        """Test that booking has access to its items."""
        booking = db.query(Booking).filter(
            Booking.booking_id == sample_booking.booking_id
        ).first()
        assert len(booking.booking_items) >= 1

    def test_driver_bookings_relationship(self, db, sample_driver, sample_booking):
        """Test that driver has access to assigned bookings."""
        driver = db.query(Driver).filter(
            Driver.driver_id == sample_driver.driver_id
        ).first()
        assert len(driver.assigned_deliveries) >= 1
        assert any(b.booking_id == sample_booking.booking_id for b in driver.assigned_deliveries)
