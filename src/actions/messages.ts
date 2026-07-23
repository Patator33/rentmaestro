'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { notifyN8n } from '@/lib/n8n';
import { sendEmail } from '@/lib/email';
import { headers } from 'next/headers';
import { requireAuth } from '@/lib/session';

async function getBaseUrl() {
    const h = await headers();
    const host = h.get('host') || 'localhost:3000';
    const proto = h.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    return process.env.APP_BASE_URL || `${proto}://${host}`;
}

export async function getMessages(tenantId: string) {
    await requireAuth();
    return prisma.message.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
    });
}

export async function sendAdminMessage(tenantId: string, content: string) {
    await requireAuth();
    if (!content.trim()) return { success: false, error: 'Message vide' };

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return { success: false, error: 'Locataire introuvable' };

    const message = await prisma.message.create({
        data: { tenantId, content: content.trim(), fromTenant: false },
    });

    // Notify tenant by email
    if (tenant.email && process.env.SMTP_USER) {
        const baseUrl = await getBaseUrl();
        const portalUrl = `${baseUrl}/portal/${tenant.portalToken}`;
        sendEmail({
            to: tenant.email,
            subject: `💬 Vous avez un nouveau message de Céline et Nicolas`,
            html: `
                <div style="font-family:sans-serif;color:#333;max-width:500px;">
                    <h2 style="color:#1e293b;">Message de Céline et Nicolas</h2>
                    <p>Bonjour <strong>${tenant.firstName}</strong>,</p>
                    <p>Céline et Nicolas vous ont envoyé un message :</p>
                    <blockquote style="border-left:3px solid #2b8cee;padding:0.75rem 1rem;margin:1rem 0;background:#f8fafc;color:#334155;">
                        ${content.trim().replace(/\n/g, '<br>')}
                    </blockquote>
                    <a href="${portalUrl}" style="display:inline-block;margin-top:0.5rem;padding:0.6rem 1.2rem;background:#2b8cee;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:0.9rem;">
                        Voir et répondre sur mon espace →
                    </a>
                    <p style="margin-top:1rem;color:#94a3b8;font-size:0.8rem;">${portalUrl}</p>
                </div>
            `,
        }).catch(() => {});
    }

    revalidatePath(`/tenants/${tenantId}`);
    return { success: true, message };
}

export async function sendPortalMessage(tenantId: string, content: string, token: string) {
    if (!content.trim()) return { success: false, error: 'Message vide' };

    // Verify token ownership
    const tenant = await prisma.tenant.findUnique({ where: { portalToken: token } });
    if (!tenant || tenant.id !== tenantId) return { success: false, error: 'Non autorisé' };

    const message = await prisma.message.create({
        data: { tenantId, content: content.trim(), fromTenant: true },
    });

    // Notify landlord
    await notifyN8n('TENANT_MESSAGE', {
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        message: content.trim(),
    }).catch(() => {});

    // Home Assistant webhook (lecture directe : contexte locataire, pas de session)
    const haWebhook = await prisma.setting
        .findUnique({ where: { key: 'ha_webhook_url' } })
        .then(s => s?.value ?? null)
        .catch(() => null);
    if (haWebhook) {
        fetch(haWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tenant: `${tenant.firstName} ${tenant.lastName}`,
                tenantId: tenant.id,
                message: content.trim(),
                // Opened by the RentMaestro Android app's deep-link handler
                // (mobile/src/App.tsx) straight to this tenant's conversation.
                deepLink: `rentmaestro://messages/${tenant.id}`,
            }),
        }).catch(() => {});
    }

    if (process.env.SMTP_USER) {
        const baseUrl = await getBaseUrl();
        const tenantUrl = `${baseUrl}/tenants/${tenant.id}`;
        sendEmail({
            to: process.env.SMTP_USER,
            subject: `💬 Nouveau message de ${tenant.firstName} ${tenant.lastName}`,
            html: `
                <div style="font-family:sans-serif;color:#333;max-width:500px;">
                    <h2 style="color:#1e293b;">Message de votre locataire</h2>
                    <p><strong>${tenant.firstName} ${tenant.lastName}</strong> vous a envoyé un message :</p>
                    <blockquote style="border-left:3px solid #2b8cee;padding:0.75rem 1rem;margin:1rem 0;background:#f8fafc;color:#334155;">
                        ${content.trim().replace(/\n/g, '<br>')}
                    </blockquote>
                    <a href="${tenantUrl}" style="display:inline-block;margin-top:0.5rem;padding:0.6rem 1.2rem;background:#2b8cee;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:0.9rem;">
                        Répondre sur Rentmaestro →
                    </a>
                    <p style="margin-top:1rem;color:#94a3b8;font-size:0.8rem;">${tenantUrl}</p>
                </div>
            `,
        }).catch(() => {});
    }

    return { success: true, message };
}

export async function deleteMessage(id: string) {
    await requireAuth();
    const message = await prisma.message.delete({ where: { id } });
    revalidatePath(`/tenants/${message.tenantId}`);
    return { success: true };
}

export async function markMessagesRead(tenantId: string, fromTenant: boolean) {
    await requireAuth();
    await prisma.message.updateMany({
        where: { tenantId, fromTenant, readAt: null },
        data: { readAt: new Date() },
    });
    revalidatePath(`/tenants/${tenantId}`);
}

export async function markPortalMessagesRead(tenantId: string, fromTenant: boolean, token: string) {
    // Verify token ownership (contexte locataire, pas de session propriétaire)
    const tenant = await prisma.tenant.findUnique({ where: { portalToken: token } });
    if (!tenant || tenant.id !== tenantId) return;
    await prisma.message.updateMany({
        where: { tenantId, fromTenant, readAt: null },
        data: { readAt: new Date() },
    });
}
