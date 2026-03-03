import { NextRequest, NextResponse } from 'next/server';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/session';

const TOTP_OPTS = { algorithm: 'sha1' as const, digits: 6, period: 30, type: 'totp' as const };

// GET: generate a new TOTP secret and return QR code
export async function GET(request: NextRequest) {
    const session = await readSession(request);
    if (!session.userId) {
        return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const secret = generateSecret();
    const otpauth = generateURI({
        label: session.email!,
        issuer: 'Rentmaestro',
        secret,
        ...TOTP_OPTS,
    });
    const qrDataUrl = await QRCode.toDataURL(otpauth);

    return NextResponse.json({ secret, qrDataUrl });
}

// POST: verify the code with the candidate secret, then save and enable TOTP
export async function POST(request: NextRequest) {
    const session = await readSession(request);
    if (!session.userId) {
        return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const { secret, code } = await request.json();

    const result = await verify({ token: code, secret, ...TOTP_OPTS });
    if (!result.valid) {
        return NextResponse.json({ error: 'Code incorrect. Veuillez réessayer.' }, { status: 400 });
    }

    await prisma.user.update({
        where: { id: session.userId },
        data: { totpSecret: secret, totpEnabled: true },
    });

    return NextResponse.json({ success: true });
}

// DELETE: disable TOTP
export async function DELETE(request: NextRequest) {
    const session = await readSession(request);
    if (!session.userId) {
        return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    await prisma.user.update({
        where: { id: session.userId },
        data: { totpSecret: null, totpEnabled: false },
    });

    return NextResponse.json({ success: true });
}
