import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const company = await prisma.company.findUnique({
        where: { id },
        include: {
            apartments: {
                include: { leases: { where: { isActive: true }, include: { tenant: true } } },
                orderBy: { address: 'asc' },
            },
        },
    });
    if (!company) return NextResponse.json({ error: 'Société introuvable.' }, { status: 404 });
    return NextResponse.json(company);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const { name, type, siret, address } = await request.json();
    if (!name) return NextResponse.json({ error: 'Nom requis.' }, { status: 400 });
    const company = await prisma.company.update({
        where: { id },
        data: { name, type: type || null, siret: siret || null, address: address || null },
    });
    return NextResponse.json(company);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const aptCount = await prisma.apartment.count({ where: { companyId: id } });
    if (aptCount > 0) return NextResponse.json({ error: 'Des appartements sont liés à cette société.' }, { status: 400 });
    await prisma.company.delete({ where: { id } });
    return NextResponse.json({ success: true });
}

export async function OPTIONS() { return new NextResponse(null, { status: 204 }); }
