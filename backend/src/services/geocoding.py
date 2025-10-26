"""
Geocoding service for converting addresses to coordinates.

Supports both OpenStreetMap (free) and Google Maps (requires API key).
Easily switchable via environment variable.
"""

import os
import requests
from typing import Optional, Tuple
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)

# Configuration
USE_GOOGLE_MAPS = os.getenv("USE_GOOGLE_MAPS", "false").lower() == "true"
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")


def haversine_distance(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """
    Calculate the great circle distance between two points on Earth.

    Args:
        lat1: Latitude of first point
        lon1: Longitude of first point
        lat2: Latitude of second point
        lon2: Longitude of second point

    Returns:
        Distance in kilometers
    """
    from math import radians, cos, sin, asin, sqrt

    # Convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])

    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))

    # Radius of earth in kilometers
    r = 6371

    return c * r


def haversine_distance_miles(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """
    Calculate distance in miles.

    Args:
        lat1: Latitude of first point
        lon1: Longitude of first point
        lat2: Latitude of second point
        lon2: Longitude of second point

    Returns:
        Distance in miles
    """
    km = haversine_distance(lat1, lon1, lat2, lon2)
    return km * 0.621371  # Convert km to miles


@lru_cache(maxsize=1000)
def geocode_address_osm(address: str) -> Optional[Tuple[float, float]]:
    """
    Geocode an address using OpenStreetMap Nominatim (free).

    Args:
        address: Full address string

    Returns:
        Tuple of (latitude, longitude) or None if geocoding fails
    """
    try:
        # Nominatim requires a user agent
        headers = {"User-Agent": "PartayRentalApp/1.0"}

        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": address, "format": "json", "limit": 1}

        response = requests.get(
            url, params=params, headers=headers, timeout=5
        )
        response.raise_for_status()

        results = response.json()
        if results and len(results) > 0:
            lat = float(results[0]["lat"])
            lon = float(results[0]["lon"])
            logger.info(f"Geocoded '{address}' to ({lat}, {lon})")
            return (lat, lon)

        logger.warning(f"No geocoding results for address: {address}")
        return None

    except Exception as e:
        logger.error(f"Geocoding failed for '{address}': {e}")
        return None


@lru_cache(maxsize=1000)
def geocode_address_google(address: str) -> Optional[Tuple[float, float]]:
    """
    Geocode an address using Google Maps Geocoding API.

    Args:
        address: Full address string

    Returns:
        Tuple of (latitude, longitude) or None if geocoding fails
    """
    if not GOOGLE_MAPS_API_KEY:
        logger.error("Google Maps API key not configured")
        return None

    try:
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {"address": address, "key": GOOGLE_MAPS_API_KEY}

        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()

        data = response.json()
        if data["status"] == "OK" and data["results"]:
            location = data["results"][0]["geometry"]["location"]
            lat = location["lat"]
            lon = location["lng"]
            logger.info(f"Geocoded '{address}' to ({lat}, {lon}) via Google")
            return (lat, lon)

        logger.warning(f"Google geocoding failed: {data.get('status')}")
        return None

    except Exception as e:
        logger.error(f"Google geocoding failed for '{address}': {e}")
        return None


def geocode_address(address: str) -> Optional[Tuple[float, float]]:
    """
    Geocode an address using configured provider.

    Args:
        address: Full address string

    Returns:
        Tuple of (latitude, longitude) or None if geocoding fails
    """
    if not address or not address.strip():
        return None

    if USE_GOOGLE_MAPS:
        return geocode_address_google(address)
    else:
        return geocode_address_osm(address)


def calculate_distance(
    address1: str, address2: str, unit: str = "miles"
) -> Optional[float]:
    """
    Calculate distance between two addresses.

    Args:
        address1: First address
        address2: Second address
        unit: "miles" or "km"

    Returns:
        Distance in specified unit, or None if geocoding fails
    """
    coords1 = geocode_address(address1)
    coords2 = geocode_address(address2)

    if not coords1 or not coords2:
        return None

    lat1, lon1 = coords1
    lat2, lon2 = coords2

    if unit == "km":
        return haversine_distance(lat1, lon1, lat2, lon2)
    else:
        return haversine_distance_miles(lat1, lon1, lat2, lon2)
