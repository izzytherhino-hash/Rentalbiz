"""
Inventory API endpoints.

Handles inventory management:
- List all inventory items
- Get item details
- Get item availability calendar
- Real-time location tracking
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import date
from pathlib import Path
import uuid
import shutil

from backend.database import get_db
from backend.database.models import (
    InventoryItem,
    InventoryPhoto,
    Booking,
    BookingItem,
    BookingStatus,
)
from backend.database.schemas import (
    InventoryItem as InventoryItemSchema,
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryPhoto as InventoryPhotoSchema,
    InventoryPhotoCreate,
    InventoryPhotoUpdate,
)

router = APIRouter()


@router.post("/", response_model=InventoryItemSchema, status_code=status.HTTP_201_CREATED)
async def create_inventory_item(
    item_data: InventoryItemCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new inventory item.

    Args:
        item_data: Inventory item details
        db: Database session

    Returns:
        Created inventory item

    Example:
        POST /api/inventory
        {
            "name": "Super Bounce House",
            "category": "Inflatable",
            "description": "20x20 castle bounce house",
            "base_price": 250.00,
            "image_url": "/uploads/super-bounce.jpg",
            "requires_power": true,
            "min_space_sqft": 400,
            "allowed_surfaces": ["grass", "concrete"],
            "default_warehouse_id": "warehouse-uuid"
        }
    """
    # Convert allowed_surfaces list to comma-separated string for storage
    item_dict = item_data.model_dump()
    if item_dict.get('allowed_surfaces') and isinstance(item_dict['allowed_surfaces'], list):
        item_dict['allowed_surfaces'] = ','.join(item_dict['allowed_surfaces'])

    item = InventoryItem(**item_dict)
    item.current_warehouse_id = item.default_warehouse_id  # Start at default warehouse

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


@router.get("/", response_model=List[InventoryItemSchema])
async def list_inventory(
    category: str = None,
    status: str = None,
    warehouse_id: str = None,
    db: Session = Depends(get_db),
):
    """
    List all inventory items with optional filters.

    Args:
        category: Filter by category (Inflatable, Concession, etc.)
        status: Filter by status (available, rented, maintenance)
        warehouse_id: Filter by current warehouse location
        db: Database session

    Returns:
        List of inventory items with real-time location

    Example:
        GET /api/inventory?category=Inflatable&status=available
    """
    from sqlalchemy.orm import joinedload

    query = db.query(InventoryItem).options(joinedload(InventoryItem.photos))

    if category:
        query = query.filter(InventoryItem.category == category)

    if status:
        query = query.filter(InventoryItem.status == status)

    if warehouse_id:
        query = query.filter(InventoryItem.current_warehouse_id == warehouse_id)

    items = query.all()
    return items


