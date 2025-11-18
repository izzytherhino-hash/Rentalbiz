"""
AI-powered search service for Craigslist listings.

Uses Claude AI to:
1. Parse natural language search prompts into Craigslist search parameters
2. Filter and rank search results based on relevance
3. Generate concise summaries of listings
"""

import json
import logging
from typing import List, Optional, Dict, Any
import anthropic

from backend.config import get_settings
from backend.scrapers.craigslist_models import CraigslistListing
from backend.scrapers.craigslist_scraper import CraigslistScraper


logger = logging.getLogger(__name__)


class AISearchService:
    """Service for AI-powered Craigslist search."""

    def __init__(self):
        """Initialize the AI search service."""
        settings = get_settings()
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-sonnet-4-5-20250929"

    def parse_search_prompt(self, prompt: str) -> Dict[str, Any]:
        """
        Parse natural language search prompt into structured search parameters.

        Args:
            prompt: Natural language search query

        Returns:
            Dict with keys: query, category, min_price, max_price, keywords

        Example:
            Input: "cheap furniture under $200 in good condition"
            Output: {
                "query": "furniture good condition",
                "category": "furniture",
                "min_price": None,
                "max_price": 200,
                "keywords": ["furniture", "good", "condition"]
            }
        """
        system_prompt = """You are a search parameter extraction assistant for Craigslist.

Given a natural language search query, extract structured search parameters.

Available categories:
- all (default)
- furniture
- appliances
- electronics
- cars
- tools
- free
- antiques
- bikes
- boats
- books
- clothing
- computers
- games
- household
- jewelry
- materials
- motorcycles
- music
- photo
- sporting
- tickets
- toys
- housing
- apartments
- rooms
- office (for warehouse, commercial space, office space)
- parking
- real_estate

Output ONLY a JSON object with these fields:
{
  "query": "search keywords (cleaned and SHORT - 1-3 words max, just the item type)",
  "category": "category_name or 'all'",
  "min_price": number or null,
  "max_price": number or null,
  "keywords": ["key", "words"]
}

IMPORTANT: The "query" field should be SHORT - just the core item/space you're searching for.
Remove location names, remove context like "for my business" or "suitable for X".
Keep it to 1-3 words describing WHAT they want, not WHY they want it.

Examples:
Input: "cheap furniture under $200 in good condition"
Output: {"query": "furniture", "category": "furniture", "min_price": null, "max_price": 200, "keywords": ["furniture", "cheap", "good condition"]}

Input: "free stuff"
Output: {"query": "", "category": "free", "min_price": null, "max_price": null, "keywords": ["free"]}

Input: "used laptops between $300 and $800"
Output: {"query": "laptop", "category": "computers", "min_price": 300, "max_price": 800, "keywords": ["laptop", "used"]}

Input: "warehouse space suitable for bouncehouse company"
Output: {"query": "warehouse", "category": "office", "min_price": null, "max_price": null, "keywords": ["warehouse", "commercial"]}

Input: "warehouse space for a bounce house business in orange county"
Output: {"query": "warehouse", "category": "office", "min_price": null, "max_price": null, "keywords": ["warehouse", "commercial"]}
"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                system=system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
            )

            # Extract JSON from response
            response_text = response.content[0].text.strip()

            # Try to parse JSON
            params = json.loads(response_text)

            # Validate and set defaults
            return {
                "query": params.get("query", ""),
                "category": params.get("category", "all"),
                "min_price": params.get("min_price"),
                "max_price": params.get("max_price"),
                "keywords": params.get("keywords", []),
            }

        except Exception as e:
            logger.error(f"Error parsing search prompt with AI: {e}")
            # Fallback: use the prompt as-is
            return {
                "query": prompt,
                "category": "all",
                "min_price": None,
                "max_price": None,
                "keywords": prompt.split(),
            }

    def filter_and_rank_results(
        self, listings: List[CraigslistListing], prompt: str, keywords: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Filter and rank search results based on relevance to the original prompt.

        Args:
            listings: List of CraigslistListing objects
            prompt: Original search prompt
            keywords: Extracted keywords

        Returns:
            List of dicts with listing data plus AI-generated summary and relevance score
        """
        if not listings:
            return []

        # Prepare listings for AI analysis (limit to 100 for better coverage)
        sample_size = min(len(listings), 100)
        listings_to_analyze = listings[:sample_size]

        # Build context for AI
        listings_text = "\n\n".join(
            [
                f"Listing {i+1}:\n"
                f"Title: {listing.title}\n"
                f"Price: ${listing.price if listing.price else 'N/A'}\n"
                f"Location: {listing.location or 'N/A'}\n"
                f"City: {listing.city}\n"
                f"URL: {listing.listing_url}"
                for i, listing in enumerate(listings_to_analyze)
            ]
        )

        system_prompt = f"""You are a search result ranking and summarization assistant.

Given a search query and Craigslist listings, do the following:
1. Assess each listing's relevance to the query (score 0-10)
2. Generate a brief 1-2 sentence summary highlighting why it matches (or doesn't)
3. Note any red flags or positive indicators

Search query: "{prompt}"
Keywords: {', '.join(keywords)}

Output ONLY a JSON array with this format:
[
  {{
    "listing_number": 1,
    "relevance_score": 8,
    "summary": "Well-maintained oak dining table, matches condition requirement",
    "flags": ["Good price", "Detailed description"]
  }},
  ...
]

Be concise and focus on match quality."""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": listings_text,
                    }
                ],
            )

            # Extract JSON from response
            response_text = response.content[0].text.strip()
            ai_analysis = json.loads(response_text)

            # Merge AI analysis with original listings
            enhanced_listings = []
            for i, listing in enumerate(listings_to_analyze):
                # Find matching AI analysis
                analysis = next(
                    (
                        item
                        for item in ai_analysis
                        if item.get("listing_number") == i + 1
                    ),
                    None,
                )

                enhanced_listing = {
                    "title": listing.title,
                    "price": float(listing.price) if listing.price else None,
                    "location": listing.location,
                    "thumbnail_url": listing.thumbnail_url,
                    "listing_url": listing.listing_url,
                    "posted_date": (
                        listing.posted_date.isoformat() if listing.posted_date else None
                    ),
                    "city": listing.city,
                    "listing_id": listing.listing_id,
                    "ai_summary": (
                        analysis.get("summary", "")
                        if analysis
                        else "Potential match"
                    ),
                    "relevance_score": (
                        analysis.get("relevance_score", 5) if analysis else 5
                    ),
                    "flags": analysis.get("flags", []) if analysis else [],
                }

                enhanced_listings.append(enhanced_listing)

            # Sort by relevance score (highest first)
            enhanced_listings.sort(
                key=lambda x: x["relevance_score"], reverse=True
            )

            # Add remaining listings without AI analysis
            if len(listings) > sample_size:
                for listing in listings[sample_size:]:
                    enhanced_listings.append(
                        {
                            "title": listing.title,
                            "price": float(listing.price) if listing.price else None,
                            "location": listing.location,
                            "thumbnail_url": listing.thumbnail_url,
                            "listing_url": listing.listing_url,
                            "posted_date": (
                                listing.posted_date.isoformat()
                                if listing.posted_date
                                else None
                            ),
                            "city": listing.city,
                            "listing_id": listing.listing_id,
                            "ai_summary": "Not analyzed",
                            "relevance_score": 5,
                            "flags": [],
                        }
                    )

            return enhanced_listings

        except Exception as e:
            logger.error(f"Error filtering/ranking results with AI: {e}")
            # Fallback: return listings without AI enhancement
            return [
                {
                    "title": listing.title,
                    "price": float(listing.price) if listing.price else None,
                    "location": listing.location,
                    "thumbnail_url": listing.thumbnail_url,
                    "listing_url": listing.listing_url,
                    "posted_date": (
                        listing.posted_date.isoformat() if listing.posted_date else None
                    ),
                    "city": listing.city,
                    "listing_id": listing.listing_id,
                    "ai_summary": "Match found",
                    "relevance_score": 5,
                    "flags": [],
                }
                for listing in listings
            ]

    async def search(
        self, prompt: str, cities: List[str], max_results: Optional[int] = 50, category: Optional[str] = "all"
    ) -> Dict[str, Any]:
        """
        Perform complete AI-powered Craigslist search.

        Args:
            prompt: Natural language search query
            cities: List of Craigslist city subdomains
            max_results: Maximum number of results to return
            category: Craigslist category to search within

        Returns:
            Dict containing enhanced results, search params, and metadata
        """
        logger.info(f"AI Search - Prompt: '{prompt}', Cities: {cities}, Category: {category}")

        # Phase 1: Parse prompt into search parameters
        search_params = self.parse_search_prompt(prompt)
        logger.info(f"Extracted search params: {search_params}")

        # Use user-selected category if provided, otherwise use AI-detected category
        final_category = category if category and category != "all" else search_params["category"]

        # If user selected a specific category, simplify the query by extracting just key nouns
        if category and category != "all":
            # Simple keyword extraction - just get the first few important words
            words = prompt.lower().split()
            # Filter out common words, location names, and business type descriptors
            stop_words = {"in", "for", "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
                         "have", "has", "had", "do", "does", "did", "will", "would", "should", "could",
                         "my", "your", "his", "her", "its", "our", "their", "orange", "county", "business",
                         "company", "suitable", "looking", "need", "want", "find", "search", "bounce",
                         "house", "bouncehouse", "party", "rental"}
            keywords = [w for w in words if w not in stop_words and len(w) > 2][:2]  # Just 2 keywords
            simple_query = " ".join(keywords) if keywords else search_params["query"]
            search_params["query"] = simple_query

        # Map category name to Craigslist code
        category_code = CraigslistScraper.CATEGORIES.get(
            final_category, "sss"
        )

        # Phase 2: Scrape Craigslist
        scraper = CraigslistScraper(max_pages=2, delay=1.0)
        scrape_result = await scraper.scrape_async(
            cities=cities,
            query=search_params["query"],
            category=category_code,
            min_price=search_params["min_price"],
            max_price=search_params["max_price"],
        )

        logger.info(
            f"Scraping complete - Found {scrape_result.total_listings} listings"
        )

        # Phase 3: Return results without heavy AI filtering
        # Just add basic fields to match expected format
        enhanced_listings = []
        for listing in scrape_result.listings[:max_results]:
            enhanced_listings.append({
                "title": listing.title,
                "price": float(listing.price) if listing.price else None,
                "location": listing.location,
                "thumbnail_url": listing.thumbnail_url,
                "listing_url": listing.listing_url,
                "posted_date": listing.posted_date.isoformat() if listing.posted_date else None,
                "city": listing.city,
                "listing_id": listing.listing_id,
                "ai_summary": f"Listed in {listing.city}" + (f" - ${listing.price}" if listing.price else ""),
                "relevance_score": 7,  # Default score
                "flags": [],
            })

        return {
            "results": enhanced_listings,
            "search_params": search_params,
            "total_found": scrape_result.total_listings,
            "locations_searched": scrape_result.locations_searched,
            "errors": scrape_result.errors,
            "success": scrape_result.success,
        }
