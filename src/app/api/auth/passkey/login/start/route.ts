import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getSession } from '@/lib/session';
import { getWebAuthnConfig } from '@/lib/webauthn';

export async function POST(req: NextRequest) {
    const { rpID } = getWebAuthnConfig(req);

    const options = await generateAuthenticationOptions({
        rpID,
        userVerification: 'preferred',
        allowCredentials: [],
    });

    const session = await getSession();
    session.pendingPasskeyChallenge = options.challenge;
    await session.save();

    return NextResponse.json(options);
}
