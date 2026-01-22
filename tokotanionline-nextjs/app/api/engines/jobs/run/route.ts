import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || (session.user as any).role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const baseUrl = process.env.ENGINE_HUB_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: 'ENGINE_HUB_URL not set' },
      { status: 500 }
    );
  }

  const res = await fetch(
    `${baseUrl}/engines/jobs/run`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  return NextResponse.json({ ok: res.ok });
}


