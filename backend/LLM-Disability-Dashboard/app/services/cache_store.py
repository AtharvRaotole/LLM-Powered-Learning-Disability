"""Multi-tier cache: L1 in-memory, L2 Redis, L3 SQLite fallback."""
from __future__ import annotations

import json
import logging
import os
import sqlite3
import time
from abc import ABC, abstractmethod
from collections import OrderedDict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_L1_TTL = 300
DEFAULT_L2_TTL = 86400
DEFAULT_L1_SIZE = 256


@dataclass
class CacheStats:
    l1_hits: int = 0
    l1_misses: int = 0
    l2_hits: int = 0
    l2_misses: int = 0
    l3_hits: int = 0
    l3_misses: int = 0
    sets: int = 0


class BaseCacheBackend(ABC):
    @abstractmethod
    async def get(self, key: str) -> Optional[str]:
        ...

    @abstractmethod
    async def set(self, key: str, value: str, ttl: int) -> None:
        ...

    @abstractmethod
    async def delete_pattern(self, pattern: str) -> int:
        ...

    @abstractmethod
    async def stats(self) -> Dict[str, Any]:
        ...


class InMemoryBackend(BaseCacheBackend):
    def __init__(self, *, max_entries: int = DEFAULT_L1_SIZE, ttl_seconds: int = DEFAULT_L1_TTL) -> None:
        self.max_entries = max(1, max_entries)
        self.ttl_seconds = max(0, ttl_seconds)
        self._store: OrderedDict[str, tuple[float, str]] = OrderedDict()

    async def get(self, key: str) -> Optional[str]:
        entry = self._store.get(key)
        if entry is None:
            return None
        created_at, payload = entry
        if self.ttl_seconds and (time.time() - created_at) > self.ttl_seconds:
            self._store.pop(key, None)
            return None
        self._store.move_to_end(key)
        return payload

    async def set(self, key: str, value: str, ttl: int) -> None:
        if key in self._store:
            self._store.move_to_end(key)
        elif len(self._store) >= self.max_entries:
            self._store.popitem(last=False)
        self._store[key] = (time.time(), value)

    async def delete_pattern(self, pattern: str) -> int:
        prefix = pattern.rstrip("*")
        keys = [k for k in self._store if k.startswith(prefix)]
        for key in keys:
            self._store.pop(key, None)
        return len(keys)

    async def stats(self) -> Dict[str, Any]:
        return {"entries": len(self._store), "max_entries": self.max_entries}


