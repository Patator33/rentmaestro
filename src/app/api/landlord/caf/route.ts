import { NextResponse } from 'next/server';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { getCafEligibleLeases, getLeasesWithoutCaf } from '@/lib/caf';

export const dynamic = 'force-dynamic';

// GET ?month=YYYY-MM → bénéficiaires CAF du mois + baux sans CAF (bouton « Ajouter »)
export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = searchParams.get('month') || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json({ error: 'month invalide (YYYY-MM attendu).' }, { status: 400 });
    }

    const [leases, candidates] = await Promise.all([getCafEligibleLeases(month), getLeasesWithoutCaf()]);
    return NextResponse.json({ month, leases, candidates });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
