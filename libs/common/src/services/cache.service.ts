import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleInit() {
    // Test connection
    try {
      await this.client.ping();
      console.log('✅ Redis cache connected');
    } catch (error) {
      console.error('❌ Redis connection error:', error);
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a single key from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const stream = this.client.scanStream({
        match: pattern,
        count: 100,
      });

      let deletedCount = 0;
      for await (const keys of stream) {
        if (keys.length > 0) {
          deletedCount += await this.client.del(...keys);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate all cache entries for a specific entity type and ID
   */
  async invalidateEntity(entityType: string, entityId: string): Promise<void> {
    const patterns = [
      `${entityType}:${entityId}:*`,
      `${entityType}:*:${entityId}*`,
      `${entityType}:list:*`,
      `${entityType}:*:list`,
    ];

    for (const pattern of patterns) {
      await this.deletePattern(pattern);
    }
  }

  /**
   * Invalidate cache for a specific user
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.invalidateEntity('user', userId);
    // Also invalidate auth-related cache
    await this.deletePattern(`auth:credential:${userId}*`);
    await this.deletePattern(`auth:session:${userId}*`);
  }

  /**
   * Invalidate cache for a specific entity
   */
  async invalidateEntityCache(entityId: string): Promise<void> {
    await this.invalidateEntity('entity', entityId);
    // Invalidate related branches cache
    await this.deletePattern(`branch:*:${entityId}*`);
    await this.deletePattern(`branch:list:*:${entityId}*`);
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async getTTL(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment a numeric value
   */
  async increment(key: string, by: number = 1): Promise<number> {
    try {
      return await this.client.incrby(key, by);
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Decrement a numeric value
   */
  async decrement(key: string, by: number = 1): Promise<number> {
    try {
      return await this.client.decrby(key, by);
    } catch (error) {
      console.error(`Cache decrement error for key ${key}:`, error);
      return 0;
    }
  }
}
