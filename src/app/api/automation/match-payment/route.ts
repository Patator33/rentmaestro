import { NextResponse } from 'next/server';
import { verifyAutomationSecret, automationUnauthorized } from '@/lib/automation-auth';
import { parseAmount } from '@/lib/payment-matching';
import { matchTransfer } from '@/lib/transfer-matching';

export const dynamic = 'force-dynamic';

/**
 * Rapproche un virement d'un locataire et d'une période, sans rien écrire.
 * Sert au diagnostic et aux intégrations qui gèrent elles-mêmes la validation ;
 * le parcours Telegram passe par /api/automation/incoming-transfer.
 */
export async function POST(request: Request) {
    if (!verifyAutomationSecret(request)) return automationUnauthorized();

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });

    const sender: string = (body.sender ?? '').toString();
    const amount = typeof body.amount === 'number' ? body.amount : parseAmount(body.amount);

    if (!sender.trim()) return NextResponse.json({ error: 'Expéditeur manquant' }, { status: 400 });
    if (amount == null || amount <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });

    const match = await matchTransfer(sender, amount);

    if (!match.matched) {
        return NextResponse.json({
            matched: false,
            reason: 'Aucun locataire ne correspond à cet expéditeur',
            sender,
            amount,
            // Loyers non soldés les plus proches du montant, à défaut de nom reconnu.
            fallback: match.fallback,
        });
    }

    return NextResponse.json({
        matched: true,
        sender,
        amount,
        ambiguous: match.ambiguous,
        best: match.best,
        candidates: match.candidates,
    });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
