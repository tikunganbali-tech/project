import { NextRequest, NextResponse } from 'next/server';
// DISABLED: Engine module not available
// import { subscribeUser } from '@/lib/engines/traffic-retention-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, type, preferences } = body;

    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone required' }, { status: 400 });
    }

    // DISABLED: Traffic retention engine not available
    // await subscribeUser({
    //   email,
    //   phone,
    //   type: type || 'whatsapp',
    //   preferences,
    // });

    return NextResponse.json({ success: true, message: 'Subscription disabled - engine module not available' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}












