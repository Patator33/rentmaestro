import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import path from 'path';
import { promises as fs } from 'fs';

const MIME: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// GET /api/portal/[token]/file?u=/uploads/xxx
// Sert un fichier uploadé au locataire, uniquement s'il fait partie des
// documents auxquels son portail donne accès.
export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    const u = new URL(request.url).searchParams.get('u') ?? '';
    if (!u.startsWith('/uploads/')) {
        return new NextResponse('Fichier invalide', { status: 400 });
    }

    const [tenant, globalDocs] = await Promise.all([
        prisma.tenant.findUnique({
            where: { portalToken: token },
            include: {
                documents: true,
                leases: {
                    include: {
                        documents: true,
                        apartment: {
                            include: {
                                documents: true,
                                company: { include: { documents: true } },
                            },
                        },
                    },
                },
            },
        }),
        prisma.globalDocument.findMany(),
    ]);
    if (!tenant) return new NextResponse('Token invalide', { status: 404 });

    const allowed = new Set<string>([
        ...tenant.documents.map(d => d.url),
        ...globalDocs.map(d => d.url),
        ...tenant.leases.flatMap(l => [
            ...l.documents.map(d => d.url),
            ...l.apartment.documents.map(d => d.url),
            ...(l.apartment.company?.documents.map(d => d.url) ?? []),
        ]),
    ]);
    if (!allowed.has(u)) return new NextResponse('Accès refusé', { status: 403 });

    // Résolution sûre dans public/uploads (pas de traversée de répertoire)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.resolve(path.join(process.cwd(), 'public', u));
    if (!filePath.startsWith(uploadsDir + path.sep)) {
        return new NextResponse('Fichier invalide', { status: 400 });
    }

    try {
        const data = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        return new NextResponse(new Uint8Array(data), {
            headers: {
                'Content-Type': MIME[ext] ?? 'application/octet-stream',
                'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
                'Cache-Control': 'private, max-age=300',
            },
        });
    } catch {
        return new NextResponse('Fichier introuvable', { status: 404 });
    }
}
