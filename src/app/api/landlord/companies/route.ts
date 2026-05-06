import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const companies = await prisma.company.findMany({
        include: {
            apartments: {
                select: {
                    id: true,
                    leases: { where: { isActive: true }, select: { id: true } },
                },
            },
        },
        orderBy: { name: 'asc' },
    });

    const result = companies.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        siret: c.siret,
        address: c.address,
        logoUrl: (c as any).logoUrl ?? null,
        apartmentCount: c.apartments.length,
        activeLeaseCount: c.apartments.reduce((s, a) => s + a.leases.length, 0),
    }));

    return NextResponse.json(result);
}

export async function POST(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { name, type, siret, address } = await request.json();
    if (!name) return NextResponse.json({ error: 'Nom requis.' }, { status: 400 });
    const company = await prisma.company.create({ data: { name, type: type || null, siret: siret || null, address: address || null } });
    return NextResponse.json(company, { status: 201 });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
