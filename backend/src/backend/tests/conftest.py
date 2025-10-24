"""
Pytest configuration and fixtures for testing.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import date, datetime
from decimal import Decimal

from backend.main import app
from backend.database.models import Base
from backend.database.connection import get_db


# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """Create a test client with database dependency override."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_warehouse(db):
    """Create a sample warehouse for testing."""
    from backend.database.models import Warehouse
    warehouse = Warehouse(
        name="Test Warehouse",
        address="123 Test St, Costa Mesa, CA 92626",
        address_lat=Decimal("33.6411"),
        address_lng=Decimal("-117.9187"),
        is_active=True
    )
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse


@pytest.fixture
def sample_customer(db):
    """Create a sample customer for testing."""
    from backend.database.models import Customer
    customer = Customer(
        name="John Doe",
        email="john.doe@example.com",
        phone="7145550101",
        address="456 Customer Ave, Costa Mesa, CA 92626",
        address_lat=Decimal("33.6415"),
        address_lng=Decimal("-117.9190")
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@pytest.fixture
def sample_driver(db):
    """Create a sample driver for testing."""
    from backend.database.models import Driver
    driver = Driver(
        name="Mike Johnson",
        email="mike@partay.com",
        phone="7145550102",
        license_number="D1234567",
        is_active=True
    )
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver


@pytest.fixture
def sample_inventory_item(db, sample_warehouse):
    """Create a sample inventory item for testing."""
    from backend.database.models import InventoryItem, InventoryStatus
    item = InventoryItem(
        name="Bounce House Castle",
        category="Inflatables",
        base_price=Decimal("250.00"),
        requires_power=True,
        min_space_sqft=225,
        allowed_surfaces="grass,artificial_turf",
        default_warehouse_id=sample_warehouse.warehouse_id,
        current_warehouse_id=sample_warehouse.warehouse_id,
        status=InventoryStatus.AVAILABLE
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@pytest.fixture
def sample_booking(db, sample_customer, sample_inventory_item, sample_driver):
    """Create a sample booking for testing."""
    from backend.database.models import Booking, BookingItem, BookingStatus, PaymentStatus

    booking = Booking(
        customer_id=sample_customer.customer_id,
        delivery_date=date(2025, 10, 25),
        delivery_time_window="10:00 AM - 12:00 PM",
        pickup_date=date(2025, 10, 27),
        pickup_time_window="2:00 PM - 4:00 PM",
        delivery_address="456 Customer Ave, Costa Mesa, CA 92626",
        delivery_lat=Decimal("33.6415"),
        delivery_lng=Decimal("-117.9190"),
        setup_instructions="Setup in backyard",
        subtotal=Decimal("250.00"),
        delivery_fee=Decimal("50.00"),
        tip=Decimal("20.00"),
        total=Decimal("320.00"),
        status=BookingStatus.CONFIRMED,
        assigned_driver_id=sample_driver.driver_id,
        payment_status=PaymentStatus.PAID
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # Add booking item
    booking_item = BookingItem(
        booking_id=booking.booking_id,
        inventory_item_id=sample_inventory_item.inventory_item_id,
        quantity=1,
        price=Decimal("250.00"),
        pickup_warehouse_id=sample_inventory_item.current_warehouse_id,
        return_warehouse_id=sample_inventory_item.current_warehouse_id
    )
    db.add(booking_item)
    db.commit()

    return booking
