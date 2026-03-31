import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const tenants = await prisma.tenant.findMany({
        include: {
            leases: {
                where: { isActive: true },
                include: { apartment: { select: { id: true, address: true, name: true } } },
                take: 1,
            },
        },
        orderBy: { lastName: 'asc' },
    });

    return NextResponse.json(tenants);
}

export async function POST(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const body = await request.json();
    const { firstName, lastName, email, phone, coTenantFirstName, coTenantLastName, coTenantEmail, coTenantPhone, paymentDay } = body;

    if (!firstName || !lastName || !email) {
        return NextResponse.json({ error: 'Prénom, nom et email requis.' }, { status: 400 });
    }

    const tenant = await prisma.tenant.create({
        data: {
            firstName,
            lastName,
            email,
            phone: phone || null,
            coTenantFirstName: coTenantFirstName || null,
            coTenantLastName: coTenantLastName || null,
            coTenantEmail: coTenantEmail || null,
            coTenantPhone: coTenantPhone || null,
            paymentDay: paymentDay ? parseInt(paymentDay) : 5,
        },
    });

    return NextResponse.json(tenant, { status: 201 });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
