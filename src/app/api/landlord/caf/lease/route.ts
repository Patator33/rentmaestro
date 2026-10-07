import { NextResponse } from 'next/server';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { updateCafMonthlyAmount } from '@/lib/caf';

export const dynamic = 'force-dynamic';

// POST { leaseId, amount } — montant CAF mensuel attendu (null/0 = retire la CAF du bail)
export async function POST(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const body = await request.json().catch(() => null);
    const { leaseId, amount } = body ?? {};
    if (!leaseId || typeof leaseId !== 'string') {
        return NextResponse.json({ error: 'leaseId requis.' }, { status: 400 });
    }

    try {
        await updateCafMonthlyAmount(leaseId, amount == null ? null : Number(amount), 'mobile');
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Bail introuvable.' }, { status: 404 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
