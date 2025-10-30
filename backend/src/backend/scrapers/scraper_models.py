"""
Pydantic models for web scraping results.

Defines data structures for scraped product information and scrape results.
"""

from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional
from datetime import datetime
from decimal import Decimal


class ScrapedProduct(BaseModel):
    """Model for a single scraped product."""

    name: str = Field(..., min_length=1, max_length=500)
    price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    category: Optional[str] = Field(None, max_length=255)
    image_url: Optional[str] = Field(None, max_length=1000)
    product_url: str = Field(..., max_length=1000)
    description: Optional[str] = None
    availability: Optional[str] = None


class ScrapeResult(BaseModel):
    """Model for overall scrape operation result."""

    partner_name: str
    products_scraped: int = 0
    products: List[ScrapedProduct] = []
    errors: List[str] = []
    scrape_started_at: datetime
    scrape_completed_at: Optional[datetime] = None
    success: bool = True

    class Config:
        json_encoders = {
            Decimal: str,
            datetime: lambda v: v.isoformat(),
        }
