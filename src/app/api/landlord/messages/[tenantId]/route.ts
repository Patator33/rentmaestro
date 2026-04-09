import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// GET — message history for a tenant (marks tenant messages as read)
export async function GET(
    request: Request,
    { params }: { params: Promise<{ tenantId: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { tenantId } = await params;

    // Mark all unread tenant messages as read
    await prisma.message.updateMany({
        where: { tenantId, fromTenant: true, readAt: null },
        data: { readAt: new Date() },
    });

    const messages = await prisma.message.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
    });

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, firstName: true, lastName: true },
    });

    return NextResponse.json({ tenant, messages });
}

// POST { content } — landlord sends a message
export async function POST(
    request: Request,
    { params }: { params: Promise<{ tenantId: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { tenantId } = await params;
    const { content } = await request.json();

    if (!content?.trim()) {
        return NextResponse.json({ error: 'Message vide.' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return NextResponse.json({ error: 'Locataire introuvable.' }, { status: 404 });

    const message = await prisma.message.create({
        data: { tenantId, content: content.trim(), fromTenant: false },
    });

    // Notify tenant by email
    if (tenant.email && process.env.SMTP_USER) {
        const baseUrl = process.env.APP_BASE_URL || new URL(request.url).origin;
        const portalUrl = `${baseUrl}/portal/${tenant.portalToken}`;
        sendEmail({
            to: tenant.email,
            subject: `💬 Vous avez un nouveau message de votre propriétaire`,
            html: `
                <div style="font-family:sans-serif;color:#333;max-width:500px;">
                    <h2 style="color:#1e293b;">Message de votre propriétaire</h2>
                    <p>Bonjour <strong>${tenant.firstName}</strong>,</p>
                    <p>Votre propriétaire vous a envoyé un message :</p>
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

    return NextResponse.json(message, { status: 201 });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
