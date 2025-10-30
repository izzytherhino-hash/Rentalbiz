"""
Web scraper for Create A Party Rentals (createaparty.com).

Extracts product inventory data from Create A Party Rentals website.
"""

from typing import List
from decimal import Decimal
from datetime import datetime, UTC
import logging
import re

from bs4 import BeautifulSoup
from backend.scrapers.base_scraper import BaseScraper
from backend.scrapers.scraper_models import ScrapedProduct, ScrapeResult


logger = logging.getLogger(__name__)


class CreateAPartyScraper(BaseScraper):
    """Scraper for Create A Party Rentals website."""

    def __init__(self):
        """Initialize the Create A Party scraper."""
        super().__init__(
            partner_name="Create A Party Rentals", base_url="https://createaparty.com"
        )
        # Main catalog browsing page
        self.catalog_url = f"{self.base_url}/event-rentals.asp"

        # Category URLs for different product types
        self.category_urls = [
            f"{self.base_url}/equipment.asp?action=category&category=67",  # Chairs
            f"{self.base_url}/equipment.asp?action=category&category=59",  # Category 59
            f"{self.base_url}/equipment.asp?action=category&category=95",  # Category 95
        ]

    def scrape(self) -> ScrapeResult:
        """
        Scrape all products from Create A Party Rentals.

        Returns:
            ScrapeResult with scraped products
        """
        start_time = datetime.now(UTC)
        all_products: List[ScrapedProduct] = []
        errors: List[str] = []

        try:
            logger.info(f"Starting scrape of {self.partner_name}")

            # Scrape products from each category URL
            for category_url in self.category_urls:
                try:
                    logger.info(f"Scraping category: {category_url}")
                    soup = self.fetch_page(category_url)
                    products = self.extract_products(soup)
                    all_products.extend(products)
                    logger.info(f"Found {len(products)} products in category")
                except Exception as e:
                    error_msg = f"Failed to scrape category {category_url}: {str(e)}"
                    logger.warning(error_msg)
                    errors.append(error_msg)

            logger.info(
                f"Successfully scraped {len(all_products)} products from {self.partner_name}"
            )

        except Exception as e:
            error_msg = f"Failed to scrape {self.partner_name}: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)

        return self.create_result(all_products, errors, start_time)

    def extract_products(self, soup: BeautifulSoup) -> List[ScrapedProduct]:
        """
        Extract product data from the catalog page.

        Args:
            soup: Parsed catalog page

        Returns:
            List of scraped products
        """
        products: List[ScrapedProduct] = []

        # Find all product links (links with 'key=' parameter)
        product_links = soup.find_all("a", href=re.compile(r"key="))

        # Group links by product key (each product has 2 links)
        # First <a>: contains image
        # Second <a>: contains name and price
        products_by_key = {}

        for link in product_links:
            try:
                href = link.get("href", "")
                # Extract the product key from href
                key_match = re.search(r"key=([^&]+)", href)
                if not key_match:
                    continue

                product_key = key_match.group(1)

                # Group all links for this product
                if product_key not in products_by_key:
                    products_by_key[product_key] = {"links": [], "href": href}
                products_by_key[product_key]["links"].append(link)

            except Exception as e:
                logger.warning(f"Failed to process link: {str(e)}")
                continue

        # Now extract products from the grouped links
        for product_key, data in products_by_key.items():
            try:
                product = self._extract_product_from_links(
                    data["links"], data["href"], product_key
                )
                if product:
                    products.append(product)
            except Exception as e:
                logger.warning(
                    f"Failed to extract product {product_key}: {str(e)}"
                )
                continue

        return products

    def _extract_product_from_links(
        self, links: list, href: str, product_key: str
    ) -> ScrapedProduct | None:
        """
        Extract product info from all link elements for a product.

        Args:
            links: List of BeautifulSoup link elements for this product
            href: The href attribute value
            product_key: The product key identifier

        Returns:
            ScrapedProduct or None if extraction fails
        """
        # Build full product URL
        product_url = href if href.startswith("http") else f"{self.base_url}/{href}"

        # Extract data from all links
        image_url = None
        name = None
        price = None

        for link in links:
            # Extract image if present
            img = link.find("img")
            if img:
                img_src = img.get("src", "")
                if img_src and not image_url:
                    image_url = (
                        img_src
                        if img_src.startswith("http")
                        else f"{self.base_url}/{img_src}"
                    )

            # Extract text content
            link_text = link.get_text(strip=True)
            if link_text:
                # Try to find price using regex
                price_match = re.search(r"\$(\d+\.?\d*)", link_text)
                if price_match and not price:
                    price = self._parse_price(price_match.group(0))
                    # Extract product name (everything before the price)
                    name_text = link_text[: price_match.start()].strip()
                    if name_text and len(name_text) >= 2 and not name:
                        name = name_text

        # Skip if we don't have a valid name
        if not name or len(name) < 2:
            return None

        # Try to determine category from the URL
        category = None
        if "category=67" in href:
            category = "Chairs"
        elif "category=59" in href:
            category = "Bounce Houses"
        elif "category=95" in href:
            category = "Tents & Canopies"

        return ScrapedProduct(
            name=name,
            price=price,
            category=category,
            image_url=image_url,
            product_url=product_url,
        )

    def _parse_price(self, price_text: str) -> Decimal | None:
        """
        Parse price from text string.

        Args:
            price_text: Raw price text (e.g., "$150.00", "150")

        Returns:
            Decimal price or None if parsing fails
        """
        try:
            # Remove currency symbols and whitespace
            price_str = re.sub(r"[^\d.]", "", price_text)
            if price_str:
                return Decimal(price_str)
        except Exception as e:
            logger.warning(f"Failed to parse price '{price_text}': {str(e)}")
        return None
