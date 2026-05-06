import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/session';

export async function POST(request: NextRequest) {
    const session = await readSession(request);
    if (!session.userId) {
        return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const { endpoint } = await request.json();
    if (!endpoint) {
        return NextResponse.json({ error: 'endpoint manquant.' }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({ where: { endpoint } });

    return NextResponse.json({ success: true });
}
