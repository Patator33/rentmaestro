import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAutomationSecret, automationUnauthorized } from '@/lib/automation-auth';
import { parseAmount } from '@/lib/payment-matching';
import { matchTransfer, type TransferCandidate } from '@/lib/transfer-matching';
import { sendMessageWithButtons, type InlineButton } from '@/lib/telegram-buttons';

export const dynamic = 'force-dynamic';

/** Choix mémorisé, retrouvé par l'index du bouton cliqué. */
interface StoredOption {
    leaseId: string;
    period: string;
    tenantName: string;
    apartment: string;
    remaining: number;
}

const fmt = (n: number) => n.toFixed(2).replace('.', ',');

function describe(c: TransferCandidate, amount: number): string {
    const periodLine = c.isAdvance
        ? `${c.periodLabel} (avance, bail à jour) : ${fmt(c.remaining)} € attendus`
        : `${c.periodLabel} : ${fmt(c.remaining)} € attendus`;
    const lines = [`${c.tenantName} — ${c.apartment}`, periodLine];
    if (c.difference !== null && Math.abs(c.difference) >= 0.01) {
        lines.push(c.difference > 0
            ? `Trop-perçu de ${fmt(c.difference)} €`
            : `Il manquerait ${fmt(Math.abs(c.difference))} € — enregistré en paiement partiel`);
    }
    const via = c.confidence === 'exact' ? 'libellé bancaire connu'
        : c.confidence === 'high' ? 'nom et prénom'
        : c.confidence === 'medium' ? 'nom de famille'
        : 'prénom seul';
    // Préciser le colocataire : le virement vient d'un nom absent du bail au
    // premier coup d'œil, autant éviter le doute.
    const who = c.isCoTenant && c.matchedName ? ` — via le colocataire ${c.matchedName}` : '';
    lines.push(`Rapprochement : ${via}${who}`);
    return lines.join('\n');
}

/**
 * Reçoit un virement détecté par l'automatisation et demande validation sur
 * Telegram. Rien n'est écrit sur les loyers à ce stade.
 */
export async function POST(request: Request) {
    if (!verifyAutomationSecret(request)) return automationUnauthorized();

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });

    const sender: string = (body.sender ?? '').toString().trim();
    const amount = typeof body.amount === 'number' ? body.amount : parseAmount(body.amount);

    if (!sender) return NextResponse.json({ error: 'Expéditeur manquant' }, { status: 400 });
    if (amount == null || amount <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });

    // Un même mail relu ne doit pas reposer la question.
    const duplicate = await prisma.pendingTransfer.findFirst({
        where: {
            sender,
            amount,
            status: 'PENDING',
            createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
        },
    });
    if (duplicate) {
        return NextResponse.json({ status: 'duplicate', pendingId: duplicate.id });
    }

    const match = await matchTransfer(sender, amount);
    const chosen = match.matched ? match.candidates : match.fallback;
    const usable = chosen.filter(c => c.period !== null);

    const options: StoredOption[] = usable.map(c => ({
        leaseId: c.leaseId,
        period: c.period!,
        tenantName: c.tenantName,
        apartment: c.apartment,
        remaining: c.remaining,
    }));

    const pending = await prisma.pendingTransfer.create({
        data: { sender, amount, options: JSON.stringify(options) },
    });

    // callback_data est limité à 64 octets : identifiant court + index du bouton.
    const shortId = pending.id.slice(0, 8);
    const header = `💶 *Virement reçu*\n${fmt(amount)} € de ${sender}`;

    let text: string;
    let buttons: InlineButton[] = [];

    if (usable.length === 0) {
        // N'arrive plus qu'en l'absence totale de bail actif dans l'application :
        // resolveTarget() propose désormais toujours une cible (mois suivant en
        // avance si le bail est à jour), y compris dans la liste complète.
        text = `${header}\n\nAucun locataire actif dans l'application. À traiter manuellement.`;
    } else if (match.matched && !match.ambiguous) {
        const best = usable[0];
        text = `${header}\n\n${describe(best, amount)}\n\nCréditer ce loyer ?`;
        buttons = [
            { text: '✅ Valider', callback_data: `p:${shortId}:0` },
            { text: '❌ Refuser', callback_data: `p:${shortId}:x` },
        ];
    } else {
        const intro = match.matched
            ? 'Plusieurs locataires correspondent. Lequel créditer ?'
            : 'Expéditeur non reconnu. Sélectionnez le locataire :';
        text = `${header}\n\n${intro}`;
        buttons = usable.map((c, i) => ({
            text: `${c.tenantName} — ${c.periodLabel}${c.isAdvance ? ' (avance)' : ''} (${fmt(c.remaining)} €)`,
            callback_data: `p:${shortId}:${i}`,
        }));
        buttons.push({ text: '❌ Aucun', callback_data: `p:${shortId}:x` });
    }

    const sent = await sendMessageWithButtons(text, buttons);
    if (!sent.ok) {
        // La question n'est pas partie : inutile de garder une attente muette.
        await prisma.pendingTransfer.delete({ where: { id: pending.id } }).catch(() => {});
        return NextResponse.json({ error: `Envoi Telegram impossible : ${sent.error}` }, { status: 502 });
    }

    await prisma.pendingTransfer.update({
        where: { id: pending.id },
        data: { chatId: sent.chatId, messageId: sent.messageId },
    });

    return NextResponse.json({
        status: 'pending',
        pendingId: pending.id,
        matched: match.matched,
        ambiguous: match.ambiguous,
        optionCount: options.length,
    });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
