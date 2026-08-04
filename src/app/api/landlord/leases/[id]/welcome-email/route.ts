import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { calculateFutureProrata } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const DEFAULT_SUBJECT = 'Bienvenue dans votre nouveau logement — {{adresse_bien}}';
const DEFAULT_BODY = `Bonjour {{prenom_locataire}},

Nous avons le plaisir de vous accueillir dans votre nouveau logement situé au {{adresse_bien}}.

Voici un récapitulatif de votre contrat :
- Loyer hors charges : {{loyer_hc}} €
- Charges : {{charges}} €
- Loyer charges comprises : {{loyer_cc}} €
- Dépôt de garantie : {{caution}} €
- Date d'entrée : {{date_debut}}
- Premier mois (prorata) : {{prorata_premier_mois}} €

N'hésitez pas à nous contacter pour toute question.

Cordialement,
Céline et Nicolas`;

function applyVars(template: string, vars: Record<string, string>): string {
    return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v), template);
}

async function buildPreview(id: string) {
    const lease = await prisma.lease.findUnique({
        where: { id },
        include: { tenant: true, apartment: true },
    });
    if (!lease) return null;

    const [subjectTpl, bodyTpl] = await Promise.all([
        prisma.setting.findUnique({ where: { key: 'welcome_email_subject' } }).then(s => s?.value ?? DEFAULT_SUBJECT),
        prisma.setting.findUnique({ where: { key: 'welcome_email_body' } }).then(s => s?.value ?? DEFAULT_BODY),
    ]);

    const coTenantName = lease.tenant.coTenantFirstName
        ? `${lease.tenant.coTenantFirstName} ${lease.tenant.coTenantLastName ?? ''}`.trim()
        : '';

    const vars: Record<string, string> = {
        prenom_locataire: lease.tenant.firstName,
        nom_locataire: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
        nom_colocataire: coTenantName,
        adresse_bien: `${lease.apartment.address}, ${lease.apartment.zipCode ?? ''} ${lease.apartment.city}`.trim(),
        complement_adresse: lease.apartment.complement ?? '',
        // Adresse complète, complément inclus quand il est renseigné.
        adresse_complete: [
            lease.apartment.address,
            lease.apartment.complement,
            `${lease.apartment.zipCode ?? ''} ${lease.apartment.city}`.trim(),
        ].filter(Boolean).join(', '),
        loyer_hc: lease.rentAmount.toFixed(2),
        charges: lease.chargesAmount.toFixed(2),
        loyer_cc: (lease.rentAmount + lease.chargesAmount).toFixed(2),
        caution: lease.depositAmount ? lease.depositAmount.toFixed(2) : '—',
        date_debut: new Date(lease.startDate).toLocaleDateString('fr-FR'),
        prorata_premier_mois: (() => {
            const total = lease.rentAmount + lease.chargesAmount;
            const prorata = calculateFutureProrata(total, new Date(lease.startDate));
            return prorata ? Math.round(prorata.amount * 100) / 100 + '' : total.toFixed(2);
        })(),
    };

    const recipients = [lease.tenant.email!];
    if (lease.tenant.coTenantEmail) recipients.push(lease.tenant.coTenantEmail);

    return {
        subject: applyVars(subjectTpl, vars),
        body: applyVars(bodyTpl, vars),
        recipients,
        hasEmail: !!lease.tenant.email,
    };
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const preview = await buildPreview(id);
    if (!preview) return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 });
    return NextResponse.json(preview);
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { subject, body } = await request.json();
    if (!subject || !body) return NextResponse.json({ error: 'Contenu manquant' }, { status: 400 });

    const lease = await prisma.lease.findUnique({
        where: { id },
        include: { tenant: true, apartment: true },
    });
    if (!lease) return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 });
    if (!lease.tenant.email) return NextResponse.json({ error: 'Email locataire manquant' }, { status: 400 });

    const html = `<div style="font-family:sans-serif;color:#333;line-height:1.7;max-width:560px;white-space:pre-wrap">${body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;

    const recipients = [lease.tenant.email];
    if (lease.tenant.coTenantEmail) recipients.push(lease.tenant.coTenantEmail);

    try {
        await sendEmail({ to: recipients.join(','), subject, html });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Erreur envoi' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
