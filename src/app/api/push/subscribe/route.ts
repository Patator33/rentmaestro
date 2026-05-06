import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/session';

export async function POST(request: NextRequest) {
    const session = await readSession(request);
    if (!session.userId) {
        return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const sub: PushSubscriptionJSON = await request.json();
    if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
        return NextResponse.json({ error: 'Souscription invalide.' }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
        where: { endpoint: sub.endpoint },
        update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        create: { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });

    return NextResponse.json({ success: true });
}
