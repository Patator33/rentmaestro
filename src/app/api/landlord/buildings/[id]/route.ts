import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { parseExpenseFieldsFromRecord, parseFixedCostFieldsFromRecord } from '@/lib/building-expenses';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const body = await request.json();
    const { name, address, zipCode, city, companyId } = body;
    if (!name || !address) return NextResponse.json({ error: 'Nom et adresse requis.' }, { status: 400 });
    const building = await prisma.building.update({
        where: { id },
        data: { name, address, zipCode: zipCode || null, city: city || null, companyId: companyId || null, ...parseExpenseFieldsFromRecord(body), ...parseFixedCostFieldsFromRecord(body) },
    });
    return NextResponse.json(building);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const aptCount = await prisma.apartment.count({ where: { buildingId: id } });
    if (aptCount > 0) return NextResponse.json({ error: 'Des appartements sont liés à cet immeuble.' }, { status: 400 });
    await prisma.building.delete({ where: { id } });
    return NextResponse.json({ success: true });
}

export async function OPTIONS() { return new NextResponse(null, { status: 204 }); }