@router.get("/{item_id}", response_model=InventoryItemSchema)
async def get_inventory_item(
    item_id: str,
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a specific inventory item.

    Args:
        item_id: Inventory item UUID
        db: Database session

    Returns:
        Inventory item details

    Raises:
        HTTPException: If item not found
    """
    item = db.query(InventoryItem).filter(
        InventoryItem.inventory_item_id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found",
        )

    return item


@router.get("/{item_id}/calendar")
async def get_item_calendar(
    item_id: str,
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db),
):
    """
    Get booking calendar for a specific item.

    Shows when the item is booked, helping with scheduling and
    identifying available dates.

    Args:
        item_id: Inventory item UUID
        start_date: Calendar start date (optional)
        end_date: Calendar end date (optional)
        db: Database session

    Returns:
        List of bookings for this item

    Example:
        GET /api/inventory/{item_id}/calendar?start_date=2025-10-01&end_date=2025-10-31
    """
    # Verify item exists
    item = db.query(InventoryItem).filter(
        InventoryItem.inventory_item_id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found",
        )

    # Query bookings for this item
    query = (
        db.query(Booking)
        .join(BookingItem)
        .filter(BookingItem.inventory_item_id == item_id)
        .filter(Booking.status.notin_([
            BookingStatus.CANCELLED.value,
            BookingStatus.COMPLETED.value
        ]))
    )

    if start_date:
        query = query.filter(Booking.pickup_date >= start_date)

    if end_date:
        query = query.filter(Booking.delivery_date <= end_date)

    bookings = query.all()

    # Format response
    calendar_items = []
    for booking in bookings:
        calendar_items.append({
            "booking_id": booking.booking_id,
            "order_number": booking.order_number,
            "customer_name": booking.customer.name,
            "delivery_date": str(booking.delivery_date),
            "pickup_date": str(booking.pickup_date),
            "status": booking.status,
        })

    return {
        "item_id": item_id,
        "item_name": item.name,
        "bookings": calendar_items,
    }


@router.get("/{item_id}/availability")
async def check_item_availability(
    item_id: str,
    delivery_date: date,
    pickup_date: date,
    db: Session = Depends(get_db),
):
    """
    Check if a specific item is available for date range.

    Args:
        item_id: Inventory item UUID
        delivery_date: Requested delivery date
        pickup_date: Requested pickup date
        db: Database session

    Returns:
        Availability status and conflicting bookings if any

    Example:
        GET /api/inventory/{item_id}/availability?delivery_date=2025-10-20&pickup_date=2025-10-22
    """
    # Verify item exists
    item = db.query(InventoryItem).filter(
        InventoryItem.inventory_item_id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found",
        )

    # Check for overlapping bookings
    conflicts = (
        db.query(Booking)
        .join(BookingItem)
        .filter(BookingItem.inventory_item_id == item_id)
        .filter(Booking.status.notin_([
            BookingStatus.CANCELLED.value,
            BookingStatus.COMPLETED.value
        ]))
        .filter(
            Booking.delivery_date <= pickup_date,
            Booking.pickup_date >= delivery_date,
        )
        .all()
    )

    available = len(conflicts) == 0

    return {
        "available": available,
        "item_id": item_id,
        "item_name": item.name,
        "requested_dates": {
            "delivery": str(delivery_date),
            "pickup": str(pickup_date),
        },
        "conflicts": [
            {
                "order_number": booking.order_number,
                "delivery_date": str(booking.delivery_date),
                "pickup_date": str(booking.pickup_date),
            }
            for booking in conflicts
        ] if not available else [],
    }


@router.patch("/{item_id}", response_model=InventoryItemSchema)
async def update_inventory_item(
    item_id: str,
    update_data: InventoryItemUpdate,
    db: Session = Depends(get_db),
):
    """
    Update inventory item details.

    Used for updating status, location, or item properties.

    Args:
        item_id: Inventory item UUID
        update_data: Fields to update
        db: Database session

    Returns:
        Updated inventory item

    Raises:
        HTTPException: If item not found
    """
    item = db.query(InventoryItem).filter(
        InventoryItem.inventory_item_id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found",
        )

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)

    # Convert allowed_surfaces list to comma-separated string if needed
    if 'allowed_surfaces' in update_dict and isinstance(update_dict['allowed_surfaces'], list):
        update_dict['allowed_surfaces'] = ','.join(update_dict['allowed_surfaces'])

    for field, value in update_dict.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory_item(
    item_id: str,
    db: Session = Depends(get_db),
):
    """
    Delete an inventory item.

    Warning: This will fail if the item has associated bookings.
    Consider soft-deleting by setting status to 'inactive' instead.

    Args:
        item_id: Inventory item UUID
        db: Database session

    Returns:
        No content on success

    Raises:
        HTTPException: If item not found or has dependencies
    """
    item = db.query(InventoryItem).filter(
        InventoryItem.inventory_item_id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found",
        )

    # Check for active bookings
    active_bookings = (
        db.query(BookingItem)
        .join(Booking)
        .filter(BookingItem.inventory_item_id == item_id)
        .filter(Booking.status.notin_([
            BookingStatus.CANCELLED.value,
            BookingStatus.COMPLETED.value
        ]))
        .count()
    )

    if active_bookings > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete item with {active_bookings} active booking(s). Cancel bookings first or set item status to inactive.",
        )

    db.delete(item)
    db.commit()

    return None


@router.post("/upload-image", status_code=status.HTTP_201_CREATED)
async def upload_item_image(
    file: UploadFile = File(...),
):
    """
    Upload an image for an inventory item.

    Args:
        file: Image file to upload (JPEG, PNG, WebP)

    Returns:
        dict: URL to the uploaded image

    Raises:
        HTTPException: If file type is invalid or upload fails

    Example:
        POST /api/inventory/upload-image
        Content-Type: multipart/form-data
        file: <image file>

        Response:
        {
            "url": "/uploads/550e8400-e29b-41d4-a716-446655440000.jpg",
            "filename": "bounce_house.jpg"
        }
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}",
        )

    # Validate file size (max 5MB)
    file_size = 0
    chunk_size = 1024 * 1024  # 1MB
    for chunk in iter(lambda: file.file.read(chunk_size), b""):
        file_size += len(chunk)
        if file_size > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds 5MB limit",
            )
    file.file.seek(0)  # Reset file pointer

    # Generate unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"

    # Save file
    uploads_dir = Path(__file__).parent.parent.parent.parent.parent / "uploads"
    uploads_dir.mkdir(exist_ok=True)
    file_path = uploads_dir / unique_filename

    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}",
        )
    finally:
        file.file.close()

    return {
        "url": f"/uploads/{unique_filename}",
        "filename": file.filename,
    }


# Photo Management Endpoints


@router.get("/{item_id}/photos", response_model=List[InventoryPhotoSchema])
async def get_item_photos(
    item_id: str,
    db: Session = Depends(get_db),
):
    """
    Get all photos for a specific inventory item.

    Args:
        item_id: Inventory item UUID
        db: Database session

    Returns:
        List of photos ordered by display_order

    Raises:
        HTTPException: If item not found
    """
    # Verify item exists
    item = db.query(InventoryItem).filter(
        InventoryItem.inventory_item_id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found",
        )

    # Get photos ordered by display_order
    photos = db.query(InventoryPhoto).filter(
        InventoryPhoto.inventory_item_id == item_id
    ).order_by(InventoryPhoto.display_order).all()

    return photos


