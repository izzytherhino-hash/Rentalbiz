"""
Route Optimization API endpoints.

Provides intelligent routing for delivery drivers based on:
- Geographic clustering
- Time windows
- Driver capacity
- Warehouse locations
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Dict, Any
from datetime import date, datetime
from decimal import Decimal
import math

from backend.database import get_db
from backend.database.models import Booking, BookingStatus, Driver, Warehouse
from pydantic import BaseModel

router = APIRouter()


class RouteStop(BaseModel):
    """A stop on a delivery route."""
    booking_id: str
    order_number: str
    address: str
    latitude: float | None
    longitude: float | None
    time_window: str | None
    customer_name: str
    delivery_type: str  # 'delivery' or 'pickup'


class OptimizedRoute(BaseModel):
    """An optimized route for a driver."""
    driver_id: str | None
    driver_name: str | None
    total_stops: int
    total_distance_km: float
    estimated_duration_hours: float
    stops: List[RouteStop]
    warehouse_start: str
    warehouse_end: str


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula.

    Returns distance in kilometers.
    """
    R = 6371  # Earth's radius in kilometers

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def nearest_neighbor_route(
    stops: List[Dict[str, Any]],
    start_lat: float,
    start_lon: float
) -> List[Dict[str, Any]]:
    """
    Optimize route using nearest neighbor algorithm.

    Simple but effective greedy algorithm that visits the nearest
    unvisited stop from the current position.
    """
    if not stops:
        return []

    optimized = []
    remaining = stops.copy()
    current_lat, current_lon = start_lat, start_lon

    while remaining:
        # Find nearest stop
        nearest = None
        min_distance = float('inf')

        for stop in remaining:
            if stop['latitude'] and stop['longitude']:
                distance = calculate_distance(
                    current_lat, current_lon,
                    float(stop['latitude']), float(stop['longitude'])
                )
                if distance < min_distance:
                    min_distance = distance
                    nearest = stop

        if nearest:
            optimized.append(nearest)
            remaining.remove(nearest)
            current_lat = float(nearest['latitude'])
            current_lon = float(nearest['longitude'])
        else:
            # No coordinates available, add remaining stops at the end
            optimized.extend(remaining)
            break

    return optimized


