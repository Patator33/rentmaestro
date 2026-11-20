import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { logAction } from '@/lib/audit';
import { buildLeaseDocumentData } from '@/lib/lease-document';
import { SignatureError, sendLeaseForSignature, cancelLeaseSignature, getLeaseSignatureStatus } from '@/lib/signature';
import { DocusealError } from '@/lib/docuseal';
import { LEASE_TYPES } from '@/lib/lease-options';

export const dynamic = 'force-dynamic';

// Signature des baux (DocuSeal) pour l'appli mobile : type de bail, contrôle des
// données, envoi, suivi, annulation. La saisie des données manquantes se fait
// depuis l'appli web.

function failure(e: unknown) {
    if (e instanceof SignatureError) return NextResponse.json({ error: e.message, details: e.details }, { status: 400 });
    if (e instanceof DocusealError) return NextResponse.json({ error: e.message }, { status: 502 });
    console.error('Erreur signature de bail (mobile) :', e);
    return NextResponse.json({ error: "Erreur inattendue lors de l'envoi en signature." }, { status: 500 });
}

/** Type de bail, état de la signature, demandes en cours et contrôle des données. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    try {
        const data = await buildLeaseDocumentData(id);
        if (!data) return NextResponse.json({ error: 'Bail introuvable.' }, { status: 404 });
        const lease = await prisma.lease.findUnique({ where: { id }, include: { apartment: { select: { defaultLeaseType: true } } } });
        const requests = await getLeaseSignatureStatus(id);
        return NextResponse.json({
            leaseType: lease?.leaseType ?? null,
            defaultLeaseType: lease?.apartment.defaultLeaseType ?? null,
            effectiveLeaseType: data.leaseType,
            signatureStatus: lease?.signatureStatus ?? 'NONE',
            requests,
            control: {
                missing: data.missing.map(m => ({ label: m.label, area: m.area })),
                warnings: data.warnings,
                signers: data.signers,
                needsGuaranteeAct: data.needsGuaranteeAct,
            },
        });
    } catch (e) {
        return failure(e);
    }
}

/** Choisit le type de bail (nu, meublé, colocation) ; null = celui de l'appartement. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const raw = body?.leaseType;
    const allowed = LEASE_TYPES.map(t => t.value as string);
    if (raw !== null && !(typeof raw === 'string' && allowed.includes(raw))) {
        return NextResponse.json({ error: 'Type de bail invalide.' }, { status: 400 });
    }
    try {
        const lease = await prisma.lease.update({ where: { id }, data: { leaseType: raw } });
        await logAction({ action: 'UPDATE_LEASE', entity: 'Lease', entityId: id, details: `Type de bail : ${raw ?? 'celui de l\'appartement'}`, userEmail: 'mobile' });
        return NextResponse.json({ success: true, leaseType: lease.leaseType });
    } catch {
        return NextResponse.json({ error: 'Bail introuvable.' }, { status: 404 });
    }
}

/** Envoie le bail en signature. Corps : { regenerate?: boolean, notify?: boolean }. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    try {
        const result = await sendLeaseForSignature(id, {
            regenerate: body?.regenerate === true,
            notify: body?.notify !== false,
            actor: 'mobile',
        });
        return NextResponse.json({ success: true, warnings: result.warnings });
    } catch (e) {
        return failure(e);
    }
}

/** Annule les demandes de signature en cours. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    try {
        const { canceled } = await cancelLeaseSignature(id, 'mobile');
        return NextResponse.json({ success: true, canceled });
    } catch (e) {
        return failure(e);
    }
}
