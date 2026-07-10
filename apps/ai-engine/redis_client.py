import os

import redis.asyncio as redis

# Global Redis connection pool
_redis_pool = None


def get_redis_pool() -> redis.Redis:
    global _redis_pool
    if _redis_pool is None:
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
        _redis_pool = redis.from_url(redis_url, decode_responses=True, protocol=2)
    return _redis_pool
