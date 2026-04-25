import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getSession } from '@/lib/session';
import { getUserById } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getWebAuthnConfig } from '@/lib/webauthn';

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const challenge = session.pendingPasskeyChallenge;
    if (!challenge) return NextResponse.json({ error: 'Aucun défi en cours' }, { status: 400 });

    const user = await getUserById(session.userId);
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

    const { rpID, origin } = getWebAuthnConfig(req);
    const body = await req.json();

    try {
        const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge: challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        });

        if (!verification.verified || !verification.registrationInfo) {
            return NextResponse.json({ error: 'Vérification échouée' }, { status: 400 });
        }

        const { credential } = verification.registrationInfo;

        await prisma.passkey.create({
            data: {
                userId: user.id,
                credentialId: credential.id,
                publicKey: Buffer.from(credential.publicKey),
                counter: BigInt(credential.counter),
                transports: body.response?.transports?.join(',') ?? null,
            },
        });

        session.pendingPasskeyChallenge = undefined;
        await session.save();

        return NextResponse.json({ verified: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Erreur' }, { status: 400 });
    }
}
