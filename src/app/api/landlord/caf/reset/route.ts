import { NextResponse } from 'next/server';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { resetCafReceived } from '@/lib/caf';

export const dynamic = 'force-dynamic';

// POST { leaseId, month: "YYYY-MM" } — annule la part CAF reçue ce mois-là
export async function POST(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const body = await request.json().catch(() => null);
    const { leaseId, month } = body ?? {};
    if (!leaseId || typeof leaseId !== 'string' || !/^\d{4}-\d{2}$/.test(month ?? '')) {
        return NextResponse.json({ error: 'leaseId et month (YYYY-MM) requis.' }, { status: 400 });
    }

    try {
        await resetCafReceived(leaseId, month, 'mobile');
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur' }, { status: 400 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
