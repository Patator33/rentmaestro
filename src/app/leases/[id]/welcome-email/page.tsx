import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import WelcomeEmailForm from './WelcomeEmailForm';
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
    return Object.entries(vars).reduce(
        (t, [k, v]) => t.replaceAll(`{{${k}}}`, v),
        template
    );
}

export default async function WelcomeEmailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const lease = await prisma.lease.findUnique({
        where: { id },
        include: { tenant: true, apartment: true },
    });
    if (!lease) notFound();
    if (!lease.tenant.email) redirect(`/leases/${id}`);

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
        loyer_hc: lease.rentAmount.toFixed(2),
        charges: lease.chargesAmount.toFixed(2),
        loyer_cc: (lease.rentAmount + lease.chargesAmount).toFixed(2),
        caution: lease.depositAmount ? lease.depositAmount.toFixed(2) : '—',
        date_debut: new Date(lease.startDate).toLocaleDateString('fr-FR'),
        prorata_premier_mois: (() => {
            const total = lease.rentAmount + lease.chargesAmount;
            const prorata = calculateFutureProrata(total, new Date(lease.startDate));
            return prorata ? (Math.round(prorata.amount * 100) / 100).toFixed(2) : total.toFixed(2);
        })(),
    };

    const subject = applyVars(subjectTpl, vars);
    const body = applyVars(bodyTpl, vars);

    const recipients = [lease.tenant.email];
    if (lease.tenant.coTenantEmail) recipients.push(lease.tenant.coTenantEmail);

    return (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>📧 Email de bienvenue</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Vérifiez et modifiez le contenu avant envoi.
            </p>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
                <WelcomeEmailForm
                    leaseId={id}
                    defaultSubject={subject}
                    defaultBody={body}
                    recipients={recipients}
                />
            </div>
        </div>
    );
}
