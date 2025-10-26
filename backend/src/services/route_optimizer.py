"""
Route optimization service for driver recommendations.

Analyzes driver routes and recommends optimal driver assignment
based on existing route, proximity, and availability.
"""

import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime, time

from services.geocoding import geocode_address, haversine_distance_miles

logger = logging.getLogger(__name__)


class Stop:
    """Represents a stop on a driver's route."""

    def __init__(
        self,
        address: str,
        time_window: Tuple[time, time],
        stop_type: str,
        booking_id: int,
    ):
        self.address = address
        self.time_window = time_window
        self.stop_type = stop_type  # 'delivery' or 'pickup'
        self.booking_id = booking_id
        self.coords = geocode_address(address)


class DriverRoute:
    """Represents a driver's route for a given date."""

    def __init__(self, driver_id: int, driver_name: str, date: str):
        self.driver_id = driver_id
        self.driver_name = driver_name
        self.date = date
        self.stops: List[Stop] = []
        self.total_distance = 0.0

    def add_stop(self, stop: Stop) -> None:
        """Add a stop to the route."""
        self.stops.append(stop)
        self._recalculate_distance()

    def _recalculate_distance(self) -> None:
        """Calculate total route distance."""
        if len(self.stops) < 2:
            self.total_distance = 0.0
            return

        total = 0.0
        for i in range(len(self.stops) - 1):
            stop1 = self.stops[i]
            stop2 = self.stops[i + 1]

            if stop1.coords and stop2.coords:
                lat1, lon1 = stop1.coords
                lat2, lon2 = stop2.coords
                total += haversine_distance_miles(lat1, lon1, lat2, lon2)

        self.total_distance = total


class DriverRecommendation:
    """Represents a driver recommendation with score and reasoning."""

    def __init__(
        self,
        driver_id: int,
        driver_name: str,
        score: float,
        distance_to_delivery: float,
        route_disruption: float,
        current_stops: int,
        reason: str,
    ):
        self.driver_id = driver_id
        self.driver_name = driver_name
        self.score = score
        self.distance_to_delivery = distance_to_delivery
        self.route_disruption = route_disruption
        self.current_stops = current_stops
        self.reason = reason

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "driver_id": self.driver_id,
            "driver_name": self.driver_name,
            "score": round(self.score, 2),
            "distance_to_delivery": round(self.distance_to_delivery, 2),
            "route_disruption": round(self.route_disruption, 2),
            "current_stops": self.current_stops,
            "reason": self.reason,
        }


def build_driver_route(
    driver: Dict, bookings: List[Dict], date: str
) -> DriverRoute:
    """
    Build a driver's route for a specific date.

    Args:
        driver: Driver object with id and name
        bookings: List of all bookings
        date: Date string (YYYY-MM-DD)

    Returns:
        DriverRoute object with all stops
    """
    route = DriverRoute(driver["id"], driver["name"], date)

    for booking in bookings:
        # Add delivery stop if driver is assigned and date matches
        if (
            booking.get("delivery_driver_id") == driver["id"]
            and booking.get("delivery_date") == date
        ):
            # Create time window for delivery (assume 2-hour window)
            # In production, use actual time slots from booking
            stop = Stop(
                address=booking["delivery_address"],
                time_window=(time(9, 0), time(17, 0)),
                stop_type="delivery",
                booking_id=booking["id"],
            )
            route.add_stop(stop)

        # Add pickup stop if driver is assigned and date matches
        if (
            booking.get("pickup_driver_id") == driver["id"]
            and booking.get("pickup_date") == date
        ):
            stop = Stop(
                address=booking["delivery_address"],
                time_window=(time(9, 0), time(17, 0)),
                stop_type="pickup",
                booking_id=booking["id"],
            )
            route.add_stop(stop)

    return route


def calculate_route_disruption(
    route: DriverRoute, new_address: str
) -> float:
    """
    Calculate how much adding a new stop disrupts the driver's route.

    Args:
        route: Current driver route
        new_address: Address of new delivery

    Returns:
        Additional miles added to route (best insertion point)
    """
    new_coords = geocode_address(new_address)
    if not new_coords:
        logger.warning(f"Could not geocode address: {new_address}")
        return float("inf")

    # If route is empty, no disruption
    if len(route.stops) == 0:
        return 0.0

    # If only one stop, calculate distance to that stop
    if len(route.stops) == 1:
        stop = route.stops[0]
        if stop.coords:
            lat1, lon1 = stop.coords
            lat2, lon2 = new_coords
            return haversine_distance_miles(lat1, lon1, lat2, lon2)
        return float("inf")

    # Find best insertion point in route
    min_added_distance = float("inf")

    for i in range(len(route.stops)):
        # Try inserting new stop between position i and i+1
        if i == len(route.stops) - 1:
            # Insert at end
            stop = route.stops[i]
            if stop.coords:
                lat1, lon1 = stop.coords
                lat2, lon2 = new_coords
                added = haversine_distance_miles(lat1, lon1, lat2, lon2)
                min_added_distance = min(min_added_distance, added)
        else:
            # Insert in middle
            stop1 = route.stops[i]
            stop2 = route.stops[i + 1]

            if stop1.coords and stop2.coords:
                lat1, lon1 = stop1.coords
                lat2, lon2 = new_coords
                lat3, lon3 = stop2.coords

                # Calculate: distance(stop1 -> new) + distance(new -> stop2)
                # Minus the original distance(stop1 -> stop2)
                original = haversine_distance_miles(lat1, lon1, lat3, lon3)
                with_new = haversine_distance_miles(
                    lat1, lon1, lat2, lon2
                ) + haversine_distance_miles(lat2, lon2, lat3, lon3)
                added = with_new - original
                min_added_distance = min(min_added_distance, added)

    return max(0.0, min_added_distance)


