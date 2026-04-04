"""Redis cache singleton with async connection pooling."""

from __future__ import annotations

import json
from typing import Any

import redis.asyncio as aioredis

from app.config import get_settings

_KEY_PREFIX = "prepflow:"


class RedisCache:
    """Async Redis cache wrapper with singleton pattern and key prefixing."""

    _instance: RedisCache | None = None
    _client: aioredis.Redis | None = None

    def __new__(cls) -> RedisCache:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def connect(self) -> None:
        """Initialise the Redis connection pool."""
        if self._client is not None:
            return
        settings = get_settings()
        self._client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )

    async def disconnect(self) -> None:
        """Close the Redis connection pool."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    def _prefixed(self, key: str) -> str:
        return f"{_KEY_PREFIX}{key}"

    async def get(self, key: str) -> Any | None:
        """Retrieve a value by key.

        Returns the deserialised value, or None if the key does not exist.
        """
        assert self._client is not None, "RedisCache not connected"
        raw = await self._client.get(self._prefixed(key))
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return raw

    async def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        """Store a value under the given key.

        Args:
            key: Cache key (prefix is added automatically).
            value: Value to cache -- will be JSON-serialised.
            ttl: Time-to-live in seconds. Defaults to the configured REDIS_CACHE_TTL.
        """
        assert self._client is not None, "RedisCache not connected"
        settings = get_settings()
        ttl = ttl if ttl is not None else settings.REDIS_CACHE_TTL
        await self._client.set(
            self._prefixed(key),
            json.dumps(value),
            ex=ttl,
        )

    async def delete(self, key: str) -> bool:
        """Delete a key from the cache.

        Returns True if the key existed and was removed.
        """
        assert self._client is not None, "RedisCache not connected"
        result = await self._client.delete(self._prefixed(key))
        return result > 0

    async def exists(self, key: str) -> bool:
        """Check whether a key exists in the cache."""
        assert self._client is not None, "RedisCache not connected"
        return await self._client.exists(self._prefixed(key)) > 0

    async def flush_pattern(self, pattern: str) -> int:
        """Delete all keys matching *pattern* (glob-style).

        The configured key prefix is prepended automatically.

        Returns the number of deleted keys.
        """
        assert self._client is not None, "RedisCache not connected"
        full_pattern = self._prefixed(pattern)
        deleted = 0
        async for key in self._client.scan_iter(match=full_pattern):
            await self._client.delete(key)
            deleted += 1
        return deleted


def get_cache() -> RedisCache:
    """Return the RedisCache singleton instance."""
    return RedisCache()
