import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();

    const { id } = await params;
    const { action } = await request.json();

    if (action === 'generate') {
        const token = crypto.randomUUID();
        const tenant = await prisma.tenant.update({
            where: { id },
            data: { portalToken: token },
            select: { portalToken: true },
        });
        return NextResponse.json({ portalToken: tenant.portalToken });
    }

    if (action === 'send') {
        const tenant = await prisma.tenant.findUnique({ where: { id } });
        if (!tenant?.portalToken) {
            return NextResponse.json({ error: 'Aucun token généré.' }, { status: 400 });
        }
        if (!tenant.email) {
            return NextResponse.json({ error: "Ce locataire n'a pas d'adresse email." }, { status: 400 });
        }

        const baseUrl = process.env.APP_BASE_URL || new URL(request.url).origin;
        const portalUrl = `${baseUrl}/portal/${tenant.portalToken}`;
        const apkUrl = `${baseUrl}/downloads/rentmaestro-tenant.apk`;

        await sendEmail({
            to: tenant.email,
            subject: `Accès à votre espace locataire — RentMaestro`,
            html: `
                <div style="font-family: sans-serif; color: #333; max-width: 560px; line-height: 1.6;">
                    <h2 style="color: #1e293b;">Bonjour ${tenant.firstName},</h2>
                    <p>Céline et Nicolas vous invitent à accéder à votre <strong>espace locataire RentMaestro</strong>.</p>
                    <p>Vous y trouverez :</p>
                    <ul>
                        <li>Votre historique de paiements et quittances</li>
                        <li>La messagerie avec votre propriétaire</li>
                        <li>Le signalement d'incidents techniques</li>
                    </ul>
                    <h3 style="color: #1e293b; margin-top: 2rem;">🌐 Accès web</h3>
                    <p>Cliquez sur le lien ci-dessous pour accéder depuis votre navigateur :</p>
                    <a href="${portalUrl}" style="display: inline-block; padding: 0.7rem 1.4rem; background: #2b8cee; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Accéder à mon espace →
                    </a>
                    <p style="color: #64748b; font-size: 0.85rem; margin-top: 0.5rem;">${portalUrl}</p>
                    <h3 style="color: #1e293b; margin-top: 2rem;">📱 Application mobile Android</h3>
                    <p>Téléchargez l'application RentMaestro sur votre smartphone Android :</p>
                    <a href="${apkUrl}" style="display: inline-block; padding: 0.7rem 1.4rem; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        ⬇️ Télécharger l'application Android
                    </a>
                    <p style="color: #64748b; font-size: 0.85rem; margin-top: 0.5rem;">
                        Après installation, entrez ce code d'accès lors du premier lancement :
                    </p>
                    <div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; font-family: monospace; font-size: 1rem; letter-spacing: 0.05em; word-break: break-all; color: #0f172a;">
                        ${tenant.portalToken}
                    </div>
                    <p style="margin-top: 2rem; color: #94a3b8; font-size: 0.8rem;">
                        <em>Ne partagez pas ce code avec d'autres personnes. — RentMaestro</em>
                    </p>
                </div>
            `,
        });

        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
