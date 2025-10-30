"""
SQLAlchemy database models for Party Rental Management System.

Models follow entity-specific primary key naming convention (e.g., customer_id, booking_id).
All models use UUID primary keys for distributed system compatibility.
"""

from datetime import datetime, UTC
from decimal import Decimal
from typing import List
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    ARRAY,
    event,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
import enum

from backend.database.base import Base


# Enums for status fields
class BookingStatus(str, enum.Enum):
    """Booking lifecycle states."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    OUT_FOR_DELIVERY = "out_for_delivery"
    ACTIVE = "active"
    PICKUP_SCHEDULED = "pickup_scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PaymentStatus(str, enum.Enum):
    """Payment states."""

    PENDING = "pending"
    PAID = "paid"
    REFUNDED = "refunded"


class InventoryStatus(str, enum.Enum):
    """Inventory item availability states."""

    AVAILABLE = "available"
    RENTED = "rented"
    MAINTENANCE = "maintenance"
    RETIRED = "retired"


class MovementType(str, enum.Enum):
    """Inventory movement types for tracking."""

    PICKUP_FROM_WAREHOUSE = "pickup_from_warehouse"
    DELIVERY_TO_CUSTOMER = "delivery_to_customer"
    PICKUP_FROM_CUSTOMER = "pickup_from_customer"
    RETURN_TO_WAREHOUSE = "return_to_warehouse"
    WAREHOUSE_TRANSFER = "warehouse_transfer"


class LocationType(str, enum.Enum):
    """Location types for inventory movements."""

    WAREHOUSE = "warehouse"
    CUSTOMER = "customer"


class PaymentType(str, enum.Enum):
    """Payment transaction types."""

    DEPOSIT = "deposit"
    FULL_PAYMENT = "full_payment"
    TIP = "tip"
    REFUND = "refund"


class NotificationType(str, enum.Enum):
    """Notification message types."""

    BOOKING_CONFIRMATION = "booking_confirmation"
    DELIVERY_REMINDER = "delivery_reminder"
    PICKUP_REMINDER = "pickup_reminder"
    DRIVER_ASSIGNED = "driver_assigned"


class NotificationChannel(str, enum.Enum):
    """Communication channels for notifications."""

    SMS = "sms"
    EMAIL = "email"


class NotificationStatus(str, enum.Enum):
    """Notification delivery states."""

    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class ProposalStatus(str, enum.Enum):
    """Phineas proposal states."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTED = "executed"
    FAILED = "failed"


class ProposalType(str, enum.Enum):
    """Types of actions Phineas can propose."""

    DRIVER_ASSIGNMENT = "driver_assignment"
    INVENTORY_ORGANIZATION = "inventory_organization"
    CLIENT_ONBOARDING = "client_onboarding"
    VENDOR_ONBOARDING = "vendor_onboarding"
    CUSTOMER_COMMUNICATION = "customer_communication"


class PartnerStatus(str, enum.Enum):
    """Partner relationship states."""

    PROSPECTING = "prospecting"
    PIPELINE = "pipeline"
    PARTNERED = "partnered"
    INACTIVE = "inactive"


class IntegrationType(str, enum.Enum):
    """Partner integration methods."""

    MANUAL = "manual"
    WEB_SCRAPING = "web_scraping"
    API = "api"
    CSV_UPLOAD = "csv_upload"


class OwnershipType(str, enum.Enum):
    """Inventory ownership types."""

    OWN_INVENTORY = "own_inventory"
    PARTNER_INVENTORY = "partner_inventory"


class SyncStatus(str, enum.Enum):
    """Inventory sync operation status."""

    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"


# Database Models


class Customer(Base):
    """Customer information for all bookings."""

    __tablename__ = "customers"

    customer_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    address_lat: Mapped[Decimal | None] = mapped_column(Numeric(10, 8), nullable=True)
    address_lng: Mapped[Decimal | None] = mapped_column(Numeric(11, 8), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), nullable=False
    )
    total_bookings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_spent: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)

    # Relationships
    bookings: Mapped[List["Booking"]] = relationship("Booking", back_populates="customer")


