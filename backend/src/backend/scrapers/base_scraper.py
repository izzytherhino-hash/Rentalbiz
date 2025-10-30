"""
Abstract base class for web scrapers.

Provides common functionality and interface for all partner website scrapers.
"""

from abc import ABC, abstractmethod
from typing import List
import requests
from bs4 import BeautifulSoup
from datetime import datetime, UTC
import logging

from backend.scrapers.scraper_models import ScrapedProduct, ScrapeResult


logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """Abstract base scraper class."""

    def __init__(self, partner_name: str, base_url: str, timeout: int = 30):
        """
        Initialize the scraper.

        Args:
            partner_name: Name of the partner company
            base_url: Base URL of the partner website
            timeout: HTTP request timeout in seconds
        """
        self.partner_name = partner_name
        self.base_url = base_url
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/91.0.4472.124 Safari/537.36"
                ),
            }
        )

    def fetch_page(self, url: str) -> BeautifulSoup:
        """
        Fetch and parse a web page.

        Args:
            url: URL to fetch

        Returns:
            Parsed BeautifulSoup object

        Raises:
            requests.RequestException: If fetching fails
        """
        logger.info(f"Fetching page: {url}")
        response = self.session.get(url, timeout=self.timeout)
        response.raise_for_status()
        return BeautifulSoup(response.content, "lxml")

    @abstractmethod
    def scrape(self) -> ScrapeResult:
        """
        Scrape products from the partner website.

        Returns:
            ScrapeResult containing scraped products

        Raises:
            Exception: If scraping fails
        """
        pass

    @abstractmethod
    def extract_products(self, soup: BeautifulSoup) -> List[ScrapedProduct]:
        """
        Extract product data from a parsed page.

        Args:
            soup: Parsed BeautifulSoup object

        Returns:
            List of scraped products
        """
        pass

    def create_result(
        self, products: List[ScrapedProduct], errors: List[str], start_time: datetime
    ) -> ScrapeResult:
        """
        Create a scrape result object.

        Args:
            products: List of scraped products
            errors: List of error messages
            start_time: Scrape start timestamp

        Returns:
            ScrapeResult object
        """
        return ScrapeResult(
            partner_name=self.partner_name,
            products_scraped=len(products),
            products=products,
            errors=errors,
            scrape_started_at=start_time,
            scrape_completed_at=datetime.now(UTC),
            success=len(errors) == 0,
        )
