import { getIronSession, IronSession, SessionOptions, unsealData } from 'iron-session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export interface SessionData {
    userId?: string;
    email?: string;
    pendingTotp?: boolean; // password ok but TOTP not yet verified
    pendingPasskeyChallenge?: string; // WebAuthn challenge in progress
}

// Marqueurs de valeurs par défaut qui ne doivent JAMAIS servir en production :
// une clé publique connue permettrait de forger un cookie de session valide.
const INSECURE_SECRET_MARKERS = ['CHANGEZ_MOI', 'CHANGE_ME', 'remplacez_moi'];

/**
 * Renvoie le secret de session après validation, ou lève une erreur explicite.
 *
 * Validé paresseusement (à l'usage, pas à l'import) pour ne pas casser
 * `next build` quand la variable n'est pas encore injectée. iron-session exige
 * au moins 32 caractères.
 */
export function getSessionSecret(): string {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error(
            'SESSION_SECRET manquant ou trop court : définissez une clé aléatoire d\'au moins 32 caractères ' +
            '(ex. `node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"`).'
        );
    }
    if (INSECURE_SECRET_MARKERS.some(m => secret.includes(m))) {
        throw new Error('SESSION_SECRET utilise encore une valeur par défaut : générez une vraie clé aléatoire.');
    }
    return secret;
}

export const SESSION_OPTIONS: SessionOptions = {
    // Getter paresseux : la validation n'a lieu qu'au moment où iron-session
    // (ou une route) lit réellement le secret.
    get password() {
        return getSessionSecret();
    },
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

/**
 * Guard for Server Actions. Throws if the caller is not fully authenticated.
 *
 * Server Actions are dispatched by their action id regardless of the URL they
 * are POSTed to, so the middleware alone does NOT protect them: an attacker can
 * invoke any action through a public route. Every landlord-facing action must
 * therefore call this itself. Returns the authenticated userId.
 */
export async function requireAuth(): Promise<string> {
    const session = await getSession();
    if (!session.userId || session.pendingTotp) {
        throw new Error('Non autorisé');
    }
    return session.userId;
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
