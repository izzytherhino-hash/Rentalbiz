"""
Phineas AI Operations Manager API.

Handles Phineas's autonomous action proposals for:
- Driver assignment optimization
- Inventory management
- Customer communications
- Operational insights

Implements supervised AI workflow: propose → review → approve/reject → execute
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, UTC
from decimal import Decimal
import json
from uuid import uuid4

from backend.database import get_db
from backend.database.models import (
    Booking,
    Driver,
    PhineasProposal,
    ProposalStatus,
    ProposalType,
)
from pydantic import BaseModel, Field

router = APIRouter()


# Pydantic schemas for request/response
class ProposalResponse(BaseModel):
    """Response schema for a Phineas proposal."""
    proposal_id: str
    proposal_type: str
    status: str
    title: str
    description: str
    reasoning: str
    confidence_score: float
    action_data: dict
    booking_id: Optional[str] = None
    driver_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ExecuteProposalRequest(BaseModel):
    """Request schema for executing a proposal."""
    proposal_id: str


class ExecuteProposalResponse(BaseModel):
    """Response schema for proposal execution."""
    success: bool
    proposal_id: str
    message: str
    execution_result: Optional[dict] = None


@router.post("/scan-assignments")
async def scan_driver_assignments(db: Session = Depends(get_db)):
    """
    Scan for unassigned bookings and create driver assignment proposals.

    Phineas analyzes all unassigned trips (delivery/pickup) and recommends the best
    driver for each based on route optimization, availability, and performance.

    Returns:
        dict: Summary of created proposals

    Example:
        POST /api/admin/phineas/scan-assignments
        Response: {
            "success": true,
            "proposals_created": 3,
            "proposals": [...]
        }
    """
    from backend.database.models import BookingStatus
    from services.route_optimizer import recommend_drivers

    # Get all unassigned trips
    bookings = (
        db.query(Booking)
        .options(
            joinedload(Booking.customer),
            joinedload(Booking.booking_items)
        )
        .filter(Booking.status.notin_([
            BookingStatus.CANCELLED.value,
            BookingStatus.COMPLETED.value
        ]))
        .all()
    )

    # Get all drivers for recommendations
    drivers = db.query(Driver).all()
    drivers_dict = [
        {
            "id": d.driver_id,
            "name": d.name,
            "is_active": d.is_active
        }
        for d in drivers
    ]

    all_bookings_dict = [
        {
            "id": b.booking_id,
            "delivery_date": str(b.delivery_date),
            "pickup_date": str(b.pickup_date),
            "delivery_address": b.delivery_address,
            "delivery_lat": float(b.delivery_lat) if b.delivery_lat else None,
            "delivery_lng": float(b.delivery_lng) if b.delivery_lng else None,
            "delivery_driver_id": b.assigned_driver_id,
            "pickup_driver_id": b.pickup_driver_id
        }
        for b in bookings
    ]

    proposals_created = []

    # Analyze each unassigned trip
    for booking in bookings:
        # Check delivery assignment
        if booking.assigned_driver_id is None:
            # Get driver recommendations
            new_booking_dict = {
                "id": booking.booking_id,
                "delivery_date": str(booking.delivery_date),
                "pickup_date": str(booking.pickup_date),
                "delivery_address": booking.delivery_address,
                "delivery_lat": float(booking.delivery_lat) if booking.delivery_lat else None,
                "delivery_lng": float(booking.delivery_lng) if booking.delivery_lng else None
            }

            recommendations = recommend_drivers(
                drivers_dict,
                all_bookings_dict,
                new_booking_dict,
                max_recommendations=3
            )

            if recommendations:
                # Take the best recommendation
                best_rec = recommendations[0]

                # Check if we already have a pending proposal for this booking
                existing = (
                    db.query(PhineasProposal)
                    .filter(
                        PhineasProposal.booking_id == booking.booking_id,
                        PhineasProposal.proposal_type == ProposalType.DRIVER_ASSIGNMENT.value,
                        PhineasProposal.status == ProposalStatus.PENDING.value
                    )
                    .filter(PhineasProposal.action_data.contains('"trip_type": "delivery"'))
                    .first()
                )

                if not existing:
                    # Create proposal
                    proposal = PhineasProposal(
                        proposal_id=str(uuid4()),
                        proposal_type=ProposalType.DRIVER_ASSIGNMENT.value,
                        status=ProposalStatus.PENDING.value,
                        title=f"Assign {best_rec.driver_name} to delivery for {booking.order_number}",
                        description=f"Assign driver {best_rec.driver_name} for delivery to {booking.delivery_address} on {booking.delivery_date}",
                        reasoning=best_rec.reason,
                        confidence_score=Decimal(str(min(best_rec.score / 10.0, 1.0))),  # Normalize score to 0-1
                        action_data=json.dumps({
                            "booking_id": booking.booking_id,
                            "driver_id": best_rec.driver_id,
                            "trip_type": "delivery",
                            "order_number": booking.order_number,
                            "customer_name": booking.customer.name,
                            "delivery_address": booking.delivery_address,
                            "delivery_date": str(booking.delivery_date),
                            "driver_name": best_rec.driver_name,
                            "score": best_rec.score,
                            "distance": best_rec.distance_to_delivery
                        }),
                        booking_id=booking.booking_id,
                        driver_id=best_rec.driver_id
                    )
                    db.add(proposal)
                    proposals_created.append(proposal)

        # Check pickup assignment
        if booking.pickup_driver_id is None:
            # Get driver recommendations
            new_booking_dict = {
                "id": booking.booking_id,
                "delivery_date": str(booking.delivery_date),
                "pickup_date": str(booking.pickup_date),
                "delivery_address": booking.delivery_address,
                "delivery_lat": float(booking.delivery_lat) if booking.delivery_lat else None,
                "delivery_lng": float(booking.delivery_lng) if booking.delivery_lng else None
            }

            recommendations = recommend_drivers(
                drivers_dict,
                all_bookings_dict,
                new_booking_dict,
                max_recommendations=3
            )

            if recommendations:
                # Take the best recommendation
                best_rec = recommendations[0]

                # Check if we already have a pending proposal for this booking
                existing = (
                    db.query(PhineasProposal)
                    .filter(
                        PhineasProposal.booking_id == booking.booking_id,
                        PhineasProposal.proposal_type == ProposalType.DRIVER_ASSIGNMENT.value,
                        PhineasProposal.status == ProposalStatus.PENDING.value
                    )
                    .filter(PhineasProposal.action_data.contains('"trip_type": "pickup"'))
                    .first()
                )

                if not existing:
                    # Create proposal
                    proposal = PhineasProposal(
                        proposal_id=str(uuid4()),
                        proposal_type=ProposalType.DRIVER_ASSIGNMENT.value,
                        status=ProposalStatus.PENDING.value,
                        title=f"Assign {best_rec.driver_name} to pickup for {booking.order_number}",
                        description=f"Assign driver {best_rec.driver_name} for pickup from {booking.delivery_address} on {booking.pickup_date}",
                        reasoning=best_rec.reason,
                        confidence_score=Decimal(str(min(best_rec.score / 10.0, 1.0))),  # Normalize score to 0-1
                        action_data=json.dumps({
                            "booking_id": booking.booking_id,
                            "driver_id": best_rec.driver_id,
                            "trip_type": "pickup",
                            "order_number": booking.order_number,
                            "customer_name": booking.customer.name,
                            "delivery_address": booking.delivery_address,
                            "pickup_date": str(booking.pickup_date) if booking.pickup_date else None,
                            "driver_name": best_rec.driver_name,
                            "score": best_rec.score,
                            "distance": best_rec.distance_to_delivery
                        }),
                        booking_id=booking.booking_id,
                        driver_id=best_rec.driver_id
                    )
                    db.add(proposal)
                    proposals_created.append(proposal)

    db.commit()

    # Refresh proposals to get all fields
    for proposal in proposals_created:
        db.refresh(proposal)

    return {
        "success": True,
        "message": f"Created {len(proposals_created)} new driver assignment proposals",
        "proposals_created": len(proposals_created),
        "proposals": [
            {
                "proposal_id": p.proposal_id,
                "title": p.title,
                "description": p.description,
                "confidence_score": float(p.confidence_score),
                "action_data": json.loads(p.action_data)
            }
            for p in proposals_created
        ]
    }


@router.post("/execute-assignment", response_model=ExecuteProposalResponse)
async def execute_driver_assignment(
    request: ExecuteProposalRequest,
    db: Session = Depends(get_db)
):
    """
    Execute an approved driver assignment proposal.

    Assigns the recommended driver to the booking and marks the proposal as executed.

    Args:
        request: Proposal ID to execute
        db: Database session

    Returns:
        Execution result

    Raises:
        HTTPException: If proposal not found or not approved

    Example:
        POST /api/admin/phineas/execute-assignment
        {
            "proposal_id": "abc-123"
        }
    """
    # Get the proposal
    proposal = (
        db.query(PhineasProposal)
        .filter(PhineasProposal.proposal_id == request.proposal_id)
        .first()
    )

    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found"
        )

    if proposal.status != ProposalStatus.APPROVED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Proposal must be approved before execution. Current status: {proposal.status}"
        )

    # Parse action data
    action_data = json.loads(proposal.action_data)
    booking_id = action_data.get("booking_id")
    driver_id = action_data.get("driver_id")
    trip_type = action_data.get("trip_type")

    if not all([booking_id, driver_id, trip_type]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action data: missing required fields"
        )

    # Get the booking
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    # Get the driver
    driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found"
        )

    try:
        # Execute the assignment
        if trip_type == "delivery":
            booking.assigned_driver_id = driver_id
        elif trip_type == "pickup":
            booking.pickup_driver_id = driver_id
        else:
            raise ValueError(f"Invalid trip type: {trip_type}")

        # Update proposal status
        proposal.status = ProposalStatus.EXECUTED.value
        proposal.executed_at = datetime.now(UTC)
        proposal.execution_result = json.dumps({
            "success": True,
            "booking_id": booking_id,
            "driver_id": driver_id,
            "trip_type": trip_type,
            "executed_at": datetime.now(UTC).isoformat()
        })

        db.commit()

        return ExecuteProposalResponse(
            success=True,
            proposal_id=proposal.proposal_id,
            message=f"Successfully assigned {driver.name} to {trip_type} for booking {booking.order_number}",
            execution_result={
                "booking_id": booking_id,
                "order_number": booking.order_number,
                "driver_id": driver_id,
                "driver_name": driver.name,
                "trip_type": trip_type
            }
        )

    except Exception as e:
        # Update proposal with error
        proposal.status = ProposalStatus.FAILED.value
        proposal.error_message = str(e)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute proposal: {str(e)}"
        )


@router.get("/proposals", response_model=List[ProposalResponse])
async def get_proposals(
    status_filter: Optional[str] = None,
    proposal_type: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get list of Phineas proposals with optional filters.

    Args:
        status_filter: Filter by status (pending, approved, rejected, executed, failed)
        proposal_type: Filter by type (driver_assignment, inventory_organization, etc.)
        limit: Maximum number of proposals to return
        db: Database session

    Returns:
        List of proposals

    Example:
        GET /api/admin/phineas/proposals?status_filter=pending&limit=10
    """
    query = db.query(PhineasProposal)

    if status_filter:
        query = query.filter(PhineasProposal.status == status_filter)

    if proposal_type:
        query = query.filter(PhineasProposal.proposal_type == proposal_type)

    proposals = (
        query
        .order_by(PhineasProposal.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        ProposalResponse(
            proposal_id=p.proposal_id,
            proposal_type=p.proposal_type,
            status=p.status,
            title=p.title,
            description=p.description,
            reasoning=p.reasoning,
            confidence_score=float(p.confidence_score),
            action_data=json.loads(p.action_data),
            booking_id=p.booking_id,
            driver_id=p.driver_id,
            created_at=p.created_at
        )
        for p in proposals
    ]


@router.patch("/proposals/{proposal_id}/approve")
async def approve_proposal(proposal_id: str, db: Session = Depends(get_db)):
    """
    Approve a pending proposal.

    Args:
        proposal_id: Proposal UUID
        db: Database session

    Returns:
        Updated proposal

    Raises:
        HTTPException: If proposal not found or not pending

    Example:
        PATCH /api/admin/phineas/proposals/{proposal_id}/approve
    """
    proposal = (
        db.query(PhineasProposal)
        .filter(PhineasProposal.proposal_id == proposal_id)
        .first()
    )

    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found"
        )

    if proposal.status != ProposalStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only approve pending proposals. Current status: {proposal.status}"
        )

    proposal.status = ProposalStatus.APPROVED.value
    proposal.approved_at = datetime.now(UTC)

    db.commit()
    db.refresh(proposal)

    return {
        "success": True,
        "proposal_id": proposal.proposal_id,
        "status": proposal.status,
        "message": "Proposal approved"
    }


@router.patch("/proposals/{proposal_id}/reject")
async def reject_proposal(proposal_id: str, db: Session = Depends(get_db)):
    """
    Reject a pending proposal.

    Args:
        proposal_id: Proposal UUID
        db: Database session

    Returns:
        Updated proposal

    Raises:
        HTTPException: If proposal not found or not pending

    Example:
        PATCH /api/admin/phineas/proposals/{proposal_id}/reject
    """
    proposal = (
        db.query(PhineasProposal)
        .filter(PhineasProposal.proposal_id == proposal_id)
        .first()
    )

    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found"
        )

    if proposal.status != ProposalStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only reject pending proposals. Current status: {proposal.status}"
        )

    proposal.status = ProposalStatus.REJECTED.value

    db.commit()
    db.refresh(proposal)

    return {
        "success": True,
        "proposal_id": proposal.proposal_id,
        "status": proposal.status,
        "message": "Proposal rejected"
    }