@router.get("/optimize/{route_date}")
async def optimize_routes(
    route_date: date,
    db: Session = Depends(get_db),
) -> List[OptimizedRoute]:
    """
    Generate optimized routes for all deliveries on a specific date.

    Algorithm:
    1. Get all deliveries and pickups for the date
    2. Group by assigned driver
    3. For each driver, optimize using nearest neighbor algorithm
    4. Calculate total distance and estimated time

    Args:
        route_date: Date to optimize routes for
        db: Database session

    Returns:
        List of optimized routes for each driver

    Example:
        GET /api/routes/optimize/2025-10-25
    """
    # Get default warehouse (first active warehouse)
    warehouse = db.query(Warehouse).filter(Warehouse.is_active == True).first()
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No active warehouse found",
        )

    warehouse_lat = float(warehouse.address_lat)
    warehouse_lon = float(warehouse.address_lng)

    # Get all bookings for the date (deliveries and pickups)
    deliveries = (
        db.query(Booking)
        .filter(Booking.delivery_date == route_date)
        .filter(Booking.status.notin_([
            BookingStatus.CANCELLED.value,
            BookingStatus.COMPLETED.value
        ]))
        .all()
    )

    pickups = (
        db.query(Booking)
        .filter(Booking.pickup_date == route_date)
        .filter(Booking.status.notin_([
            BookingStatus.CANCELLED.value,
            BookingStatus.COMPLETED.value
        ]))
        .all()
    )

    # Group by driver
    driver_bookings = {}

    for booking in deliveries:
        driver_id = booking.assigned_driver_id or "unassigned"
        if driver_id not in driver_bookings:
            driver_bookings[driver_id] = []
        driver_bookings[driver_id].append({
            'booking_id': booking.booking_id,
            'order_number': booking.order_number,
            'address': booking.delivery_address,
            'latitude': booking.delivery_lat,
            'longitude': booking.delivery_lng,
            'time_window': booking.delivery_time_window,
            'customer_name': booking.customer.name,
            'delivery_type': 'delivery',
        })

    for booking in pickups:
        driver_id = booking.pickup_driver_id or booking.assigned_driver_id or "unassigned"
        if driver_id not in driver_bookings:
            driver_bookings[driver_id] = []
        driver_bookings[driver_id].append({
            'booking_id': booking.booking_id,
            'order_number': booking.order_number,
            'address': booking.delivery_address,
            'latitude': booking.delivery_lat,
            'longitude': booking.delivery_lng,
            'time_window': booking.pickup_time_window,
            'customer_name': booking.customer.name,
            'delivery_type': 'pickup',
        })

    # Optimize each driver's route
    optimized_routes = []

    for driver_id, stops in driver_bookings.items():
        # Get driver info
        driver_name = None
        if driver_id != "unassigned":
            driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()
            driver_name = driver.name if driver else "Unknown Driver"

        # Optimize route using nearest neighbor
        optimized_stops = nearest_neighbor_route(stops, warehouse_lat, warehouse_lon)

        # Calculate total distance
        total_distance = 0.0
        if optimized_stops:
            # Distance from warehouse to first stop
            first_stop = optimized_stops[0]
            if first_stop['latitude'] and first_stop['longitude']:
                total_distance += calculate_distance(
                    warehouse_lat, warehouse_lon,
                    float(first_stop['latitude']), float(first_stop['longitude'])
                )

            # Distance between consecutive stops
            for i in range(len(optimized_stops) - 1):
                curr = optimized_stops[i]
                next_stop = optimized_stops[i + 1]
                if curr['latitude'] and curr['longitude'] and next_stop['latitude'] and next_stop['longitude']:
                    total_distance += calculate_distance(
                        float(curr['latitude']), float(curr['longitude']),
                        float(next_stop['latitude']), float(next_stop['longitude'])
                    )

            # Distance from last stop back to warehouse
            last_stop = optimized_stops[-1]
            if last_stop['latitude'] and last_stop['longitude']:
                total_distance += calculate_distance(
                    float(last_stop['latitude']), float(last_stop['longitude']),
                    warehouse_lat, warehouse_lon
                )

        # Estimate duration (avg 40 km/h + 20 min per stop)
        estimated_hours = (total_distance / 40.0) + (len(optimized_stops) * (20 / 60.0))

        optimized_routes.append(OptimizedRoute(
            driver_id=driver_id if driver_id != "unassigned" else None,
            driver_name=driver_name,
            total_stops=len(optimized_stops),
            total_distance_km=round(total_distance, 2),
            estimated_duration_hours=round(estimated_hours, 2),
            stops=[RouteStop(**stop) for stop in optimized_stops],
            warehouse_start=warehouse.name,
            warehouse_end=warehouse.name,
        ))

    # Sort by driver name (unassigned last)
    optimized_routes.sort(key=lambda r: (r.driver_name is None, r.driver_name or ""))

    return optimized_routes


@router.get("/distance")
async def calculate_route_distance(
    from_lat: float,
    from_lon: float,
    to_lat: float,
    to_lon: float,
) -> Dict[str, float]:
    """
    Calculate distance between two coordinates.

    Args:
        from_lat: Starting latitude
        from_lon: Starting longitude
        to_lat: Ending latitude
        to_lon: Ending longitude

    Returns:
        Distance in kilometers

    Example:
        GET /api/routes/distance?from_lat=40.7128&from_lon=-74.0060&to_lat=40.7614&to_lon=-73.9776
    """
    distance_km = calculate_distance(from_lat, from_lon, to_lat, to_lon)

    return {
        "distance_km": round(distance_km, 2),
        "distance_miles": round(distance_km * 0.621371, 2),
    }
