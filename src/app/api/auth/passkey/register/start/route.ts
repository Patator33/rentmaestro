import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import { getSession } from '@/lib/session';
import { getUserById } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getWebAuthnConfig } from '@/lib/webauthn';

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const user = await getUserById(session.userId);
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

    const { rpID } = getWebAuthnConfig(req);

    const existingPasskeys = await prisma.passkey.findMany({ where: { userId: user.id } });

    const options = await generateRegistrationOptions({
        rpName: 'Rentmaestro',
        rpID,
        userName: user.email,
        userID: isoUint8Array.fromUTF8String(user.id),
        attestationType: 'none',
        excludeCredentials: existingPasskeys.map(pk => ({
            id: pk.credentialId,
            transports: pk.transports ? (pk.transports.split(',') as AuthenticatorTransport[]) : undefined,
        })),
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
        },
    });

    session.pendingPasskeyChallenge = options.challenge;
    await session.save();

    return NextResponse.json(options);
}