class Warehouse(Base):
    """Physical locations where equipment is stored."""

    __tablename__ = "warehouses"

    warehouse_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    address_lat: Mapped[Decimal] = mapped_column(Numeric(10, 8), nullable=False)
    address_lng: Mapped[Decimal] = mapped_column(Numeric(11, 8), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    inventory_items_default: Mapped[List["InventoryItem"]] = relationship(
        "InventoryItem", foreign_keys="InventoryItem.default_warehouse_id", back_populates="default_warehouse"
    )
    inventory_items_current: Mapped[List["InventoryItem"]] = relationship(
        "InventoryItem", foreign_keys="InventoryItem.current_warehouse_id", back_populates="current_warehouse"
    )


class InventoryItem(Base):
    """Master list of all rental equipment."""

    __tablename__ = "inventory_items"

    inventory_item_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)  # Full description for website
    base_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)  # URL to item photo
    website_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)  # Show on customer site
    requires_power: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    min_space_sqft: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Note: SQLite doesn't support ARRAY, we'll store as JSON string or use PostgreSQL
    allowed_surfaces: Mapped[str | None] = mapped_column(Text, nullable=True)  # Stored as comma-separated
    default_warehouse_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("warehouses.warehouse_id"), nullable=False
    )
    current_warehouse_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("warehouses.warehouse_id"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=InventoryStatus.AVAILABLE.value, index=True
    )

    # Partner inventory fields
    ownership_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default=OwnershipType.OWN_INVENTORY.value, index=True
    )
    partner_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("partners.partner_id"), nullable=True, index=True
    )
    warehouse_location_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("warehouse_locations.location_id"), nullable=True, index=True
    )
    partner_cost: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )  # What partner charges us
    customer_price: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )  # What we charge customer (with markup)
    partner_product_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duplicate_group_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    default_warehouse: Mapped["Warehouse"] = relationship(
        "Warehouse", foreign_keys=[default_warehouse_id], back_populates="inventory_items_default"
    )
    current_warehouse: Mapped["Warehouse"] = relationship(
        "Warehouse", foreign_keys=[current_warehouse_id], back_populates="inventory_items_current"
    )
    partner: Mapped["Partner"] = relationship(
        "Partner", foreign_keys=[partner_id], back_populates="inventory_items"
    )
    warehouse_location: Mapped["WarehouseLocation"] = relationship(
        "WarehouseLocation", foreign_keys=[warehouse_location_id], back_populates="inventory_items"
    )
    booking_items: Mapped[List["BookingItem"]] = relationship("BookingItem", back_populates="inventory_item")
    movements: Mapped[List["InventoryMovement"]] = relationship("InventoryMovement", back_populates="inventory_item")
    photos: Mapped[List["InventoryPhoto"]] = relationship(
        "InventoryPhoto", back_populates="inventory_item", cascade="all, delete-orphan"
    )


class Driver(Base):
    """People who deliver and pickup equipment."""

    __tablename__ = "drivers"

    driver_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    license_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    total_deliveries: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_earnings: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)

    # Performance metrics
    on_time_deliveries: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    late_deliveries: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_rating: Mapped[Decimal | None] = mapped_column(Numeric(3, 2), nullable=True)  # 0.00 to 5.00
    total_ratings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    deliveries: Mapped[List["Booking"]] = relationship(
        "Booking", foreign_keys="Booking.assigned_driver_id", back_populates="assigned_driver"
    )
    pickups: Mapped[List["Booking"]] = relationship(
        "Booking", foreign_keys="Booking.pickup_driver_id", back_populates="pickup_driver"
    )
    movements: Mapped[List["InventoryMovement"]] = relationship("InventoryMovement", back_populates="driver")


class Booking(Base):
    """Customer orders/reservations."""

    __tablename__ = "bookings"

    booking_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    order_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    customer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("customers.customer_id"), nullable=False, index=True
    )
    delivery_date: Mapped[datetime] = mapped_column(Date, nullable=False, index=True)
    delivery_time_window: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pickup_date: Mapped[datetime] = mapped_column(Date, nullable=False, index=True)
    pickup_time_window: Mapped[str | None] = mapped_column(String(50), nullable=True)
    rental_days: Mapped[int] = mapped_column(Integer, nullable=False)
    delivery_address: Mapped[str] = mapped_column(Text, nullable=False)
    delivery_lat: Mapped[Decimal | None] = mapped_column(Numeric(10, 8), nullable=True)
    delivery_lng: Mapped[Decimal | None] = mapped_column(Numeric(11, 8), nullable=True)
    setup_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=BookingStatus.PENDING.value, index=True
    )
    assigned_driver_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("drivers.driver_id"), nullable=True, index=True
    )
    pickup_driver_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("drivers.driver_id"), nullable=True
    )
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    delivery_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    tip: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    payment_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=PaymentStatus.PENDING.value
    )
    stripe_payment_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    customer: Mapped["Customer"] = relationship("Customer", back_populates="bookings")
    assigned_driver: Mapped["Driver"] = relationship(
        "Driver", foreign_keys=[assigned_driver_id], back_populates="deliveries"
    )
    pickup_driver: Mapped["Driver"] = relationship(
        "Driver", foreign_keys=[pickup_driver_id], back_populates="pickups"
    )
    booking_items: Mapped[List["BookingItem"]] = relationship("BookingItem", back_populates="booking", cascade="all, delete-orphan")
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="booking")
    movements: Mapped[List["InventoryMovement"]] = relationship("InventoryMovement", back_populates="booking")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="booking")


