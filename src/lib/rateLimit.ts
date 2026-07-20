/**
 * Dependency-free token-bucket rate limiter with an injectable clock.
 *
 * One bucket per key (e.g. per client IP). Each key gets `capacity` tokens of
 * burst; tokens refill continuously at `refillPerSecond`. A request costs one
 * token (configurable). The clock is injectable so the whole thing is testable
 * offline with a synthetic time source — no timers, no wall-clock dependency.
 *
 * State is in-process: within one server instance it protects a route from
 * abuse/cost spikes. Across a horizontally-scaled deployment each instance keeps
 * its own buckets — fine for shedding the obvious floods this guards against.
 */

export interface RateLimitOptions {
  /** Maximum burst — the number of tokens a fresh key starts with and is capped at. */
  capacity: number;
  /** Sustained rate: tokens replenished per second. */
  refillPerSecond: number;
  /** Injectable clock in ms. Defaults to Date.now. */
  now?: () => number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Whole tokens remaining after this check. */
  remaining: number;
  /** Milliseconds until the next token is available (0 when allowed). */
  retryAfterMs: number;
  /** The bucket capacity, for X-RateLimit-Limit headers. */
  limit: number;
}

interface Bucket {
  tokens: number;
  last: number;
}

const SWEEP_INTERVAL_MS = 60_000;

export class RateLimiter {
  private readonly capacity: number;
  private readonly refillPerMs: number;
  private readonly now: () => number;
  private readonly buckets = new Map<string, Bucket>();
  private lastSweep: number;

  constructor(options: RateLimitOptions) {
    if (options.capacity <= 0) throw new Error('RateLimiter: capacity must be > 0');
    if (options.refillPerSecond <= 0) throw new Error('RateLimiter: refillPerSecond must be > 0');
    this.capacity = options.capacity;
    this.refillPerMs = options.refillPerSecond / 1000;
    this.now = options.now ?? Date.now;
    this.lastSweep = this.now();
  }

  /** Try to spend `cost` tokens for `key`. Never throws; returns the decision. */
  check(key: string, cost = 1): RateLimitResult {
    const now = this.now();
    this.maybeSweep(now);

    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, last: now };
    const refilled = Math.min(
      this.capacity,
      bucket.tokens + (now - bucket.last) * this.refillPerMs,
    );

    if (refilled >= cost) {
      const tokens = refilled - cost;
      this.buckets.set(key, { tokens, last: now });
      return { allowed: true, remaining: Math.floor(tokens), retryAfterMs: 0, limit: this.capacity };
    }

    this.buckets.set(key, { tokens: refilled, last: now });
    const retryAfterMs = Math.ceil((cost - refilled) / this.refillPerMs);
    return { allowed: false, remaining: Math.floor(refilled), retryAfterMs, limit: this.capacity };
  }

  /** Drop one key's bucket, or all of them. */
  reset(key?: string): void {
    if (key === undefined) this.buckets.clear();
    else this.buckets.delete(key);
  }

  /** Number of tracked keys (buckets) — for observability/tests. */
  size(): number {
    return this.buckets.size;
  }

  /**
   * Evict buckets that have fully refilled: a missing bucket is treated as a
   * fresh, full one, so a full idle bucket carries no information. Keeps memory
   * bounded under a churn of unique keys without any background timer.
   */
  private maybeSweep(now: number): void {
    if (now - this.lastSweep < SWEEP_INTERVAL_MS) return;
    this.lastSweep = now;
    const fullAfterMs = this.capacity / this.refillPerMs;
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.last >= fullAfterMs) this.buckets.delete(key);
    }
  }
}
