"""
Craigslist scraper for multi-location search.

Scrapes Craigslist search results across multiple cities and categories.
"""

import asyncio
import logging
import re
from datetime import datetime, UTC
from decimal import Decimal
from typing import List, Optional
from urllib.parse import urlencode, quote_plus

import requests
from bs4 import BeautifulSoup

from backend.scrapers.craigslist_models import CraigslistListing, CraigslistSearchResult


logger = logging.getLogger(__name__)


class CraigslistScraper:
    """Scraper for Craigslist search results."""

    # Common Craigslist category codes
    CATEGORIES = {
        "all": "sss",  # All for sale
        "furniture": "fua",
        "appliances": "ppa",
        "electronics": "ela",
        "cars": "cta",
        "tools": "tla",
        "free": "zip",
        "antiques": "ata",
        "bikes": "bia",
        "boats": "boo",
        "books": "bka",
        "clothing": "cla",
        "computers": "sya",
        "games": "vga",
        "household": "hsa",
        "jewelry": "jwa",
        "materials": "maa",
        "motorcycles": "mca",
        "music": "msa",
        "photo": "pha",
        "sporting": "sga",
        "tickets": "tia",
        "toys": "taa",
        # Real estate categories
        "housing": "hhh",  # All housing
        "apartments": "apa",  # Apartments/housing for rent
        "rooms": "roo",  # Rooms & shares
        "office": "off",  # Office & commercial
        "parking": "prk",  # Parking & storage
        "real_estate": "rea",  # Real estate for sale
    }

    def __init__(self, timeout: int = 30, max_pages: int = 3, delay: float = 1.5):
        """
        Initialize the Craigslist scraper.

        Args:
            timeout: HTTP request timeout in seconds
            max_pages: Maximum number of pages to scrape per location
            delay: Delay between requests in seconds (avoid rate limiting)
        """
        self.timeout = timeout
        self.max_pages = max_pages
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/121.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "DNT": "1",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
            }
        )

    def build_search_url(
        self,
        city: str,
        query: Optional[str] = None,
        category: str = "sss",
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        offset: int = 0,
    ) -> str:
        """
        Build Craigslist search URL.

        Args:
            city: Craigslist city subdomain (e.g., 'boston', 'newyork')
            query: Search query string
            category: Category code (default: 'sss' for all)
            min_price: Minimum price filter
            max_price: Maximum price filter
            offset: Results offset for pagination

        Returns:
            Complete search URL
        """
        base_url = f"https://{city}.craigslist.org/search/{category}"

        params = {}
        if query:
            params["query"] = query
        if min_price is not None:
            params["min_price"] = min_price
        if max_price is not None:
            params["max_price"] = max_price
        if offset > 0:
            params["s"] = offset

        if params:
            return f"{base_url}?{urlencode(params)}"
        return base_url

    def parse_price(self, price_text: Optional[str]) -> Optional[Decimal]:
        """
        Parse price from text.

        Args:
            price_text: Raw price text (e.g., '$100', '$1,234.56')

        Returns:
            Decimal price or None
        """
        if not price_text:
            return None

        # Remove currency symbols and commas
        cleaned = re.sub(r"[$,]", "", price_text.strip())

        try:
            return Decimal(cleaned)
        except Exception:
            return None

    def parse_listing_date(self, date_text: Optional[str]) -> Optional[datetime]:
        """
        Parse listing date from Craigslist date format.

        Args:
            date_text: Date text from Craigslist

        Returns:
            Parsed datetime or None
        """
        if not date_text:
            return None

        try:
            # Craigslist typically uses ISO format in datetime attributes
            return datetime.fromisoformat(date_text.replace("Z", "+00:00"))
        except Exception:
            return None

    def extract_listings(
        self, soup: BeautifulSoup, city: str
    ) -> List[CraigslistListing]:
        """
        Extract listings from search results page.

        Args:
            soup: Parsed BeautifulSoup object
            city: Craigslist city subdomain

        Returns:
            List of CraigslistListing objects
        """
        listings = []

        # Find all result items - Craigslist uses <li class="cl-static-search-result">
        results = soup.find_all("li", class_="cl-static-search-result")

        for result in results:
            try:
                # Extract title and URL - now in <a> tag with <div class="title">
                link_elem = result.find("a")
                if not link_elem:
                    continue

                title_div = link_elem.find("div", class_="title")
                if not title_div:
                    continue

                title = title_div.get_text(strip=True)
                listing_url = link_elem.get("href", "")

                # Make URL absolute if needed
                if listing_url.startswith("/"):
                    listing_url = f"https://{city}.craigslist.org{listing_url}"

                # Extract listing ID from URL
                listing_id_match = re.search(r"/(\d+)\.html", listing_url)
                listing_id = listing_id_match.group(1) if listing_id_match else None

                # Extract price - now in <div class="price">
                price_elem = result.find("div", class_="price")
                price = (
                    self.parse_price(price_elem.get_text(strip=True))
                    if price_elem
                    else None
                )

                # Extract location - still in <div class="location">
                location_elem = result.find("div", class_="location")
                location = (
                    location_elem.get_text(strip=True) if location_elem else None
                )

                # Extract thumbnail - look for img within the link
                img_elem = link_elem.find("img")
                thumbnail_url = img_elem.get("src") if img_elem else None

                # Extract posted date - look for time element
                time_elem = result.find("time")
                posted_date = None
                if time_elem and time_elem.get("datetime"):
                    posted_date = self.parse_listing_date(time_elem.get("datetime"))

                # Create listing object
                listing = CraigslistListing(
                    title=title,
                    price=price,
                    location=location,
                    thumbnail_url=thumbnail_url,
                    listing_url=listing_url,
                    posted_date=posted_date,
                    listing_id=listing_id,
                    city=city,
                )

                listings.append(listing)

            except Exception as e:
                logger.warning(f"Error extracting listing: {e}")
                continue

        return listings

    def scrape_city(
        self,
        city: str,
        query: Optional[str] = None,
        category: str = "sss",
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
    ) -> List[CraigslistListing]:
        """
        Scrape listings from a single city.

        Args:
            city: Craigslist city subdomain
            query: Search query
            category: Category code
            min_price: Minimum price
            max_price: Maximum price

        Returns:
            List of listings from this city
        """
        all_listings = []
        errors = []

        for page in range(self.max_pages):
            try:
                offset = page * 120  # Craigslist shows 120 results per page
                url = self.build_search_url(
                    city, query, category, min_price, max_price, offset
                )

                logger.info(f"Scraping {city} page {page + 1}: {url}")

                response = self.session.get(url, timeout=self.timeout)
                response.raise_for_status()

                soup = BeautifulSoup(response.content, "lxml")
                listings = self.extract_listings(soup, city)

                all_listings.extend(listings)

                # If we got fewer than 120 results, we're on the last page
                if len(listings) < 120:
                    break

                # Delay before next page to avoid rate limiting
                if page < self.max_pages - 1:
                    asyncio.run(asyncio.sleep(self.delay))

            except requests.RequestException as e:
                logger.error(f"Error scraping {city} page {page + 1}: {e}")
                errors.append(f"{city}: {str(e)}")
                break
            except Exception as e:
                logger.error(f"Unexpected error scraping {city}: {e}")
                errors.append(f"{city}: {str(e)}")
                break

        return all_listings

    async def scrape_async(
        self,
        cities: List[str],
        query: Optional[str] = None,
        category: str = "sss",
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
    ) -> CraigslistSearchResult:
        """
        Scrape multiple cities in parallel.

        Args:
            cities: List of Craigslist city subdomains
            query: Search query
            category: Category code
            min_price: Minimum price
            max_price: Maximum price

        Returns:
            CraigslistSearchResult with all listings
        """
        start_time = datetime.now(UTC)
        all_listings = []
        errors = []

        # Run scraping tasks in parallel
        loop = asyncio.get_event_loop()
        tasks = [
            loop.run_in_executor(
                None, self.scrape_city, city, query, category, min_price, max_price
            )
            for city in cities
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                errors.append(f"{cities[i]}: {str(result)}")
            else:
                all_listings.extend(result)

        return CraigslistSearchResult(
            locations_searched=cities,
            total_listings=len(all_listings),
            listings=all_listings,
            errors=errors,
            search_started_at=start_time,
            search_completed_at=datetime.now(UTC),
            success=len(errors) == 0,
            search_params={
                "query": query,
                "category": category,
                "min_price": min_price,
                "max_price": max_price,
            },
        )

    def scrape(
        self,
        cities: List[str],
        query: Optional[str] = None,
        category: str = "sss",
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
    ) -> CraigslistSearchResult:
        """
        Scrape multiple cities (synchronous wrapper).

        Args:
            cities: List of Craigslist city subdomains
            query: Search query
            category: Category code
            min_price: Minimum price
            max_price: Maximum price

        Returns:
            CraigslistSearchResult with all listings
        """
        return asyncio.run(
            self.scrape_async(cities, query, category, min_price, max_price)
        )
