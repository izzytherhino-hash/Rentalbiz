"""
Inventory Sync API endpoints.

Handles partner inventory synchronization operations:
- Trigger inventory syncs from partner websites
- View sync logs and history
- Manage sync operations
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, UTC
from decimal import Decimal
import logging

from backend.database import get_db
from backend.database.models import (
    Partner,
    WarehouseLocation,
    InventoryItem,
    InventorySyncLog,
    OwnershipType,
    SyncStatus,
    IntegrationType,
)
from backend.database.schemas import (
    InventorySyncLog as InventorySyncLogSchema,
)
from backend.scrapers import CreateAPartyScraper
from backend.scrapers.scraper_models import ScrapeResult

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# INVENTORY SYNC ENDPOINTS
# ============================================================================


@router.post("/sync/{partner_id}", response_model=InventorySyncLogSchema)
async def sync_partner_inventory(
    partner_id: str,
    warehouse_location_id: Optional[str] = None,
    apply_markup: bool = True,
    db: Session = Depends(get_db),
):
    """
    Trigger inventory sync for a partner.

    Scrapes the partner's website and imports products into the inventory table.
    Creates an InventorySyncLog to track the operation.

    Args:
        partner_id: Partner UUID
        warehouse_location_id: Optional specific warehouse location to associate items
        apply_markup: Whether to apply partner markup to pricing (default: True)
        db: Database session

    Returns:
        InventorySyncLog with sync results

    Raises:
        HTTPException 404: Partner not found
        HTTPException 400: Partner integration type not supported

    Example:
        POST /api/inventory/sync/550e8400-e29b-41d4-a716-446655440000
    """
    # Verify partner exists
    partner = db.query(Partner).filter(Partner.partner_id == partner_id).first()
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Partner {partner_id} not found",
        )

    # Verify warehouse location if provided
    if warehouse_location_id:
        location = (
            db.query(WarehouseLocation)
            .filter(
                WarehouseLocation.location_id == warehouse_location_id,
                WarehouseLocation.partner_id == partner_id,
            )
            .first()
        )
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Warehouse location {warehouse_location_id} not found for partner {partner_id}",
            )

    # Create sync log
    sync_log = InventorySyncLog(
        partner_id=partner_id,
        warehouse_location_id=warehouse_location_id,
        sync_type=partner.integration_type,
        sync_started_at=datetime.now(UTC),
    )
    db.add(sync_log)
    db.flush()  # Get sync_log_id

    try:
        # Determine which scraper to use based on partner
        scraper = _get_scraper_for_partner(partner)

        if not scraper:
            sync_log.status = SyncStatus.FAILED.value
            sync_log.error_message = f"No scraper available for partner integration type: {partner.integration_type}"
            sync_log.sync_completed_at = datetime.now(UTC)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=sync_log.error_message,
            )

        # Run the scraper
        logger.info(f"Starting inventory sync for partner {partner.name} ({partner_id})")
        scrape_result: ScrapeResult = scraper.scrape()

        if not scrape_result.success:
            sync_log.status = SyncStatus.FAILED.value
            sync_log.error_message = "; ".join(scrape_result.errors)
            sync_log.sync_completed_at = datetime.now(UTC)
            db.commit()
            db.refresh(sync_log)
            return sync_log

        # Import scraped products into inventory
        items_added, items_updated = _import_scraped_products(
            db=db,
            partner=partner,
            warehouse_location_id=warehouse_location_id,
            scrape_result=scrape_result,
            apply_markup=apply_markup,
        )

        # Update sync log with results
        sync_log.items_added = items_added
        sync_log.items_updated = items_updated
        sync_log.status = (
            SyncStatus.SUCCESS.value
            if not scrape_result.errors
            else SyncStatus.PARTIAL.value
        )
        sync_log.error_message = (
            "; ".join(scrape_result.errors) if scrape_result.errors else None
        )
        sync_log.sync_completed_at = datetime.now(UTC)

        # Update partner's last_sync_at timestamp
        partner.last_sync_at = datetime.now(UTC)

        db.commit()
        db.refresh(sync_log)

        logger.info(
            f"Inventory sync completed for {partner.name}: "
            f"{items_added} added, {items_updated} updated"
        )

        return sync_log

    except Exception as e:
        # Log the error and mark sync as failed
        logger.exception(f"Failed to sync inventory for partner {partner_id}: {str(e)}")
        sync_log.status = SyncStatus.FAILED.value
        sync_log.error_message = str(e)
        sync_log.sync_completed_at = datetime.now(UTC)
        db.commit()
        db.refresh(sync_log)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inventory sync failed: {str(e)}",
        )


@router.get("/sync/logs", response_model=List[InventorySyncLogSchema])
async def list_sync_logs(
    partner_id: Optional[str] = None,
    warehouse_location_id: Optional[str] = None,
    sync_status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """
    List inventory sync logs with optional filters.

    Args:
        partner_id: Filter by partner
        warehouse_location_id: Filter by warehouse location
        sync_status: Filter by sync status (success, failed, partial)
        limit: Maximum number of logs to return (default: 50)
        db: Database session

    Returns:
        List of sync logs ordered by most recent first

    Example:
        GET /api/inventory/sync/logs?partner_id=550e8400-e29b-41d4-a716-446655440000&sync_status=success
    """
    query = db.query(InventorySyncLog)

    if partner_id:
        query = query.filter(InventorySyncLog.partner_id == partner_id)

    if warehouse_location_id:
        query = query.filter(
            InventorySyncLog.warehouse_location_id == warehouse_location_id
        )

    if sync_status:
        query = query.filter(InventorySyncLog.status == sync_status)

    logs = query.order_by(InventorySyncLog.sync_started_at.desc()).limit(limit).all()

    return logs


@router.get("/sync/logs/{sync_log_id}", response_model=InventorySyncLogSchema)
async def get_sync_log(
    sync_log_id: str,
    db: Session = Depends(get_db),
):
    """
    Get details of a specific sync log.

    Args:
        sync_log_id: Sync log UUID
        db: Database session

    Returns:
        Sync log details

    Raises:
        HTTPException 404: Sync log not found

    Example:
        GET /api/inventory/sync/logs/660e8400-e29b-41d4-a716-446655440000
    """
    sync_log = (
        db.query(InventorySyncLog)
        .filter(InventorySyncLog.sync_log_id == sync_log_id)
        .first()
    )

    if not sync_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sync log {sync_log_id} not found",
        )

    return sync_log


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def _get_scraper_for_partner(partner: Partner):
    """
    Get the appropriate scraper instance for a partner.

    Args:
        partner: Partner model instance

    Returns:
        Scraper instance or None if no scraper available
    """
    # For now, we only support Create A Party scraper
    # In the future, this can be extended with a registry or factory pattern
    if partner.integration_type == IntegrationType.WEB_SCRAPING.value:
        if partner.website_url and "createaparty.com" in partner.website_url.lower():
            return CreateAPartyScraper()

    return None


def _map_category(category: Optional[str]) -> str:
    """
    Map scraped categories to standardized internal categories.

    Args:
        category: Category from scraped data

    Returns:
        Mapped category name
    """
    if not category:
        return "Uncategorized"

    # Normalize category for comparison (lowercase, strip whitespace)
    normalized = category.lower().strip()

    # Category mapping rules
    category_map = {
        "bounce house": "Poufs and Pillows",
        "bounce houses": "Poufs and Pillows",
        "tents": "Marquee Lights",
        "tent": "Marquee Lights",
        "tents and canopies": "Marquee Lights",
        "tents & canopies": "Marquee Lights",  # Handle ampersand version from scraper
        "tent and canopy": "Marquee Lights",
        "tent & canopy": "Marquee Lights",  # Handle ampersand version
        "canopies": "Marquee Lights",
        "canopy": "Marquee Lights",
    }

    # Return mapped category or original if no mapping exists
    return category_map.get(normalized, category)


def _import_scraped_products(
    db: Session,
    partner: Partner,
    warehouse_location_id: Optional[str],
    scrape_result: ScrapeResult,
    apply_markup: bool,
) -> tuple[int, int]:
    """
    Import scraped products into the inventory table.

    Args:
        db: Database session
        partner: Partner model instance
        warehouse_location_id: Optional warehouse location ID
        scrape_result: Scrape result with products
        apply_markup: Whether to apply partner markup to pricing

    Returns:
        Tuple of (items_added, items_updated)
    """
    items_added = 0
    items_updated = 0

    # Get default warehouse for partner inventory (use first warehouse or create one)
    default_warehouse_id = _get_or_create_default_warehouse(db)

    for scraped_product in scrape_result.products:
        try:
            # Calculate pricing - no markup applied (will be handled later)
            partner_cost = scraped_product.price or Decimal("0.00")
            customer_price = partner_cost

            # Check if product already exists for this partner (by name matching)
            existing_item = (
                db.query(InventoryItem)
                .filter(
                    InventoryItem.partner_id == partner.partner_id,
                    InventoryItem.name == scraped_product.name,
                )
                .first()
            )

            if existing_item:
                # Update existing item
                existing_item.partner_cost = partner_cost
                existing_item.customer_price = customer_price
                existing_item.image_url = scraped_product.image_url
                existing_item.partner_product_url = scraped_product.product_url
                # Apply category mapping when updating
                existing_item.category = _map_category(
                    scraped_product.category or existing_item.category
                )
                existing_item.last_synced_at = datetime.now(UTC)
                items_updated += 1
            else:
                # Create new item with mapped category
                new_item = InventoryItem(
                    name=scraped_product.name,
                    category=_map_category(scraped_product.category),
                    description=scraped_product.description,
                    base_price=customer_price,  # Set base_price to customer price
                    image_url=scraped_product.image_url,
                    website_visible=True,
                    ownership_type=OwnershipType.PARTNER_INVENTORY.value,
                    partner_id=partner.partner_id,
                    warehouse_location_id=warehouse_location_id,
                    partner_cost=partner_cost,
                    customer_price=customer_price,
                    partner_product_url=scraped_product.product_url,
                    last_synced_at=datetime.now(UTC),
                    default_warehouse_id=default_warehouse_id,
                    current_warehouse_id=default_warehouse_id,
                )
                db.add(new_item)
                items_added += 1

        except Exception as e:
            logger.warning(
                f"Failed to import product '{scraped_product.name}': {str(e)}"
            )
            continue

    db.flush()

    return items_added, items_updated


def _get_or_create_default_warehouse(db: Session) -> str:
    """
    Get or create a default warehouse for partner inventory.

    Args:
        db: Database session

    Returns:
        Warehouse ID
    """
    from backend.database.models import Warehouse

    # Try to find existing partner inventory warehouse
    warehouse = (
        db.query(Warehouse)
        .filter(Warehouse.name == "Partner Inventory")
        .first()
    )

    if warehouse:
        return warehouse.warehouse_id

    # Create default warehouse for partner inventory
    warehouse = Warehouse(
        name="Partner Inventory",
        address="Various Partner Locations",
        address_lat=Decimal("34.0522"),  # Default to LA coordinates
        address_lng=Decimal("-118.2437"),
        is_active=True,
    )
    db.add(warehouse)
    db.flush()

    return warehouse.warehouse_id