def calculate_distance_to_address(
    route: DriverRoute, target_address: str
) -> float:
    """
    Calculate closest distance from driver's route to target address.

    Args:
        route: Driver's current route
        target_address: Address to check distance to

    Returns:
        Distance in miles to closest stop (0.0 if route is empty)
    """
    target_coords = geocode_address(target_address)
    if not target_coords:
        return float("inf")

    # If driver has no stops, return 0 (they're available for any location)
    if len(route.stops) == 0:
        return 0.0

    min_distance = float("inf")
    target_lat, target_lon = target_coords

    for stop in route.stops:
        if stop.coords:
            lat, lon = stop.coords
            distance = haversine_distance_miles(lat, lon, target_lat, target_lon)
            min_distance = min(min_distance, distance)

    return min_distance


def has_time_conflict(
    route: DriverRoute, delivery_date: str, pickup_date: str
) -> bool:
    """
    Check if driver has time conflicts for new booking.

    Args:
        route: Driver's current route
        delivery_date: Delivery date (YYYY-MM-DD)
        pickup_date: Pickup date (YYYY-MM-DD)

    Returns:
        True if there's a time conflict
    """
    # Simple conflict check: if driver already has 8+ stops on that day,
    # consider them at capacity
    # In production, implement proper time window conflict checking

    if delivery_date == route.date and len(route.stops) >= 8:
        return True

    return False


def recommend_drivers(
    drivers: List[Dict],
    bookings: List[Dict],
    new_booking: Dict,
    max_recommendations: int = 5,
) -> List[DriverRecommendation]:
    """
    Recommend drivers for a new booking based on route optimization.

    Args:
        drivers: List of all driver objects
        bookings: List of all existing bookings
        new_booking: New booking that needs driver assignment
        max_recommendations: Maximum number of drivers to recommend

    Returns:
        Sorted list of DriverRecommendation objects (best first)
    """
    delivery_date = new_booking.get("delivery_date")
    pickup_date = new_booking.get("pickup_date")
    delivery_address = new_booking.get("delivery_address")

    if not delivery_date or not delivery_address:
        logger.error("Booking missing delivery_date or delivery_address")
        return []

    recommendations = []

    for driver in drivers:
        # Only consider active drivers
        if not driver.get("is_active", True):
            continue

        # Build driver's route for the delivery date
        route = build_driver_route(driver, bookings, delivery_date)

        # Check for time conflicts
        if has_time_conflict(route, delivery_date, pickup_date):
            continue

        # Calculate metrics
        disruption = calculate_route_disruption(route, delivery_address)
        distance = calculate_distance_to_address(route, delivery_address)

        # Handle cases where geocoding failed
        if disruption == float("inf") or distance == float("inf"):
            continue

        # Calculate score (lower is better)
        # Weight: 60% disruption, 40% distance
        # Add penalty for busy drivers (more stops = lower priority)
        workload_penalty = len(route.stops) * 0.5
        score = (disruption * 0.6) + (distance * 0.4) + workload_penalty

        # Generate reason
        if len(route.stops) == 0:
            reason = "No existing deliveries - fresh route"
        elif disruption < 2.0:
            reason = f"Minimal disruption ({disruption:.1f}mi added)"
        elif distance < 5.0:
            reason = f"Close to existing route ({distance:.1f}mi away)"
        else:
            reason = f"{len(route.stops)} stops, {disruption:.1f}mi added"

        recommendation = DriverRecommendation(
            driver_id=driver["id"],
            driver_name=driver["name"],
            score=score,
            distance_to_delivery=distance,
            route_disruption=disruption,
            current_stops=len(route.stops),
            reason=reason,
        )

        recommendations.append(recommendation)

    # Sort by score (lower is better)
    recommendations.sort(key=lambda r: r.score)

    return recommendations[:max_recommendations]