# Event listener for auto-generating order_number and rental_days
@event.listens_for(Booking, 'before_insert')
def generate_booking_defaults(mapper, connection, target):
    """Auto-generate order number and rental days if not provided."""
    if not target.order_number:
        import secrets
        date_part = datetime.now(UTC).strftime('%Y%m%d')
        random_part = secrets.token_hex(3).upper()
        target.order_number = f"PTY-{date_part}-{random_part}"

    # Calculate rental_days if not provided
    if not target.rental_days and target.delivery_date and target.pickup_date:
        target.rental_days = (target.pickup_date - target.delivery_date).days


class BookingItem(Base):
    """Junction table linking bookings to specific equipment."""

    __tablename__ = "booking_items"

    booking_item_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    booking_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bookings.booking_id", ondelete="CASCADE"), nullable=False, index=True
    )
    inventory_item_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("inventory_items.inventory_item_id"), nullable=False, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    pickup_warehouse_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("warehouses.warehouse_id"), nullable=True
    )
    return_warehouse_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("warehouses.warehouse_id"), nullable=True
    )

    # Relationships
    booking: Mapped["Booking"] = relationship("Booking", back_populates="booking_items")
    inventory_item: Mapped["InventoryItem"] = relationship("InventoryItem", back_populates="booking_items")
    pickup_warehouse: Mapped["Warehouse"] = relationship(
        "Warehouse", foreign_keys=[pickup_warehouse_id]
    )
    return_warehouse: Mapped["Warehouse"] = relationship(
        "Warehouse", foreign_keys=[return_warehouse_id]
    )


class InventoryMovement(Base):
    """
    CRITICAL TABLE - Tracks real-time item location history.

    Logs every item movement for audit trail and real-time tracking.
    """

    __tablename__ = "inventory_movements"

    inventory_movement_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    inventory_item_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("inventory_items.inventory_item_id"), nullable=False, index=True
    )
    booking_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("bookings.booking_id"), nullable=True, index=True
    )
    movement_type: Mapped[str] = mapped_column(String(50), nullable=False)
    from_location_type: Mapped[str] = mapped_column(String(20), nullable=False)
    from_location_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    to_location_type: Mapped[str] = mapped_column(String(20), nullable=False)
    to_location_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    driver_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("drivers.driver_id"), nullable=True, index=True
    )
    movement_date: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), nullable=False, index=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    inventory_item: Mapped["InventoryItem"] = relationship("InventoryItem", back_populates="movements")
    booking: Mapped["Booking"] = relationship("Booking", back_populates="movements")
    driver: Mapped["Driver"] = relationship("Driver", back_populates="movements")


class Payment(Base):
    """Payment transaction records."""

    __tablename__ = "payments"

    payment_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    booking_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bookings.booking_id"), nullable=False, index=True
    )
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    payment_type: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    booking: Mapped["Booking"] = relationship("Booking", back_populates="payments")


class Notification(Base):
    """Track SMS/Email notifications sent."""

    __tablename__ = "notifications"

    notification_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    booking_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("bookings.booking_id"), nullable=True, index=True
    )
    customer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("customers.customer_id"), nullable=False, index=True
    )
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)
    channel: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    booking: Mapped["Booking"] = relationship("Booking", back_populates="notifications")
    customer: Mapped["Customer"] = relationship("Customer")


class InventoryPhoto(Base):
    """Photos for inventory items - supports multiple images per item."""

    __tablename__ = "inventory_photos"

    photo_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    inventory_item_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("inventory_items.inventory_item_id"), nullable=False, index=True
    )
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_thumbnail: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    inventory_item: Mapped["InventoryItem"] = relationship(
        "InventoryItem", back_populates="photos"
    )


