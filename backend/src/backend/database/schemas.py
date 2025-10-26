"""
Pydantic schemas for request/response validation.

Following Pydantic v2 standards with strict validation and proper types.
All schemas use ConfigDict for ORM mode and validation settings.
"""

from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator, field_serializer, model_validator

from backend.database.models import (
    BookingStatus,
    PaymentStatus,
    InventoryStatus,
    MovementType,
    LocationType,
    PaymentType,
    NotificationType,
    NotificationChannel,
    NotificationStatus,
)


# Base configuration for all schemas
class BaseSchema(BaseModel):
    """Base schema with common configuration."""

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )


# Customer Schemas


class CustomerBase(BaseSchema):
    """Base customer fields."""

    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=20)
    address: Optional[str] = None
    address_lat: Optional[Decimal] = None
    address_lng: Optional[Decimal] = None


class CustomerCreate(CustomerBase):
    """Schema for creating a new customer."""

    pass


class CustomerUpdate(BaseSchema):
    """Schema for updating a customer (all fields optional)."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, min_length=10, max_length=20)
    address: Optional[str] = None
    address_lat: Optional[Decimal] = None
    address_lng: Optional[Decimal] = None


class Customer(CustomerBase):
    """Complete customer response schema."""

    customer_id: str
    created_at: datetime
    total_bookings: int
    total_spent: Decimal


# Warehouse Schemas


class WarehouseBase(BaseSchema):
    """Base warehouse fields."""

    name: str = Field(..., min_length=1, max_length=255)
    address: str
    address_lat: Decimal = Field(..., ge=-90, le=90)
    address_lng: Decimal = Field(..., ge=-180, le=180)
    is_active: bool = True


class WarehouseCreate(WarehouseBase):
    """Schema for creating a new warehouse."""

    pass


class WarehouseUpdate(BaseSchema):
    """Schema for updating a warehouse."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    address: Optional[str] = None
    address_lat: Optional[Decimal] = Field(None, ge=-90, le=90)
    address_lng: Optional[Decimal] = Field(None, ge=-180, le=180)
    is_active: Optional[bool] = None


class Warehouse(WarehouseBase):
    """Complete warehouse response schema."""

    warehouse_id: str
    created_at: datetime


# Inventory Item Schemas


class InventoryItemBase(BaseSchema):
    """Base inventory item fields."""

    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    base_price: Decimal = Field(..., gt=0, decimal_places=2)
    image_url: Optional[str] = None
    website_visible: bool = True
    requires_power: bool = False
    min_space_sqft: Optional[int] = Field(None, ge=0)
    allowed_surfaces: Optional[List[str]] = None
    default_warehouse_id: str


class InventoryItemCreate(InventoryItemBase):
    """Schema for creating a new inventory item."""

    pass


