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

    const tenant = await prisma.tenant.findUnique({
        where: { id },
        include: {
            leases: {
                include: {
                    apartment: true,
                    payments: { orderBy: { period: 'desc' }, take: 6 },
                },
                orderBy: { startDate: 'desc' },
            },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
    });

    if (!tenant) return NextResponse.json({ error: 'Locataire introuvable.' }, { status: 404 });
    return NextResponse.json(tenant);
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const body = await request.json();
    const { firstName, lastName, email, phone, coTenantFirstName, coTenantLastName, coTenantEmail, coTenantPhone, paymentDay } = body;

    if (!firstName || !lastName || !email) {
        return NextResponse.json({ error: 'Prénom, nom et email requis.' }, { status: 400 });
    }

    const tenant = await prisma.tenant.update({
        where: { id },
        data: {
            firstName, lastName, email,
            phone: phone || null,
            coTenantFirstName: coTenantFirstName || null,
            coTenantLastName: coTenantLastName || null,
            coTenantEmail: coTenantEmail || null,
            coTenantPhone: coTenantPhone || null,
            paymentDay: paymentDay ? parseInt(paymentDay) : 5,
        },
    });

    return NextResponse.json(tenant);
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const { action } = await request.json();

    if (action === 'archive') {
        await prisma.tenant.update({ where: { id }, data: { isArchived: true, portalToken: null } });
        return NextResponse.json({ success: true });
    }
    if (action === 'reactivate') {
        await prisma.tenant.update({ where: { id }, data: { isArchived: false } });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;

    const leaseCount = await prisma.lease.count({ where: { tenantId: id } });
    if (leaseCount > 0) {
        return NextResponse.json({ error: 'Supprimez d\'abord le bail associé.' }, { status: 400 });
    }

    await prisma.tenant.delete({ where: { id } });
    return NextResponse.json({ success: true });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
