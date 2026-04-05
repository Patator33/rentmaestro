import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const apartments = await prisma.apartment.findMany({
        include: {
            leases: {
                where: { isActive: true },
                include: { tenant: { select: { id: true, firstName: true, lastName: true } } },
                take: 1,
            },
        },
        orderBy: { address: 'asc' },
    });

    return NextResponse.json(apartments);
}

export async function POST(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const body = await request.json();
    const { name, address, complement, city, zipCode, rent, charges, mortgageAmount, insuranceAmount, taxAmount, defaultDeposit, description, buildingId } = body;

    if (!address || !city || !zipCode) {
        return NextResponse.json({ error: 'Adresse, ville et code postal requis.' }, { status: 400 });
    }

    const apartment = await prisma.apartment.create({
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
        },
    });

    return NextResponse.json(apartment, { status: 201 });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
