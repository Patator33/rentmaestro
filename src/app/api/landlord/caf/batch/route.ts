import { NextResponse } from 'next/server';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { recordCafBatch } from '@/lib/caf';

export const dynamic = 'force-dynamic';

// POST { reference, date: "YYYY-MM-DD", month: "YYYY-MM", entries: [{ leaseId, amount }] }
export async function POST(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const body = await request.json().catch(() => null);
    const { reference, date, month, entries } = body ?? {};
    if (typeof reference !== 'string' || !date || !/^\d{4}-\d{2}$/.test(month ?? '') || !Array.isArray(entries)) {
        return NextResponse.json({ error: 'reference, date, month et entries requis.' }, { status: 400 });
    }

    try {
        await recordCafBatch(
            reference,
            date,
            month,
            entries.map((e: { leaseId: string; amount: number }) => ({ leaseId: String(e.leaseId), amount: Number(e.amount) })),
            'mobile'
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur' }, { status: 400 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
