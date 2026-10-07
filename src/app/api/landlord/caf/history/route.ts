import { NextResponse } from 'next/server';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { getCafHistoryForLease } from '@/lib/caf';

export const dynamic = 'force-dynamic';

// GET ?leaseId=… → versements CAF reçus pour ce bail
export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const leaseId = new URL(request.url).searchParams.get('leaseId');
    if (!leaseId) return NextResponse.json({ error: 'leaseId requis.' }, { status: 400 });

    return NextResponse.json(await getCafHistoryForLease(leaseId));
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
