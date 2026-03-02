import { NextRequest, NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { getSessionFromRouteHandler } from '@/lib/session';

// GET: generate a new TOTP secret and return QR code
export async function GET(request: NextRequest) {
    const res = NextResponse.next();
    const session = await getSessionFromRouteHandler(request, res);
    if (!session.userId) {
        return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const secret = authenticator.generateSecret();
    const issuer = 'Rentmaestro';
    const otpauth = authenticator.keyuri(session.email!, issuer, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);

    return NextResponse.json({ secret, qrDataUrl });
}

// POST: verify the code with the candidate secret, then save and enable TOTP
export async function POST(request: NextRequest) {
    const res = NextResponse.next();
    const session = await getSessionFromRouteHandler(request, res);
    if (!session.userId) {
        return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const { secret, code } = await request.json();

    const valid = authenticator.verify({ token: code, secret });
    if (!valid) {
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
    const res = NextResponse.next();
    const session = await getSessionFromRouteHandler(request, res);
    if (!session.userId) {
        return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    await prisma.user.update({
        where: { id: session.userId },
        data: { totpSecret: null, totpEnabled: false },
    });

    return NextResponse.json({ success: true });
}
