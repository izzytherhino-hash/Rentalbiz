"""
Partner Management API endpoints.

Handles partner and warehouse location operations:
- CRUD operations for rental partners
- Nested CRUD for partner warehouse locations
- Partner status management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, UTC

from backend.database import get_db
from backend.database.models import Partner, WarehouseLocation
from backend.database.schemas import (
    Partner as PartnerSchema,
    PartnerCreate,
    PartnerUpdate,
    WarehouseLocation as WarehouseLocationSchema,
    WarehouseLocationCreate,
    WarehouseLocationUpdate,
)

router = APIRouter()


# ============================================================================
# PARTNER CRUD ENDPOINTS
# ============================================================================


@router.post("/", response_model=PartnerSchema, status_code=status.HTTP_201_CREATED)
async def create_partner(
    partner_data: PartnerCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new rental partner.

    Args:
        partner_data: Partner details including name, contact info, and settings
        db: Database session

    Returns:
        Created partner with generated ID and timestamps

    Example:
        POST /api/partners
        {
            "name": "Create A Party Rentals",
            "contact_person": "John Smith",
            "email": "john@createaparty.com",
            "phone": "5551234567",
            "status": "active",
            "website_url": "https://createaparty.com",
            "commission_rate": 15.0,
            "markup_percentage": 25.0,
            "integration_type": "scraper"
        }
    """
    partner = Partner(**partner_data.model_dump())
    db.add(partner)
    db.commit()
    db.refresh(partner)
    return partner


@router.get("/", response_model=List[PartnerSchema])
async def list_partners(
    status: Optional[str] = None,
    integration_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    List all rental partners with optional filters.

    Args:
        status: Filter by partner status (active, prospecting, paused, etc.)
        integration_type: Filter by integration type (manual, scraper, api)
        db: Database session

    Returns:
        List of partners matching the filters

    Example:
        GET /api/partners?status=active&integration_type=scraper
    """
    query = db.query(Partner)

    if status:
        query = query.filter(Partner.status == status)

    if integration_type:
        query = query.filter(Partner.integration_type == integration_type)

    partners = query.order_by(Partner.name).all()
    return partners


@router.get("/{partner_id}", response_model=PartnerSchema)
async def get_partner(
    partner_id: str,
    db: Session = Depends(get_db),
):
    """
    Get a single partner by ID.

    Args:
        partner_id: Partner UUID
        db: Database session

    Returns:
        Partner details

    Raises:
        HTTPException 404: Partner not found

    Example:
        GET /api/partners/550e8400-e29b-41d4-a716-446655440000
    """
    partner = db.query(Partner).filter(Partner.partner_id == partner_id).first()

    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Partner {partner_id} not found",
        )

    return partner


@router.put("/{partner_id}", response_model=PartnerSchema)
async def update_partner(
    partner_id: str,
    partner_data: PartnerUpdate,
    db: Session = Depends(get_db),
):
    """
    Update a partner's information.

    Args:
        partner_id: Partner UUID
        partner_data: Fields to update (all optional)
        db: Database session

    Returns:
        Updated partner

    Raises:
        HTTPException 404: Partner not found

    Example:
        PUT /api/partners/550e8400-e29b-41d4-a716-446655440000
        {
            "status": "active",
            "commission_rate": 18.0,
            "notes": "Increased commission rate after negotiation"
        }
    """
    partner = db.query(Partner).filter(Partner.partner_id == partner_id).first()

    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Partner {partner_id} not found",
        )

    # Update only provided fields
    update_data = partner_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(partner, field, value)

    partner.updated_at = datetime.now(UTC)

    db.commit()
    db.refresh(partner)

    return partner


@router.delete("/{partner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_partner(
    partner_id: str,
    db: Session = Depends(get_db),
):
    """
    Delete a partner.

    This will also cascade delete all associated warehouse locations
    and inventory items.

    Args:
        partner_id: Partner UUID
        db: Database session

    Raises:
        HTTPException 404: Partner not found

    Example:
        DELETE /api/partners/550e8400-e29b-41d4-a716-446655440000
    """
    partner = db.query(Partner).filter(Partner.partner_id == partner_id).first()

    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Partner {partner_id} not found",
        )

    db.delete(partner)
    db.commit()


# ============================================================================
# WAREHOUSE LOCATION CRUD ENDPOINTS (Nested under Partner)
# ============================================================================


@router.post(
    "/{partner_id}/locations",
    response_model=WarehouseLocationSchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_warehouse_location(
    partner_id: str,
    location_data: WarehouseLocationCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new warehouse location for a partner.

    Args:
        partner_id: Partner UUID
        location_data: Location details including address and service area
        db: Database session

    Returns:
        Created warehouse location

    Raises:
        HTTPException 404: Partner not found
        HTTPException 400: Partner ID mismatch

    Example:
        POST /api/partners/550e8400-e29b-41d4-a716-446655440000/locations
        {
            "partner_id": "550e8400-e29b-41d4-a716-446655440000",
            "location_name": "Main Warehouse",
            "address": "123 Main St, Los Angeles, CA 90001",
            "address_lat": 34.0522,
            "address_lng": -118.2437,
            "service_area_radius_miles": 25.0,
            "service_area_cities": ["Los Angeles", "Santa Monica", "Pasadena"],
            "contact_person": "Jane Doe",
            "contact_phone": "5551234567",
            "contact_email": "warehouse@createaparty.com"
        }
    """
    # Verify partner exists
    partner = db.query(Partner).filter(Partner.partner_id == partner_id).first()
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Partner {partner_id} not found",
        )

    # Verify partner_id in request matches URL parameter
    if location_data.partner_id != partner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Partner ID in request body does not match URL parameter",
        )

    location = WarehouseLocation(**location_data.model_dump())
    db.add(location)
    db.commit()
    db.refresh(location)

    return location


