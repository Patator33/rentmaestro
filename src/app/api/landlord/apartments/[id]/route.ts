import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;

    const apartment = await prisma.apartment.findUnique({
        where: { id },
        include: {
            building: true,
            company: true,
            leases: {
                include: {
                    tenant: true,
                    payments: { orderBy: { period: 'desc' }, take: 24 },
                },
                orderBy: { startDate: 'desc' },
            },
            tasks: { orderBy: { createdAt: 'desc' }, take: 20 },
        },
    });

    if (!apartment) return NextResponse.json({ error: 'Appartement introuvable.' }, { status: 404 });
    return NextResponse.json(apartment);
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const body = await request.json();
    const { name, address, complement, city, zipCode, rent, charges, mortgageAmount, insuranceAmount, taxAmount, defaultDeposit, description, buildingId, companyId, surface, dpe } = body;

    if (!address || !city || !zipCode) {
        return NextResponse.json({ error: 'Adresse, ville et code postal requis.' }, { status: 400 });
    }

    const apartment = await prisma.apartment.update({
        where: { id },
        data: {
            name: name || null,
            address,
            complement: complement || null,
            city,
            zipCode,
            rent: parseFloat(rent) || 0,
            charges: parseFloat(charges) || 0,
            mortgageAmount: mortgageAmount ? parseFloat(mortgageAmount) : null,
            insuranceAmount: insuranceAmount ? parseFloat(insuranceAmount) : null,
            taxAmount: taxAmount ? parseFloat(taxAmount) : null,
            defaultDeposit: defaultDeposit ? parseFloat(defaultDeposit) : null,
            description: description || null,
            buildingId: buildingId || null,
            companyId: companyId || null,
            surface: surface ? parseFloat(surface) : null,
            dpe: dpe || null,
        },
    });

    return NextResponse.json(apartment);
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;

    const leaseCount = await prisma.lease.count({ where: { apartmentId: id } });
    if (leaseCount > 0) {
        return NextResponse.json({ error: 'Supprimez d\'abord les baux associés.' }, { status: 400 });
    }

    await prisma.apartment.delete({ where: { id } });
    return NextResponse.json({ success: true });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
