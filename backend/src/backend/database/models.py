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