class InventoryItemUpdate(BaseSchema):
    """Schema for updating an inventory item."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    base_price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    image_url: Optional[str] = None
    website_visible: Optional[bool] = None
    requires_power: Optional[bool] = None
    min_space_sqft: Optional[int] = Field(None, ge=0)
    allowed_surfaces: Optional[List[str]] = None
    default_warehouse_id: Optional[str] = None
    current_warehouse_id: Optional[str] = None
    status: Optional[InventoryStatus] = None


class InventoryItem(InventoryItemBase):
    """Complete inventory item response schema."""

    inventory_item_id: str
    current_warehouse_id: Optional[str]
    status: str
    description: Optional[str]
    image_url: Optional[str]
    website_visible: bool
    created_at: datetime
    photos: List["InventoryPhoto"] = []

    @model_validator(mode="before")
    @classmethod
    def convert_allowed_surfaces(cls, data: Any) -> Any:
        """Convert allowed_surfaces from comma-separated string to list."""
        # Handle dictionary input
        if isinstance(data, dict):
            allowed_surfaces = data.get("allowed_surfaces")
            if isinstance(allowed_surfaces, str) and allowed_surfaces:
                data = data.copy()  # Don't mutate original
                data["allowed_surfaces"] = [s.strip() for s in allowed_surfaces.split(",") if s.strip()]
            elif allowed_surfaces == "":
                data = data.copy()
                data["allowed_surfaces"] = []
            return data

        # Handle SQLAlchemy model objects - convert to dict first
        try:
            # Try to get __dict__ and filter out SQLAlchemy internal attributes
            if hasattr(data, "__dict__"):
                data_dict = {}
                for key, value in data.__dict__.items():
                    if not key.startswith("_"):
                        data_dict[key] = value

                # Now handle allowed_surfaces in the dict
                allowed_surfaces = data_dict.get("allowed_surfaces")
                if isinstance(allowed_surfaces, str) and allowed_surfaces:
                    data_dict["allowed_surfaces"] = [s.strip() for s in allowed_surfaces.split(",") if s.strip()]
                elif allowed_surfaces == "":
                    data_dict["allowed_surfaces"] = []

                return data_dict
        except Exception:
            # If anything fails, just return the original data and let Pydantic handle it
            pass

        return data


# Inventory Photo Schemas


class InventoryPhotoBase(BaseSchema):
    """Base inventory photo fields."""

    image_url: str = Field(..., min_length=1, max_length=500)
    display_order: int = Field(0, ge=0)
    is_thumbnail: bool = False


class InventoryPhotoCreate(InventoryPhotoBase):
    """Schema for creating a new inventory photo."""

    inventory_item_id: str


class InventoryPhotoUpdate(BaseSchema):
    """Schema for updating an inventory photo."""

    image_url: Optional[str] = Field(None, min_length=1, max_length=500)
    display_order: Optional[int] = Field(None, ge=0)
    is_thumbnail: Optional[bool] = None


class InventoryPhoto(InventoryPhotoBase):
    """Complete inventory photo response schema."""

    photo_id: str
    inventory_item_id: str
    created_at: datetime


class InventoryPhotoReorder(BaseSchema):
    """Schema for reordering photos."""

    photo_orders: List[dict] = Field(..., min_length=1)  # [{"photo_id": "...", "display_order": 1}, ...]


# Driver Schemas


class DriverBase(BaseSchema):
    """Base driver fields."""

    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: str = Field(..., min_length=10, max_length=20)
    license_number: Optional[str] = None
    is_active: bool = True


class DriverCreate(DriverBase):
    """Schema for creating a new driver."""

    pass


class DriverUpdate(BaseSchema):
    """Schema for updating a driver."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, min_length=10, max_length=20)
    license_number: Optional[str] = None
    is_active: Optional[bool] = None


class Driver(DriverBase):
    """Complete driver response schema."""

    driver_id: str
    total_deliveries: int
    total_earnings: Decimal
    on_time_deliveries: int
    late_deliveries: int
    avg_rating: Optional[Decimal]
    total_ratings: int
    created_at: datetime


# Booking Item Schemas


class BookingItemBase(BaseSchema):
    """Base booking item fields."""

    inventory_item_id: str
    quantity: int = Field(1, ge=1)
    price: Decimal = Field(..., gt=0, decimal_places=2)
    pickup_warehouse_id: Optional[str] = None
    return_warehouse_id: Optional[str] = None


class BookingItemCreate(BookingItemBase):
    """Schema for creating a booking item."""

    pass


class BookingItem(BookingItemBase):
    """Complete booking item response schema."""

    booking_item_id: str
    inventory_item: Optional["InventoryItem"] = None


# Booking Schemas


class BookingBase(BaseSchema):
    """Base booking fields."""

    customer_id: str
    delivery_date: date
    delivery_time_window: Optional[str] = None
    pickup_date: date
    pickup_time_window: Optional[str] = None
    delivery_address: str
    delivery_lat: Optional[Decimal] = None
    delivery_lng: Optional[Decimal] = None
    setup_instructions: Optional[str] = None
    subtotal: Decimal = Field(..., ge=0, decimal_places=2)
    delivery_fee: Decimal = Field(..., ge=0, decimal_places=2)
    tip: Decimal = Field(Decimal("0.00"), ge=0, decimal_places=2)
    total: Decimal = Field(..., ge=0, decimal_places=2)

    @field_validator("pickup_date")
    @classmethod
    def pickup_after_delivery(cls, v: date, info) -> date:
        """Validate that pickup date is not before delivery date."""
        if "delivery_date" in info.data and v < info.data["delivery_date"]:
            raise ValueError("Pickup date must be on or after delivery date")
        return v


class BookingCreate(BookingBase):
    """Schema for creating a new booking."""

    items: List[BookingItemCreate] = Field(..., min_length=1)


class BookingUpdate(BaseSchema):
    """Schema for updating a booking."""

    delivery_date: Optional[date] = None
    delivery_time_window: Optional[str] = None
    pickup_date: Optional[date] = None
    pickup_time_window: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_lat: Optional[Decimal] = None
    delivery_lng: Optional[Decimal] = None
    setup_instructions: Optional[str] = None
    status: Optional[BookingStatus] = None
    assigned_driver_id: Optional[str] = None
    pickup_driver_id: Optional[str] = None
    payment_status: Optional[PaymentStatus] = None
    stripe_payment_id: Optional[str] = None