@router.get("/{partner_id}/locations", response_model=List[WarehouseLocationSchema])
async def list_warehouse_locations(
    partner_id: str,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """
    List all warehouse locations for a partner.

    Args:
        partner_id: Partner UUID
        is_active: Filter by active status
        db: Database session

    Returns:
        List of warehouse locations for the partner

    Raises:
        HTTPException 404: Partner not found

    Example:
        GET /api/partners/550e8400-e29b-41d4-a716-446655440000/locations?is_active=true
    """
    # Verify partner exists
    partner = db.query(Partner).filter(Partner.partner_id == partner_id).first()
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Partner {partner_id} not found",
        )

    query = db.query(WarehouseLocation).filter(
        WarehouseLocation.partner_id == partner_id
    )

    if is_active is not None:
        query = query.filter(WarehouseLocation.is_active == is_active)

    locations = query.order_by(WarehouseLocation.location_name).all()
    return locations


@router.get(
    "/{partner_id}/locations/{location_id}",
    response_model=WarehouseLocationSchema,
)
async def get_warehouse_location(
    partner_id: str,
    location_id: str,
    db: Session = Depends(get_db),
):
    """
    Get a single warehouse location.

    Args:
        partner_id: Partner UUID
        location_id: Location UUID
        db: Database session

    Returns:
        Warehouse location details

    Raises:
        HTTPException 404: Partner or location not found

    Example:
        GET /api/partners/550e8400-e29b-41d4-a716-446655440000/locations/660e8400-e29b-41d4-a716-446655440000
    """
    # Verify partner exists
    partner = db.query(Partner).filter(Partner.partner_id == partner_id).first()
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Partner {partner_id} not found",
        )

    location = (
        db.query(WarehouseLocation)
        .filter(
            WarehouseLocation.location_id == location_id,
            WarehouseLocation.partner_id == partner_id,
        )
        .first()
    )

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found for partner {partner_id}",
        )

    return location


@router.put(
    "/{partner_id}/locations/{location_id}",
    response_model=WarehouseLocationSchema,
)
async def update_warehouse_location(
    partner_id: str,
    location_id: str,
    location_data: WarehouseLocationUpdate,
    db: Session = Depends(get_db),
):
    """
    Update a warehouse location.

    Args:
        partner_id: Partner UUID
        location_id: Location UUID
        location_data: Fields to update (all optional)
        db: Database session

    Returns:
        Updated warehouse location

    Raises:
        HTTPException 404: Partner or location not found

    Example:
        PUT /api/partners/550e8400-e29b-41d4-a716-446655440000/locations/660e8400-e29b-41d4-a716-446655440000
        {
            "service_area_radius_miles": 30.0,
            "is_active": true,
            "notes": "Expanded service area to cover more cities"
        }
    """
    # Verify partner exists
    partner = db.query(Partner).filter(Partner.partner_id == partner_id).first()
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Partner {partner_id} not found",
        )

    location = (
        db.query(WarehouseLocation)
        .filter(
            WarehouseLocation.location_id == location_id,
            WarehouseLocation.partner_id == partner_id,
        )
        .first()
    )

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found for partner {partner_id}",
        )

    # Update only provided fields
    update_data = location_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(location, field, value)

    db.commit()
    db.refresh(location)

    return location


@router.delete(
    "/{partner_id}/locations/{location_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_warehouse_location(
    partner_id: str,
    location_id: str,
    db: Session = Depends(get_db),
):
    """
    Delete a warehouse location.

    This will also cascade delete associated inventory items.

    Args:
        partner_id: Partner UUID
        location_id: Location UUID
        db: Database session

    Raises:
        HTTPException 404: Partner or location not found

    Example:
        DELETE /api/partners/550e8400-e29b-41d4-a716-446655440000/locations/660e8400-e29b-41d4-a716-446655440000
    """
    # Verify partner exists
    partner = db.query(Partner).filter(Partner.partner_id == partner_id).first()
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Partner {partner_id} not found",
        )

    location = (
        db.query(WarehouseLocation)
        .filter(
            WarehouseLocation.location_id == location_id,
            WarehouseLocation.partner_id == partner_id,
        )
        .first()
    )

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found for partner {partner_id}",
        )

    db.delete(location)
    db.commit()
