import { NextResponse } from 'next/server';
// DISABLED: Init module not available
// import { initializeServer } from '@/lib/init';

// Initialize cron jobs and SEO Titan (call this on server startup or via API)
export async function GET() {
  try {
    // DISABLED: Init module not available
    // await initializeServer();
    return NextResponse.json({ success: true, message: 'Server initialization disabled - init module not available' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



