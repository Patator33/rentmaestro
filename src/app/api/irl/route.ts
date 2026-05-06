import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * IRL (Indice de Référence des Loyers) calculator.
 * Formula: New Rent = Old Rent × (New IRL / Old IRL)
 * 
 * Example: ?oldRent=800&oldIRL=130.57&newIRL=132.42
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const oldRent = parseFloat(searchParams.get('oldRent') || '0');
    const oldIRL = parseFloat(searchParams.get('oldIRL') || '0');
    const newIRL = parseFloat(searchParams.get('newIRL') || '0');

    if (!oldRent || !oldIRL || !newIRL) {
        return NextResponse.json({
            error: 'Paramètres requis: oldRent, oldIRL, newIRL',
            example: '/api/irl?oldRent=800&oldIRL=130.57&newIRL=132.42',
        }, { status: 400 });
    }

    const newRent = oldRent * (newIRL / oldIRL);
    const increase = newRent - oldRent;
    const percentIncrease = ((newIRL / oldIRL) - 1) * 100;

    return NextResponse.json({
        oldRent: parseFloat(oldRent.toFixed(2)),
        newRent: parseFloat(newRent.toFixed(2)),
        increase: parseFloat(increase.toFixed(2)),
        percentIncrease: parseFloat(percentIncrease.toFixed(2)),
        formula: `${oldRent} × (${newIRL} / ${oldIRL}) = ${newRent.toFixed(2)}`,
    });
}
