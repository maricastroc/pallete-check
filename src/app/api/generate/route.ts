import { NextResponse } from 'next/server';
import { generatePalette } from '@/features/llm/client';
import { GenerateInputSchema } from '@/features/llm/schema';

// The Anthropic SDK needs the Node.js runtime, and each request is unique.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
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
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
