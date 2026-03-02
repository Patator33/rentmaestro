import { NextResponse } from 'next/server';
import { SESSION_OPTIONS } from '@/lib/session';

export async function POST() {
    const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : '';
    const clearCookie = `${SESSION_OPTIONS.cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
    return new NextResponse(
        JSON.stringify({ success: true }),
        {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': clearCookie,
            },
        }
    );
}
