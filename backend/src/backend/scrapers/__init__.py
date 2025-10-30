"""
Web scrapers for partner inventory aggregation.

This module contains web scrapers for extracting product data from partner websites.
"""

from backend.scrapers.base_scraper import BaseScraper
from backend.scrapers.create_a_party_scraper import CreateAPartyScraper
from backend.scrapers.scraper_models import ScrapedProduct, ScrapeResult

__all__ = [
    "BaseScraper",
    "CreateAPartyScraper",
    "ScrapedProduct",
    "ScrapeResult",
]
