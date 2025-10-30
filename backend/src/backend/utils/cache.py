"""
Simple in-memory cache with TTL support.

Provides a lightweight caching solution without external dependencies.
"""

from datetime import datetime, timedelta, UTC
from typing import Any, Optional
import threading


class InMemoryCache:
    """
    Thread-safe in-memory cache with TTL (time-to-live) support.

    Stores cache entries in memory with automatic expiration.
    Suitable for small to medium datasets that don't change frequently.

    Example:
        >>> cache = InMemoryCache(ttl_seconds=300)
        >>> cache.set("key1", {"data": "value"})
        >>> result = cache.get("key1")
    """

    def __init__(self, ttl_seconds: int = 300):
        """
        Initialize cache with TTL.

        Args:
            ttl_seconds: Time to live for cache entries in seconds (default: 300 = 5 minutes)
        """
        self._cache: dict[str, dict[str, Any]] = {}
        self._lock = threading.RLock()
        self.ttl_seconds = ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        """
        Retrieve value from cache if it exists and hasn't expired.

        Args:
            key: Cache key

        Returns:
            Cached value if exists and valid, None otherwise
        """
        with self._lock:
            if key not in self._cache:
                return None

            entry = self._cache[key]
            expires_at = entry["expires_at"]

            # Check if expired
            if datetime.now(UTC) > expires_at:
                del self._cache[key]
                return None

            return entry["value"]

    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        """
        Store value in cache with TTL.

        Args:
            key: Cache key
            value: Value to cache
            ttl_seconds: Custom TTL in seconds (uses default if not provided)
        """
        ttl = ttl_seconds if ttl_seconds is not None else self.ttl_seconds
        expires_at = datetime.now(UTC) + timedelta(seconds=ttl)

        with self._lock:
            self._cache[key] = {"value": value, "expires_at": expires_at}

    def delete(self, key: str) -> None:
        """
        Remove a specific key from cache.

        Args:
            key: Cache key to remove
        """
        with self._lock:
            self._cache.pop(key, None)

    def clear(self) -> None:
        """Clear all cache entries."""
        with self._lock:
            self._cache.clear()

    def clear_pattern(self, pattern: str) -> None:
        """
        Clear cache entries matching a pattern.

        Args:
            pattern: String pattern to match (simple substring match)

        Example:
            >>> cache.clear_pattern("inventory:")  # Clears all inventory cache keys
        """
        with self._lock:
            keys_to_delete = [key for key in self._cache if pattern in key]
            for key in keys_to_delete:
                del self._cache[key]

    def get_stats(self) -> dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dictionary with cache stats (size, ttl, entry count)
        """
        with self._lock:
            # Clean up expired entries first
            now = datetime.now(UTC)
            expired_keys = [
                key
                for key, entry in self._cache.items()
                if now > entry["expires_at"]
            ]
            for key in expired_keys:
                del self._cache[key]

            return {
                "entry_count": len(self._cache),
                "ttl_seconds": self.ttl_seconds,
                "keys": list(self._cache.keys()),
            }


# Global cache instance for inventory
# TTL of 5 minutes (300 seconds) - good balance between freshness and performance
inventory_cache = InMemoryCache(ttl_seconds=300)
