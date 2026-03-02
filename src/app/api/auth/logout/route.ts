import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRouteHandler } from '@/lib/session';

export async function POST(request: NextRequest) {
    const res = NextResponse.json({ success: true });
    const session = await getSessionFromRouteHandler(request, res);
    session.destroy();
    return res;
}