@router.post("/{item_id}/photos", response_model=InventoryPhotoSchema, status_code=status.HTTP_201_CREATED)
async def add_item_photo(
    item_id: str,
    photo_data: InventoryPhotoCreate,
    db: Session = Depends(get_db),
):
    """
    Add a photo to an inventory item.

    Args:
        item_id: Inventory item UUID
        photo_data: Photo details
        db: Database session

    Returns:
        Created photo

    Raises:
        HTTPException: If item not found
    """
    # Verify item exists
    item = db.query(InventoryItem).filter(
        InventoryItem.inventory_item_id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found",
        )

    # Create photo
    photo = InventoryPhoto(**photo_data.model_dump())

    db.add(photo)
    db.commit()
    db.refresh(photo)

    return photo


@router.post("/{item_id}/photos/upload", response_model=InventoryPhotoSchema, status_code=status.HTTP_201_CREATED)
async def upload_item_photo(
    item_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a photo file for an inventory item.

    Args:
        item_id: Inventory item UUID
        file: Image file to upload
        db: Database session

    Returns:
        Created photo with file URL

    Raises:
        HTTPException: If item not found or file type invalid
    """
    # Verify item exists
    item = db.query(InventoryItem).filter(
        InventoryItem.inventory_item_id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found",
        )

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image",
        )

    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads") / "inventory" / str(item_id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = upload_dir / unique_filename

    # Save file
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        file.file.close()

    # Get current photo count for display order
    existing_photos_count = db.query(InventoryPhoto).filter(
        InventoryPhoto.inventory_item_id == item_id
    ).count()

    # Create photo record
    photo_url = f"/uploads/inventory/{item_id}/{unique_filename}"
    photo = InventoryPhoto(
        inventory_item_id=item_id,
        image_url=photo_url,
        display_order=existing_photos_count,
        is_thumbnail=(existing_photos_count == 0),  # First photo is thumbnail
    )

    db.add(photo)
    db.commit()
    db.refresh(photo)

    return photo


@router.put("/photos/{photo_id}", response_model=InventoryPhotoSchema)
async def update_photo(
    photo_id: str,
    update_data: InventoryPhotoUpdate,
    db: Session = Depends(get_db),
):
    """
    Update a photo (change display order, set as thumbnail, etc.).

    If marking as thumbnail, automatically unsets other thumbnails for the same item.

    Args:
        photo_id: Photo UUID
        update_data: Fields to update
        db: Database session

    Returns:
        Updated photo

    Raises:
        HTTPException: If photo not found
    """
    photo = db.query(InventoryPhoto).filter(
        InventoryPhoto.photo_id == photo_id
    ).first()

    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found",
        )

    # If setting as thumbnail, unset other thumbnails for this item
    update_dict = update_data.model_dump(exclude_unset=True)
    if update_dict.get('is_thumbnail') is True:
        db.query(InventoryPhoto).filter(
            InventoryPhoto.inventory_item_id == photo.inventory_item_id,
            InventoryPhoto.photo_id != photo_id
        ).update({'is_thumbnail': False})

    # Update fields
    for field, value in update_dict.items():
        setattr(photo, field, value)

    db.commit()
    db.refresh(photo)

    return photo


@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: str,
    db: Session = Depends(get_db),
):
    """
    Delete a photo from an inventory item.

    Args:
        photo_id: Photo UUID
        db: Database session

    Returns:
        No content on success

    Raises:
        HTTPException: If photo not found
    """
    photo = db.query(InventoryPhoto).filter(
        InventoryPhoto.photo_id == photo_id
    ).first()

    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found",
        )

    db.delete(photo)
    db.commit()

    return None


@router.post("/{item_id}/photos/reorder", response_model=List[InventoryPhotoSchema])
async def reorder_photos(
    item_id: str,
    photo_orders: List[Dict[str, Any]],
    db: Session = Depends(get_db),
):
    """
    Reorder photos for an inventory item.

    Args:
        item_id: Inventory item UUID
        photo_orders: List of {photo_id, display_order} dictionaries
        db: Database session

    Returns:
        Updated list of photos

    Raises:
        HTTPException: If item or photos not found

    Example:
        POST /api/inventory/{item_id}/photos/reorder
        [
            {"photo_id": "photo-uuid-1", "display_order": 0},
            {"photo_id": "photo-uuid-2", "display_order": 1},
            {"photo_id": "photo-uuid-3", "display_order": 2}
        ]
    """
    # Verify item exists
    item = db.query(InventoryItem).filter(
        InventoryItem.inventory_item_id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found",
        )

    # Update display orders
    for photo_order in photo_orders:
        photo = db.query(InventoryPhoto).filter(
            InventoryPhoto.photo_id == photo_order['photo_id'],
            InventoryPhoto.inventory_item_id == item_id
        ).first()

        if photo:
            photo.display_order = photo_order['display_order']

    db.commit()

    # Return updated photos
    photos = db.query(InventoryPhoto).filter(
        InventoryPhoto.inventory_item_id == item_id
    ).order_by(InventoryPhoto.display_order).all()

    return photos
