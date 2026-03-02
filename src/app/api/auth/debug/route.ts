import { NextRequest, NextResponse } from 'next/server';
import { unsealData } from 'iron-session';
import { SESSION_OPTIONS } from '@/lib/session';

// Temporary debug endpoint — remove after diagnosis
export async function GET(request: NextRequest) {
    const cookieName = SESSION_OPTIONS.cookieName;
    const rawCookie = request.cookies.get(cookieName)?.value;

    if (!rawCookie) {
        return NextResponse.json({ hasCookie: false, cookies: [...request.cookies.getAll().map(c => c.name)] });
    }

    try {
        const session = await unsealData(rawCookie, {
            password: SESSION_OPTIONS.password as string,
            ttl: SESSION_OPTIONS.ttl,
        });
        return NextResponse.json({ hasCookie: true, session });
    } catch (e) {
        return NextResponse.json({ hasCookie: true, decryptError: String(e) });
    }
}