class SQLiteBackend(BaseCacheBackend):
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS cache_entries (
                    key TEXT PRIMARY KEY,
                    payload TEXT NOT NULL,
                    expires_at REAL NOT NULL
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at)")

    async def get(self, key: str) -> Optional[str]:
        now = time.time()
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT payload, expires_at FROM cache_entries WHERE key = ?",
                (key,),
            ).fetchone()
            if row is None:
                return None
            payload, expires_at = row
            if expires_at < now:
                conn.execute("DELETE FROM cache_entries WHERE key = ?", (key,))
                return None
            return payload

    async def set(self, key: str, value: str, ttl: int) -> None:
        expires_at = time.time() + max(1, ttl)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO cache_entries (key, payload, expires_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, expires_at = excluded.expires_at
                """,
                (key, value, expires_at),
            )

    async def delete_pattern(self, pattern: str) -> int:
        prefix = pattern.rstrip("*")
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.execute("DELETE FROM cache_entries WHERE key LIKE ?", (f"{prefix}%",))
            return cur.rowcount

    async def stats(self) -> Dict[str, Any]:
        now = time.time()
        with sqlite3.connect(self.db_path) as conn:
            total = conn.execute("SELECT COUNT(*) FROM cache_entries").fetchone()[0]
            active = conn.execute(
                "SELECT COUNT(*) FROM cache_entries WHERE expires_at >= ?",
                (now,),
            ).fetchone()[0]
        return {"entries": active, "total_rows": total, "db_path": self.db_path}


class RedisBackend(BaseCacheBackend):
    def __init__(self, url: str) -> None:
        import redis.asyncio as redis  # type: ignore[import-untyped]

        self._client = redis.from_url(url, decode_responses=True)
        self._url = url

    async def get(self, key: str) -> Optional[str]:
        return await self._client.get(key)

    async def set(self, key: str, value: str, ttl: int) -> None:
        await self._client.set(key, value, ex=max(1, ttl))

    async def delete_pattern(self, pattern: str) -> int:
        prefix = pattern.rstrip("*")
        count = 0
        async for key in self._client.scan_iter(match=f"{prefix}*"):
            await self._client.delete(key)
            count += 1
        return count

    async def stats(self) -> Dict[str, Any]:
        try:
            info = await self._client.info("keyspace")
            return {"redis_url": self._url, "keyspace": info}
        except Exception as exc:
            return {"redis_url": self._url, "error": str(exc)}


class TieredCacheStore:
    """L1 memory -> L2 Redis (optional) -> L3 SQLite."""

    def __init__(
        self,
        *,
        l1: Optional[InMemoryBackend] = None,
        l2: Optional[BaseCacheBackend] = None,
        l3: Optional[SQLiteBackend] = None,
    ) -> None:
        self.l1 = l1 or InMemoryBackend()
        self.l2 = l2
        self.l3 = l3
        self.stats = CacheStats()

    async def get(self, key: str) -> Optional[Any]:
        raw = await self.l1.get(key)
        if raw is not None:
            self.stats.l1_hits += 1
            return json.loads(raw)

        if self.l2 is not None:
            raw = await self.l2.get(key)
            if raw is not None:
                self.stats.l2_hits += 1
                await self.l1.set(key, raw, DEFAULT_L1_TTL)
                return json.loads(raw)
            self.stats.l2_misses += 1

        if self.l3 is not None:
            raw = await self.l3.get(key)
            if raw is not None:
                self.stats.l3_hits += 1
                await self.l1.set(key, raw, DEFAULT_L1_TTL)
                if self.l2 is not None:
                    await self.l2.set(key, raw, DEFAULT_L2_TTL)
                return json.loads(raw)
            self.stats.l3_misses += 1

        self.stats.l1_misses += 1
        return None

    async def set(self, key: str, value: Any, ttl: int = DEFAULT_L2_TTL) -> None:
        raw = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        await self.l1.set(key, raw, min(ttl, DEFAULT_L1_TTL))
        if self.l2 is not None:
            await self.l2.set(key, raw, ttl)
        if self.l3 is not None:
            await self.l3.set(key, raw, ttl)
        self.stats.sets += 1

    async def delete_pattern(self, pattern: str) -> int:
        total = await self.l1.delete_pattern(pattern)
        if self.l2 is not None:
            total += await self.l2.delete_pattern(pattern)
        if self.l3 is not None:
            total += await self.l3.delete_pattern(pattern)
        return total

    async def get_stats(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "l1_hits": self.stats.l1_hits,
            "l1_misses": self.stats.l1_misses,
            "l2_hits": self.stats.l2_hits,
            "l2_misses": self.stats.l2_misses,
            "l3_hits": self.stats.l3_hits,
            "l3_misses": self.stats.l3_misses,
            "sets": self.stats.sets,
            "l1": await self.l1.stats(),
        }
        if self.l2 is not None:
            result["l2"] = await self.l2.stats()
        if self.l3 is not None:
            result["l3"] = await self.l3.stats()
        return result


_store: Optional[TieredCacheStore] = None


def create_cache_store() -> TieredCacheStore:
    l1_ttl = int(os.getenv("CACHE_L1_TTL", str(DEFAULT_L1_TTL)))
    l1_size = int(os.getenv("LANGGRAPH_CACHE_SIZE", str(DEFAULT_L1_SIZE)))
    l1 = InMemoryBackend(max_entries=l1_size, ttl_seconds=l1_ttl)

    l2: Optional[BaseCacheBackend] = None
    redis_url = os.getenv("REDIS_URL", "").strip()
    if redis_url:
        try:
            l2 = RedisBackend(redis_url)
            logger.info("Cache L2: Redis at %s", redis_url)
        except Exception as exc:
            logger.warning("Redis unavailable, using SQLite only for L2: %s", exc)

    db_path = os.getenv(
        "CACHE_SQLITE_PATH",
        str(Path(__file__).resolve().parents[2] / "data" / "cache.db"),
    )
    l3 = SQLiteBackend(db_path)
    logger.info("Cache L3: SQLite at %s", db_path)

    return TieredCacheStore(l1=l1, l2=l2, l3=l3)


def get_cache_store() -> TieredCacheStore:
    global _store
    if _store is None:
        _store = create_cache_store()
    return _store


__all__ = ["TieredCacheStore", "get_cache_store", "create_cache_store"]
