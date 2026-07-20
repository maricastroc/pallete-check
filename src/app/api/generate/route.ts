import { NextResponse } from 'next/server';
import { generatePalette, UnusableInputError } from '@/features/llm/client';
import { GenerateInputSchema } from '@/features/llm/schema';
import { RateLimiter, type RateLimitResult } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const num = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const BURST = num(process.env.RATE_LIMIT_BURST, 8);
const PER_MINUTE = num(process.env.RATE_LIMIT_PER_MINUTE, 8);

const limiter = new RateLimiter({ capacity: BURST, refillPerSecond: PER_MINUTE / 60 });

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function rateLimitHeaders(rl: RateLimitResult, retryAfterSec?: number): HeadersInit {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(rl.limit),
    'X-RateLimit-Remaining': String(rl.remaining),
  };
  if (retryAfterSec !== undefined) headers['Retry-After'] = String(retryAfterSec);
  return headers;
}

export async function POST(req: Request) {
  const rl = limiter.check(clientIp(req));
  if (!rl.allowed) {
    const retryAfterSec = Math.max(1, Math.ceil(rl.retryAfterMs / 1000));
    return NextResponse.json(
      { error: `Too many requests — retry in ${retryAfterSec}s.` },
      { status: 429, headers: rateLimitHeaders(rl, retryAfterSec) },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const parsed = GenerateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input.', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await generatePalette(parsed.data);
    return NextResponse.json(result, { headers: rateLimitHeaders(rl) });
  } catch (err) {
    // A deliberate model refusal is not a failure — surface it honestly as 422.
    if (err instanceof UnusableInputError) {
      return NextResponse.json(
        { error: err.reason, unusable: true },
        { status: 422, headers: rateLimitHeaders(rl) },
      );
    }
    const message = err instanceof Error ? err.message : 'Generation failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