class Booking(BookingBase):
    """Complete booking response schema."""

    booking_id: str
    order_number: str
    rental_days: int
    status: str
    assigned_driver_id: Optional[str]
    pickup_driver_id: Optional[str]
    payment_status: str
    stripe_payment_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    customer: Optional["Customer"] = None
    booking_items: List[BookingItem] = []


# Simplified Booking Item for Customer Booking
class SimpleBookingItem(BaseSchema):
    """Simplified booking item for customer booking flow."""
    inventory_item_id: str
    quantity: int = Field(1, ge=1)


# Customer Booking Create (simplified for customer booking flow)
class CustomerBookingCreate(BaseSchema):
    """Schema for creating a booking with customer details (customer booking flow)."""

    # Customer details
    customer_name: str = Field(..., min_length=1, max_length=255)
    customer_email: EmailStr
    customer_phone: str = Field(..., min_length=10, max_length=20)

    # Booking details
    delivery_date: date
    pickup_date: date
    delivery_address: str
    delivery_latitude: Optional[float] = None
    delivery_longitude: Optional[float] = None
    items: List[SimpleBookingItem] = Field(..., min_length=1)
    notes: Optional[str] = None

    @field_validator("pickup_date")
    @classmethod
    def pickup_after_delivery(cls, v: date, info) -> date:
        """Validate that pickup date is not before delivery date."""
        if "delivery_date" in info.data and v < info.data["delivery_date"]:
            raise ValueError("Pickup date must be on or after delivery date")
        return v


# Inventory Movement Schemas


class InventoryMovementBase(BaseSchema):
    """Base inventory movement fields."""

    inventory_item_id: str
    booking_id: Optional[str] = None
    movement_type: MovementType
    from_location_type: LocationType
    from_location_id: Optional[str] = None
    to_location_type: LocationType
    to_location_id: Optional[str] = None
    driver_id: Optional[str] = None
    notes: Optional[str] = None


class InventoryMovementCreate(InventoryMovementBase):
    """Schema for creating an inventory movement."""

    pass


class InventoryMovement(InventoryMovementBase):
    """Complete inventory movement response schema."""

    inventory_movement_id: str
    movement_date: datetime


# Payment Schemas


class PaymentBase(BaseSchema):
    """Base payment fields."""

    booking_id: str
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    payment_type: PaymentType
    status: PaymentStatus
    payment_method: Optional[str] = None


class PaymentCreate(PaymentBase):
    """Schema for creating a payment."""

    stripe_payment_intent_id: Optional[str] = None


class PaymentUpdate(BaseSchema):
    """Schema for updating a payment."""

    status: Optional[PaymentStatus] = None
    stripe_payment_intent_id: Optional[str] = None
    processed_at: Optional[datetime] = None


class Payment(PaymentBase):
    """Complete payment response schema."""

    payment_id: str
    stripe_payment_intent_id: Optional[str]
    processed_at: Optional[datetime]
    created_at: datetime


# Notification Schemas


class NotificationBase(BaseSchema):
    """Base notification fields."""

    booking_id: Optional[str] = None
    customer_id: str
    notification_type: NotificationType
    channel: NotificationChannel
    status: NotificationStatus


class NotificationCreate(NotificationBase):
    """Schema for creating a notification."""

    pass


class NotificationUpdate(BaseSchema):
    """Schema for updating a notification."""

    status: Optional[NotificationStatus] = None
    sent_at: Optional[datetime] = None


class Notification(NotificationBase):
    """Complete notification response schema."""

    notification_id: str
    sent_at: Optional[datetime]
    created_at: datetime


# Special Schemas for Business Logic


class AvailabilityCheck(BaseSchema):
    """Schema for checking equipment availability."""

    item_ids: List[str] = Field(..., min_length=1)
    delivery_date: date
    pickup_date: date

    @field_validator("pickup_date")
    @classmethod
    def pickup_after_delivery(cls, v: date, info) -> date:
        """Validate that pickup date is not before delivery date."""
        if "delivery_date" in info.data and v < info.data["delivery_date"]:
            raise ValueError("Pickup date must be on or after delivery date")
        return v


class AvailabilityResponse(BaseSchema):
    """Response for availability check."""

    available: bool
    conflicts: List[dict] = []
    message: str


class PartySpaceDetails(BaseSchema):
    """Customer party space details for equipment filtering."""

    area_size: int = Field(..., ge=0, description="Square feet available")
    surface: str = Field(..., description="Surface type (grass, concrete, etc.)")
    has_power: bool = Field(..., description="Power outlet available")


class ConflictDetail(BaseSchema):
    """Details about a booking conflict."""

    item_name: str
    booking1: dict
    booking2: dict
