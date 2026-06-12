import { prisma } from '@/lib/prisma';

export const EVENT_LABELS: Record<string, string> = {
    RENT_PAID: "💰 Loyer payé",
    TENANT_MESSAGE: "💬 Message locataire",
    INCIDENT_REPORTED: "🚨 Incident signalé",
    RECEIPT_DOWNLOADED_BY_TENANT: "📄 Quittance téléchargée",
    TENANT_CREATED: "👤 Nouveau locataire",
    RENT_REVIEW_DUE: "📈 Révision de loyer due",
};

// Variables exposed to each event's Telegram template, with a human description.
// Keys are usable as {{variable}} in the template.
export const EVENT_VARIABLES: Record<string, { name: string; desc: string }[]> = {
    RENT_PAID: [
        { name: 'locataire', desc: 'Nom du locataire' },
        { name: 'bien', desc: 'Adresse du bien' },
        { name: 'montant', desc: 'Montant payé (€)' },
        { name: 'periode', desc: 'Période (mois/année)' },
        { name: 'statut', desc: 'PAID ou PARTIAL' },
    ],
    TENANT_MESSAGE: [
        { name: 'locataire', desc: 'Nom du locataire' },
        { name: 'message', desc: 'Contenu du message' },
    ],
    INCIDENT_REPORTED: [
        { name: 'locataire', desc: 'Nom du locataire' },
        { name: 'bien', desc: 'Adresse du bien' },
        { name: 'titre', desc: "Objet de l'incident" },
        { name: 'description', desc: 'Détail de l\'incident' },
    ],
    RECEIPT_DOWNLOADED_BY_TENANT: [
        { name: 'locataire', desc: 'Nom du locataire' },
        { name: 'bien', desc: 'Adresse du bien' },
        { name: 'periode', desc: 'Période de la quittance' },
        { name: 'montant', desc: 'Montant (€)' },
    ],
    TENANT_CREATED: [
        { name: 'prenom', desc: 'Prénom du locataire' },
        { name: 'nom', desc: 'Nom du locataire' },
        { name: 'email', desc: 'Email du locataire' },
    ],
    RENT_REVIEW_DUE: [
        { name: 'locataire', desc: 'Nom du locataire' },
        { name: 'bien', desc: 'Adresse du bien' },
        { name: 'loyer_actuel', desc: 'Loyer HC actuel (€)' },
        { name: 'nouveau_loyer', desc: 'Nouveau loyer estimé (€)' },
        { name: 'date_revision', desc: 'Date anniversaire de révision' },
    ],
};

// Default template per event (used when no custom template is configured).
export const DEFAULT_TELEGRAM_TEMPLATES: Record<string, string> = {
    RENT_PAID: "💰 *Loyer payé*\n{{locataire}} — {{bien}}\nMontant : {{montant}} € ({{periode}})",
    TENANT_MESSAGE: "💬 *Message de {{locataire}}*\n{{message}}",
    INCIDENT_REPORTED: "🚨 *Incident signalé*\n{{locataire}} — {{bien}}\n{{titre}}\n{{description}}",
    RECEIPT_DOWNLOADED_BY_TENANT: "📄 *Quittance téléchargée*\n{{locataire}} — {{periode}} ({{montant}} €)",
    TENANT_CREATED: "👤 *Nouveau locataire*\n{{prenom}} {{nom}} — {{email}}",
    RENT_REVIEW_DUE: "📈 *Révision de loyer due*\n{{locataire}} — {{bien}}\nLoyer actuel : {{loyer_actuel}} € → estimé : {{nouveau_loyer}} €\nRévisable depuis le {{date_revision}}",
};

function applyVars(template: string, vars: Record<string, string>): string {
    return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v ?? ''), template);
}

// Flattens an event payload into the template variable set for that event.
function extractVars(eventName: string, p: any): Record<string, string> {
    switch (eventName) {
        case 'RENT_PAID': {
            const tenant = p?.lease?.tenant;
            const apt = p?.lease?.apartment;
            const period = p?.period ? new Date(p.period).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '';
            const amount = (p?.paidAmount ?? p?.amount);
            return {
                locataire: tenant ? `${tenant.firstName} ${tenant.lastName}` : '',
                bien: apt ? apt.address : '',
                montant: amount != null ? Number(amount).toFixed(2) : '',
                periode: period,
                statut: p?.status ?? '',
            };
        }
        case 'TENANT_MESSAGE':
            return { locataire: p?.tenantName ?? '', message: p?.message ?? '' };
        case 'INCIDENT_REPORTED':
            return { locataire: p?.tenantName ?? '', bien: p?.apartment ?? '', titre: p?.title ?? '', description: p?.description ?? '' };
        case 'RECEIPT_DOWNLOADED_BY_TENANT':
            return {
                locataire: p?.tenantName ?? '',
                bien: p?.apartment ?? '',
                periode: p?.period ?? '',
                montant: p?.amount != null ? Number(p.amount).toFixed(2) : '',
            };
        case 'TENANT_CREATED':
            return { prenom: p?.firstName ?? '', nom: p?.lastName ?? '', email: p?.email ?? '' };
        case 'RENT_REVIEW_DUE':
            return {
                locataire: p?.tenantName ?? '',
                bien: p?.apartment ?? '',
                loyer_actuel: p?.currentRent != null ? Number(p.currentRent).toFixed(2) : '',
                nouveau_loyer: p?.estimatedRent != null ? Number(p.estimatedRent).toFixed(2) : '',
                date_revision: p?.reviewDate ?? '',
            };
        default:
            return {};
    }
}

async function notifyTelegram(eventName: string, payload: any) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) return;

    const [enabledSetting, eventsSetting, templateSetting] = await Promise.all([
        prisma.setting.findUnique({ where: { key: 'telegram_enabled' } }),
        prisma.setting.findUnique({ where: { key: 'telegram_events' } }),
        prisma.setting.findUnique({ where: { key: `telegram_template_${eventName}` } }),
    ]);

    if (enabledSetting?.value !== 'true') return;

    const enabledEvents: string[] = eventsSetting?.value ? JSON.parse(eventsSetting.value) : Object.keys(EVENT_LABELS);
    if (!enabledEvents.includes(eventName)) return;

    const template = templateSetting?.value || DEFAULT_TELEGRAM_TEMPLATES[eventName];
    let text: string;
    if (template) {
        text = applyVars(template, extractVars(eventName, payload));
    } else {
        // Fallback: generic dump of scalar fields
        const label = EVENT_LABELS[eventName] ?? eventName;
        const lines = Object.entries(payload)
            .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
            .map(([k, v]) => `• ${k}: ${v}`)
            .join("\n");
        text = `*${label}*\n${lines}`;
    }

    try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
        });
    } catch (error) {
        console.error(`[Telegram] Error sending event ${eventName}:`, error);
    }
}

export async function notifyN8n(eventName: string, payload: any) {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    notifyTelegram(eventName, payload).catch(() => {});

    if (!webhookUrl) {
        console.log(`[n8n Webhook] Webhook URL not configured. Skipping event: ${eventName}`);
        return;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                event: eventName,
                timestamp: new Date().toISOString(),
                data: payload,
            }),
        });

        if (!response.ok) {
            console.error(`[n8n Webhook] Failed to send event ${eventName}. Status: ${response.status}`);
        } else {
            console.log(`[n8n Webhook] Event ${eventName} sent successfully.`);
        }
    } catch (error) {
        console.error(`[n8n Webhook] Error sending event ${eventName}:`, error);
    }
}
