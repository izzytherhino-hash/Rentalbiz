"""
Explore API endpoints.

Provides business tools for the admin portal, including:
- AI-powered Craigslist search
"""

import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional

from backend.services.ai_search_service import AISearchService


logger = logging.getLogger(__name__)
router = APIRouter()


class CraigslistSearchRequest(BaseModel):
    """Request model for Craigslist search."""

    prompt: str = Field(
        ..., min_length=1, max_length=500, description="Natural language search query"
    )
    locations: List[str] = Field(
        ...,
        min_length=1,
        max_length=5,
        description="List of Craigslist city subdomains (e.g., ['boston', 'worcester'])",
    )
    category: Optional[str] = Field(
        "all", description="Craigslist category (e.g., 'furniture', 'electronics', 'all')"
    )
    max_results: Optional[int] = Field(
        50, ge=1, le=200, description="Maximum number of results to return"
    )


class CraigslistSearchResponse(BaseModel):
    """Response model for Craigslist search."""

    results: List[dict]
    search_params: dict
    total_found: int
    locations_searched: List[str]
    errors: List[str]
    success: bool


@router.post(
    "/craigslist/search",
    response_model=CraigslistSearchResponse,
    summary="AI-powered Craigslist search",
    description="Search Craigslist across multiple cities using natural language prompts",
)
async def search_craigslist(request: CraigslistSearchRequest) -> CraigslistSearchResponse:
    """
    Search Craigslist using AI-powered natural language processing.

    This endpoint:
    1. Parses the natural language prompt to extract search parameters
    2. Scrapes Craigslist across specified locations
    3. Uses AI to filter, rank, and summarize results
    4. Returns enhanced listings with relevance scores and summaries

    Args:
        request: CraigslistSearchRequest with prompt, locations, and options

    Returns:
        CraigslistSearchResponse with enhanced search results

    Raises:
        HTTPException: If search fails

    Example:
        POST /api/explore/craigslist/search
        {
          "prompt": "cheap furniture in good condition",
          "locations": ["boston", "worcester"],
          "max_results": 50
        }
    """
    try:
        logger.info(
            f"Craigslist search request - Prompt: '{request.prompt}', "
            f"Locations: {request.locations}"
        )

        # Initialize AI search service
        ai_search = AISearchService()

        # Perform search
        result = await ai_search.search(
            prompt=request.prompt,
            cities=request.locations,
            max_results=request.max_results,
            category=request.category,
        )

        logger.info(
            f"Search complete - Found {result['total_found']} listings, "
            f"returning {len(result['results'])}"
        )

        return CraigslistSearchResponse(
            results=result["results"],
            search_params=result["search_params"],
            total_found=result["total_found"],
            locations_searched=result["locations_searched"],
            errors=result["errors"],
            success=result["success"],
        )

    except Exception as e:
        logger.error(f"Error in Craigslist search: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}",
        )
