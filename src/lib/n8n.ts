export async function notifyN8n(eventName: string, payload: any) {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!webhookUrl) {
        console.log(`[n8n Webhook] Webhook URL not configured. Skipping event: ${eventName}`);
        return;
    }

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
