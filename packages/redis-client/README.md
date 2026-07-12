# @sherlock/redis-client — Shared Redis Connection Factory

## Purpose

Singleton Redis connection factory used by all TypeScript services.

## Usage

```typescript
import { getRedisClient } from '@sherlock/redis-client';

const redis = getRedisClient();
await redis.publish('channel', JSON.stringify(data));
```

## Configuration

Reads `REDIS_URL` from environment variables. Defaults to `redis://localhost:6379`.