class PhineasProposal(Base):
    """
    Phineas AI action proposals for business operations.

    Tracks autonomous AI suggestions for driver assignments, inventory management,
    customer communications, and other operational tasks. Implements supervised
    AI workflow: propose → review → approve/reject → execute.
    """

    __tablename__ = "phineas_proposals"

    proposal_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    proposal_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ProposalStatus.PENDING.value, index=True
    )

    # Core proposal data
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    confidence_score: Mapped[Decimal] = mapped_column(
        Numeric(3, 2), nullable=False
    )  # 0.00 to 1.00

    # Action payload (JSON stored as text)
    action_data: Mapped[str] = mapped_column(Text, nullable=False)  # JSON string

    # Related entities (optional foreign keys)
    booking_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("bookings.booking_id"), nullable=True, index=True
    )
    driver_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("drivers.driver_id"), nullable=True, index=True
    )
    inventory_item_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("inventory_items.inventory_item_id"), nullable=True
    )
    customer_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("customers.customer_id"), nullable=True
    )

    # Execution tracking
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    executed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    execution_result: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    booking: Mapped["Booking"] = relationship("Booking", foreign_keys=[booking_id])
    driver: Mapped["Driver"] = relationship("Driver", foreign_keys=[driver_id])
    inventory_item: Mapped["InventoryItem"] = relationship("InventoryItem", foreign_keys=[inventory_item_id])
    customer: Mapped["Customer"] = relationship("Customer", foreign_keys=[customer_id])


class Partner(Base):
    """
    Partner companies that provide additional rental inventory.

    Partners can have multiple warehouse locations, each serving different service areas.
    Tracks relationship status, integration method, and financial terms.
    """

    __tablename__ = "partners"

    partner_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    contact_person: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=PartnerStatus.PROSPECTING.value, index=True
    )
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Financial terms
    commission_rate: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )  # Percentage partner gets (e.g., 85.00 = 85%)
    markup_percentage: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )  # Our markup on partner cost (e.g., 20.00 = 20%)

    # Integration settings
    integration_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default=IntegrationType.MANUAL.value
    )
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    warehouse_locations: Mapped[List["WarehouseLocation"]] = relationship(
        "WarehouseLocation", back_populates="partner", cascade="all, delete-orphan"
    )
    inventory_items: Mapped[List["InventoryItem"]] = relationship(
        "InventoryItem", back_populates="partner"
    )
    sync_logs: Mapped[List["InventorySyncLog"]] = relationship(
        "InventorySyncLog", back_populates="partner"
    )


class WarehouseLocation(Base):
    """
    Physical warehouse locations for partner companies.

    Each partner can have multiple warehouse locations serving different geographic areas.
    Supports both radius-based and city-list service area definitions.
    """

    __tablename__ = "warehouse_locations"

    location_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    partner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("partners.partner_id"), nullable=False, index=True
    )
    location_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Address and coordinates
    address: Mapped[str] = mapped_column(Text, nullable=False)
    address_lat: Mapped[Decimal | None] = mapped_column(Numeric(10, 8), nullable=True)
    address_lng: Mapped[Decimal | None] = mapped_column(Numeric(11, 8), nullable=True)

    # Service area definitions (supports BOTH radius AND city list)
    service_area_radius_miles: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 2), nullable=True
    )  # e.g., 50.00 miles
    service_area_cities: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # JSON array of city names

    # Contact information
    contact_person: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Operating details
    operating_hours: Mapped[str | None] = mapped_column(Text, nullable=True)
    delivery_options: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # JSON for delivery capabilities

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    partner: Mapped["Partner"] = relationship("Partner", back_populates="warehouse_locations")
    inventory_items: Mapped[List["InventoryItem"]] = relationship(
        "InventoryItem", back_populates="warehouse_location"
    )
    sync_logs: Mapped[List["InventorySyncLog"]] = relationship(
        "InventorySyncLog", back_populates="warehouse_location"
    )


class InventorySyncLog(Base):
    """
    Tracks inventory synchronization operations with partner systems.

    Logs each sync attempt including items added/updated/removed and any errors.
    Supports filtering by partner, warehouse location, or sync status.
    """

    __tablename__ = "inventory_sync_logs"

    sync_log_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    partner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("partners.partner_id"), nullable=False, index=True
    )
    warehouse_location_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("warehouse_locations.location_id"), nullable=True, index=True
    )

    sync_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # manual, scheduled, web_scraping, api, csv_upload

    # Sync statistics
    items_added: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_updated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_removed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=SyncStatus.SUCCESS.value, index=True
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    sync_started_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), nullable=False, index=True
    )
    sync_completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    partner: Mapped["Partner"] = relationship("Partner", back_populates="sync_logs")
    warehouse_location: Mapped["WarehouseLocation"] = relationship(
        "WarehouseLocation", back_populates="sync_logs"
    )
