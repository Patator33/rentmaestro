import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getSession, SESSION_OPTIONS } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getWebAuthnConfig } from '@/lib/webauthn';
import { sealData } from 'iron-session';

export async function POST(req: NextRequest) {
    const session = await getSession();
    const challenge = session.pendingPasskeyChallenge;
    if (!challenge) return NextResponse.json({ error: 'Aucun défi en cours' }, { status: 400 });

    const { rpID, origin } = getWebAuthnConfig(req);
    const body = await req.json();

    const passkey = await prisma.passkey.findUnique({ where: { credentialId: body.id }, include: { user: true } });
    if (!passkey) return NextResponse.json({ error: 'Clé inconnue' }, { status: 400 });

    try {
        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge: challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: {
                id: passkey.credentialId,
                publicKey: new Uint8Array(passkey.publicKey),
                counter: Number(passkey.counter),
                transports: passkey.transports ? (passkey.transports.split(',') as AuthenticatorTransport[]) : undefined,
            },
        });

        if (!verification.verified) return NextResponse.json({ error: 'Vérification échouée' }, { status: 400 });

        await prisma.passkey.update({
            where: { id: passkey.id },
            data: { counter: BigInt(verification.authenticationInfo.newCounter) },
        });

        const newSessionData = { userId: passkey.user.id, email: passkey.user.email };
        const sealed = await sealData(newSessionData, { password: SESSION_OPTIONS.password as string });

        const secure = process.env.COOKIE_SECURE === 'true';
        const cookieHeader = `${SESSION_OPTIONS.cookieName}=${sealed}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_OPTIONS.ttl}${secure ? '; Secure' : ''}`;

        return NextResponse.json({ verified: true }, {
            headers: { 'Set-Cookie': cookieHeader },
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Erreur' }, { status: 400 });
    }
}
