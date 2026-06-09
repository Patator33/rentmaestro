const EVENT_LABELS: Record<string, string> = {
    RENT_PAID: "💰 Loyer payé",
    TENANT_MESSAGE: "💬 Message locataire",
    INCIDENT_REPORTED: "🚨 Incident signalé",
    RECEIPT_DOWNLOADED_BY_TENANT: "📄 Quittance téléchargée",
    TENANT_CREATED: "👤 Nouveau locataire",
};

async function notifyTelegram(eventName: string, payload: any) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) return;

    const label = EVENT_LABELS[eventName] ?? eventName;
    const lines = Object.entries(payload)
        .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
        .map(([k, v]) => `• ${k}: ${v}`)
        .join("\n");

    const text = `*${label}*\n${lines}`;

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

    if (!webhookUrl) {
        console.log(`[n8n Webhook] Webhook URL not configured. Skipping event: ${eventName}`);
        return;
    }

    notifyTelegram(eventName, payload).catch(() => {});

    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
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
