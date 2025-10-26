"""
Warehouse API endpoints.

Handles warehouse management operations:
- List all warehouses
- Get warehouse details
- Create/Update warehouses (admin only)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.database.models import Warehouse as WarehouseModel
from backend.database.schemas import (
    Warehouse as WarehouseSchema,
    WarehouseCreate,
    WarehouseUpdate,
)

router = APIRouter()


@router.get("/", response_model=List[WarehouseSchema])
async def list_warehouses(
    is_active: bool = None,
    db: Session = Depends(get_db),
):
    """
    List all warehouses.

    Args:
        is_active: Filter by active status
        db: Database session

    Returns:
        List of warehouses with locations

    Example:
        GET /api/warehouses/
        GET /api/warehouses/?is_active=true
    """
    query = db.query(WarehouseModel)

    if is_active is not None:
        query = query.filter(WarehouseModel.is_active == is_active)

    warehouses = query.all()
    return warehouses


@router.get("/{warehouse_id}", response_model=WarehouseSchema)
async def get_warehouse(
    warehouse_id: str,
    db: Session = Depends(get_db),
):
    """
    Get warehouse details.

    Args:
        warehouse_id: Warehouse UUID
        db: Database session

    Returns:
        Warehouse information

    Raises:
        HTTPException: If warehouse not found
    """
    warehouse = (
        db.query(WarehouseModel)
        .filter(WarehouseModel.warehouse_id == warehouse_id)
        .first()
    )

    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Warehouse not found",
        )

    return warehouse
