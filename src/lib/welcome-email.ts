import { prisma } from '@/lib/prisma';
import { calculateFutureProrata } from '@/lib/utils';

export const DEFAULT_WELCOME_SUBJECT = 'Bienvenue dans votre nouveau logement — {{adresse_bien}}';

export const DEFAULT_WELCOME_BODY = `Bonjour {{prenom_locataire}},

Nous avons le plaisir de vous accueillir dans votre nouveau logement situé au {{adresse_bien}}.

Voici un récapitulatif de votre contrat :
- Loyer hors charges : {{loyer_hc}} €
- Charges : {{charges}} €
- Loyer charges comprises : {{loyer_cc}} €
- Dépôt de garantie : {{caution}} €
- Date d'entrée : {{date_debut}}
- Premier mois (prorata) : {{prorata_premier_mois}} €

{{texte_garant}}

N'hésitez pas à nous contacter pour toute question.

Cordialement,
Céline et Nicolas`;

// Paragraphe inséré à la place de {{texte_garant}} selon le type de garantie du
// bail. Sans garantie : rien (le paragraphe disparaît, sans ligne vide en trop).
export const DEFAULT_GUARANTOR_PRIVATE_TEXT =
    "Concernant la garantie de votre bail : {{nom_garant}} se porte caution. Nous prendrons contact avec cette personne pour l'acte de cautionnement à signer ; merci de l'en informer.";

export const DEFAULT_GUARANTOR_VISALE_TEXT =
    "Concernant la garantie de votre bail : celui-ci est couvert par la garantie Visale. Merci de nous transmettre votre visa Visale si ce n'est pas déjà fait ; nous déclarerons ensuite votre bail auprès de Visale.";

export const GUARANTOR_SETTING_KEYS = {
    PRIVATE: 'welcome_email_guarantor_private',
    VISALE: 'welcome_email_guarantor_visale',
} as const;

function applyVars(template: string, vars: Record<string, string>): string {
    return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v), template);
}

async function getSetting(key: string): Promise<string | null> {
    const row = await prisma.setting.findUnique({ where: { key } });
    return row?.value ?? null;
}

/**
 * Corps final : les modèles déjà personnalisés avant l'ajout de la garantie ne
 * contiennent pas {{texte_garant}}. Plutôt que d'ignorer silencieusement le
 * garant, le paragraphe est inséré avant le dernier bloc (la formule de
 * politesse et la signature).
 */
function injectGuarantor(bodyTpl: string, guarantorText: string): string {
    if (bodyTpl.includes('{{texte_garant}}')) {
        const replaced = bodyTpl.replaceAll('{{texte_garant}}', guarantorText);
        // Pas de paragraphe vide quand il n'y a pas de garantie.
        return guarantorText ? replaced : replaced.replace(/\n{3,}/g, '\n\n');
    }
    if (!guarantorText) return bodyTpl;
    const blocks = bodyTpl.split(/\n{2,}/);
    if (blocks.length < 2) return `${bodyTpl}\n\n${guarantorText}`;
    blocks.splice(blocks.length - 1, 0, guarantorText);
    return blocks.join('\n\n');
}

/** Aperçu de l'email de bienvenue d'un bail : partagé entre la page web et l'API mobile. */
export async function buildWelcomeEmail(leaseId: string) {
    const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: { tenant: true, apartment: true },
    });
    if (!lease) return null;

    const [subjectTpl, bodyTpl, privateTpl, visaleTpl] = await Promise.all([
        getSetting('welcome_email_subject').then(v => v ?? DEFAULT_WELCOME_SUBJECT),
        getSetting('welcome_email_body').then(v => v ?? DEFAULT_WELCOME_BODY),
        getSetting(GUARANTOR_SETTING_KEYS.PRIVATE).then(v => v ?? DEFAULT_GUARANTOR_PRIVATE_TEXT),
        getSetting(GUARANTOR_SETTING_KEYS.VISALE).then(v => v ?? DEFAULT_GUARANTOR_VISALE_TEXT),
    ]);

    const coTenantName = lease.tenant.coTenantFirstName
        ? `${lease.tenant.coTenantFirstName} ${lease.tenant.coTenantLastName ?? ''}`.trim()
        : '';

    const guarantorName = [lease.guarantorFirstName, lease.guarantorLastName].filter(Boolean).join(' ').trim();

    const vars: Record<string, string> = {
        prenom_locataire: lease.tenant.firstName,
        nom_locataire: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
        nom_colocataire: coTenantName,
        nom_garant: guarantorName || 'votre garant',
        adresse_bien: `${lease.apartment.address}, ${lease.apartment.zipCode ?? ''} ${lease.apartment.city}`.trim(),
        complement_adresse: lease.apartment.complement ?? '',
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
            return prorata ? (Math.round(prorata.amount * 100) / 100).toFixed(2) : total.toFixed(2);
        })(),
    };

    const guarantorTpl =
        lease.guarantorType === 'PRIVATE' ? privateTpl :
        lease.guarantorType === 'VISALE' ? visaleTpl : '';
    const guarantorText = applyVars(guarantorTpl, vars).trim();

    const recipients = lease.tenant.email ? [lease.tenant.email] : [];
    if (lease.tenant.coTenantEmail) recipients.push(lease.tenant.coTenantEmail);

    return {
        subject: applyVars(subjectTpl, vars),
        body: applyVars(injectGuarantor(bodyTpl, guarantorText), vars),
        recipients,
        hasEmail: !!lease.tenant.email,
    };
}
