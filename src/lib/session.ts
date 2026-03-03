import { getIronSession, IronSession, SessionOptions, unsealData } from 'iron-session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export interface SessionData {
    userId?: string;
    email?: string;
    pendingTotp?: boolean; // password ok but TOTP not yet verified
}

export const SESSION_OPTIONS: SessionOptions = {
    password: process.env.SESSION_SECRET as string,
    cookieName: 'rentmaestro_session',
    ttl: 60 * 60 * 8, // 8 hours
    cookieOptions: {
        secure: process.env.COOKIE_SECURE === 'true',
        httpOnly: true,
        sameSite: 'lax',
    },
};

// For use in Server Components / Server Actions (via next/headers)
export async function getSession(): Promise<IronSession<SessionData>> {
    const cookieStore = await cookies();
    return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}

// For Route Handlers: reads session directly from request cookies (Next.js 16 workaround)
export async function readSession(req: NextRequest): Promise<SessionData> {
    const cookieValue = req.cookies.get(SESSION_OPTIONS.cookieName)?.value;
    if (!cookieValue) return {};
    try {
        return await unsealData<SessionData>(cookieValue, {
            password: SESSION_OPTIONS.password as string,
        });
    } catch {
        return {};
    }
}

// For Middleware only (no access to next/headers)
export async function getSessionFromRequest(
    req: NextRequest,
    res: NextResponse
): Promise<IronSession<SessionData>> {
    return getIronSession<SessionData>(req, res, SESSION_OPTIONS);
}
