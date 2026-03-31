import { createHmac } from 'crypto';

interface MobileTokenPayload {
    userId: string;
    email: string;
    exp: number;
}

function secret(): string {
    return process.env.SESSION_SECRET || 'fallback-secret-please-set-SESSION_SECRET';
}

export function signMobileToken(userId: string, email: string): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        userId,
        email,
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, // 30 days
    })).toString('base64url');
    const sig = createHmac('sha256', secret()).update(`${header}.${payload}`).digest('base64url');
    return `${header}.${payload}.${sig}`;
}

export function verifyMobileToken(request: Request): { userId: string; email: string } | null {
    const auth = request.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) return null;
    const token = auth.slice(7).trim();
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payloadB64, sig] = parts;
    const expected = createHmac('sha256', secret()).update(`${header}.${payloadB64}`).digest('base64url');
    if (sig !== expected) return null;
    try {
        const p: MobileTokenPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
        if (p.exp < Math.floor(Date.now() / 1000)) return null;
        return { userId: p.userId, email: p.email };
    } catch {
        return null;
    }
}

export function unauthorized() {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
    });
}
