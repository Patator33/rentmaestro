import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { readSession } from '@/lib/session';
import { generateRentsForCurrentMonth } from '@/lib/rent-generation';

export const dynamic = 'force-dynamic';

/**
 * Auto-generate RentPayment entries for all active leases for the current month.
 * This endpoint can be called manually from the dashboard, or runs automatically
 * every day via /api/cron/daily.
 * It only creates payments that don't already exist for the current period.
 */
export async function POST(request: NextRequest) {
    const session = await readSession(request);
    if (!session.userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    try {
        const { created, skipped, lateMarked, month } = await generateRentsForCurrentMonth();
        return NextResponse.json({
            success: true,
            message: `${created} loyer(s) généré(s), ${skipped} ignoré(s), ${lateMarked} marqué(s) en retard`,
            created,
            skipped,
            lateMarked,
            month,
        });
    } catch (error) {
        console.error('Erreur génération loyers:', error);
        return NextResponse.json({ error: 'Erreur lors de la génération des loyers' }, { status: 500 });
    }
}
