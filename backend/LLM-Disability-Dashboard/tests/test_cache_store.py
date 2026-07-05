import asyncio
import time

import pytest

from app.services.cache_store import InMemoryBackend, TieredCacheStore


@pytest.mark.asyncio
async def test_in_memory_cache_ttl_expiry():
    backend = InMemoryBackend(max_entries=16, ttl_seconds=1)
    await backend.set("key", "value", 1)
    assert await backend.get("key") == "value"
    time.sleep(1.1)
    assert await backend.get("key") is None


@pytest.mark.asyncio
async def test_tiered_cache_set_and_get():
    cache = TieredCacheStore(l1=InMemoryBackend(max_entries=16, ttl_seconds=300), l2=None, l3=None)
    await cache.set("wf:test", {"ok": True}, 60)
    result = await cache.get("wf:test")
    assert result == {"ok": True}


@pytest.mark.asyncio
async def test_delete_pattern():
    cache = TieredCacheStore(l1=InMemoryBackend(max_entries=16, ttl_seconds=300), l2=None, l3=None)
    await cache.set("wf:one", {"a": 1}, 60)
    await cache.set("wf:two", {"b": 2}, 60)
    await cache.set("llm:three", {"c": 3}, 60)
    deleted = await cache.delete_pattern("wf:")
    assert deleted == 2
    assert await cache.get("wf:one") is None
    assert await cache.get("llm:three") == {"c": 3}
