import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { reportIncident } from '@/actions/portal';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    const tenant = await prisma.tenant.findUnique({ where: { portalToken: token } });
    if (!tenant) {
        return NextResponse.json({ error: 'Token invalide' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, apartmentId } = body;

    if (!title?.trim() || !apartmentId) {
        return NextResponse.json({ error: 'Titre et appartement requis' }, { status: 400 });
    }

    const result = await reportIncident(apartmentId, tenant.id, title, description ?? '', token);

    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
