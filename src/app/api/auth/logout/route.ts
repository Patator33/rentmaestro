import { NextResponse } from 'next/server';
import { SESSION_OPTIONS } from '@/lib/session';

export async function POST() {
    const response = NextResponse.json({ success: true });
    response.cookies.set({
        name: SESSION_OPTIONS.cookieName,
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
    });
    return response;
}
