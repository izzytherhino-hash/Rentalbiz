"""
Customer API endpoints.

Handles customer management:
- List all customers
- Get customer details
- Create new customer
- Update customer information
- Delete customer
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.database.models import Customer as CustomerModel
from backend.database.schemas import (
    Customer as CustomerSchema,
    CustomerCreate,
    CustomerUpdate,
)

router = APIRouter()


@router.get("/", response_model=List[CustomerSchema])
async def list_customers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """
    List all customers with pagination.

    Args:
        skip: Number of customers to skip
        limit: Maximum number of customers to return
        db: Database session

    Returns:
        List of customers

    Example:
        GET /api/customers?skip=0&limit=50
    """
    customers = db.query(CustomerModel).offset(skip).limit(limit).all()
    return customers


@router.get("/{customer_id}", response_model=CustomerSchema)
async def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a specific customer.

    Args:
        customer_id: Customer UUID
        db: Database session

    Returns:
        Customer details

    Raises:
        HTTPException: If customer not found
    """
    customer = db.query(CustomerModel).filter(
        CustomerModel.customer_id == customer_id
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    return customer


@router.post("/", response_model=CustomerSchema)
async def create_customer(
    customer_data: CustomerCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new customer.

    Args:
        customer_data: Customer information
        db: Database session

    Returns:
        Created customer

    Raises:
        HTTPException: If email already exists

    Example:
        POST /api/customers/
        {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "7145550100",
            "address": "123 Main St, Costa Mesa, CA 92626",
            "address_lat": 33.6411,
            "address_lng": -117.9187
        }
    """
    # Check if email already exists
    existing_customer = db.query(CustomerModel).filter(
        CustomerModel.email == customer_data.email
    ).first()

    if existing_customer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer with this email already exists",
        )

    # Create new customer
    customer = CustomerModel(**customer_data.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)

    return customer


@router.put("/{customer_id}", response_model=CustomerSchema)
async def update_customer(
    customer_id: str,
    customer_data: CustomerUpdate,
    db: Session = Depends(get_db),
):
    """
    Update customer information.

    Args:
        customer_id: Customer UUID
        customer_data: Fields to update
        db: Database session

    Returns:
        Updated customer

    Raises:
        HTTPException: If customer not found or email already exists
    """
    customer = db.query(CustomerModel).filter(
        CustomerModel.customer_id == customer_id
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    # Check email uniqueness if email is being updated
    if customer_data.email and customer_data.email != customer.email:
        existing_customer = db.query(CustomerModel).filter(
            CustomerModel.email == customer_data.email
        ).first()

        if existing_customer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Customer with this email already exists",
            )

    # Update fields
    update_dict = customer_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)

    return customer


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: str,
    db: Session = Depends(get_db),
):
    """
    Delete a customer.

    Args:
        customer_id: Customer UUID
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException: If customer not found or has active bookings
    """
    customer = db.query(CustomerModel).filter(
        CustomerModel.customer_id == customer_id
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    # Check if customer has bookings
    if customer.bookings and len(customer.bookings) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete customer with existing bookings",
        )

    db.delete(customer)
    db.commit()

    return {"message": "Customer deleted successfully"}
