import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../rateLimit';

/** A controllable clock so time is deterministic and no timers are involved. */
function fakeClock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe('RateLimiter (token bucket, synthetic clock)', () => {
  it('allows a burst up to capacity, then denies', () => {
    const clock = fakeClock();
    const rl = new RateLimiter({ capacity: 3, refillPerSecond: 1, now: clock.now });

    expect(rl.check('ip').allowed).toBe(true);
    expect(rl.check('ip').allowed).toBe(true);
    const third = rl.check('ip');
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);

    const denied = rl.check('ip');
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.retryAfterMs).toBe(1000); // 1 token/sec → 1s to earn the next
  });

  it('refills continuously as the clock advances', () => {
    const clock = fakeClock();
    const rl = new RateLimiter({ capacity: 2, refillPerSecond: 2, now: clock.now });

    rl.check('ip');
    rl.check('ip');
    expect(rl.check('ip').allowed).toBe(false);

    clock.advance(500); // 2 tokens/sec × 0.5s = 1 token
    const after = rl.check('ip');
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(0);
  });

  it('caps refill at capacity (no unbounded accumulation while idle)', () => {
    const clock = fakeClock();
    const rl = new RateLimiter({ capacity: 3, refillPerSecond: 1, now: clock.now });

    rl.check('ip'); // spend 1 → 2 left
    clock.advance(60_000); // would earn 60 tokens, but cap is 3

    expect(rl.check('ip').allowed).toBe(true);
    expect(rl.check('ip').allowed).toBe(true);
    expect(rl.check('ip').allowed).toBe(true);
    expect(rl.check('ip').allowed).toBe(false); // only 3, not 62
  });

  it('reports a shrinking retryAfter as tokens partially refill', () => {
    const clock = fakeClock();
    const rl = new RateLimiter({ capacity: 1, refillPerSecond: 1, now: clock.now });

    expect(rl.check('ip').allowed).toBe(true);
    expect(rl.check('ip').retryAfterMs).toBe(1000);

    clock.advance(400);
    expect(rl.check('ip').retryAfterMs).toBe(600); // 0.6s of the 1s token left
  });

  it('keeps buckets independent per key', () => {
    const clock = fakeClock();
    const rl = new RateLimiter({ capacity: 1, refillPerSecond: 1, now: clock.now });

    expect(rl.check('a').allowed).toBe(true);
    expect(rl.check('a').allowed).toBe(false);
    // b has its own budget
    expect(rl.check('b').allowed).toBe(true);
  });

  it('reset clears a key (or all keys)', () => {
    const clock = fakeClock();
    const rl = new RateLimiter({ capacity: 1, refillPerSecond: 1, now: clock.now });

    rl.check('a');
    expect(rl.check('a').allowed).toBe(false);
    rl.reset('a');
    expect(rl.check('a').allowed).toBe(true);
  });

  it('sweeps fully-refilled idle buckets to bound memory', () => {
    const clock = fakeClock();
    const rl = new RateLimiter({ capacity: 2, refillPerSecond: 1, now: clock.now });

    rl.check('a');
    rl.check('b');
    expect(rl.size()).toBe(2);

    // Past the sweep interval AND past the time for both to fully refill.
    clock.advance(120_000);
    rl.check('c'); // triggers the opportunistic sweep
    expect(rl.size()).toBe(1); // a and b evicted, only c remains
  });

  it('rejects invalid configuration', () => {
    expect(() => new RateLimiter({ capacity: 0, refillPerSecond: 1 })).toThrow();
    expect(() => new RateLimiter({ capacity: 1, refillPerSecond: 0 })).toThrow();
  });
});
