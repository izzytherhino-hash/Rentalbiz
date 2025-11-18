"""
Pydantic models for Craigslist search results.

Defines data structures specific to Craigslist listing data.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class CraigslistListing(BaseModel):
    """Model for a single Craigslist listing."""

    title: str = Field(..., min_length=1, max_length=500)
    price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    location: Optional[str] = Field(None, max_length=255)
    thumbnail_url: Optional[str] = Field(None, max_length=1000)
    listing_url: str = Field(..., max_length=1000)
    posted_date: Optional[datetime] = None
    description: Optional[str] = None
    listing_id: Optional[str] = None
    city: str = Field(..., max_length=100)  # Which Craigslist city this came from

    class Config:
        json_encoders = {
            Decimal: str,
            datetime: lambda v: v.isoformat() if v else None,
        }


class CraigslistSearchResult(BaseModel):
    """Model for Craigslist search operation result."""

    locations_searched: List[str] = []
    total_listings: int = 0
    listings: List[CraigslistListing] = []
    errors: List[str] = []
    search_started_at: datetime
    search_completed_at: Optional[datetime] = None
    success: bool = True
    search_params: dict = {}  # Store the parsed search parameters

    class Config:
        json_encoders = {
            Decimal: str,
            datetime: lambda v: v.isoformat() if v else None,
        }
