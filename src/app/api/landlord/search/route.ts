import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (q.length < 2) {
        return NextResponse.json({ tenants: [], apartments: [], buildings: [], companies: [], leases: [] });
    }

    const [tenants, apartments, buildings, companies, leases] = await Promise.all([
        prisma.tenant.findMany({
            where: {
                isArchived: false,
                OR: [
                    { firstName: { contains: q } },
                    { lastName: { contains: q } },
                    { email: { contains: q } },
                    { phone: { contains: q } },
                ],
            },
            select: { id: true, firstName: true, lastName: true, email: true },
            take: 5,
        }),
        prisma.apartment.findMany({
            where: {
                OR: [
                    { address: { contains: q } },
                    { city: { contains: q } },
                    { name: { contains: q } },
                    { zipCode: { contains: q } },
                ],
            },
            select: { id: true, address: true, city: true, name: true },
            take: 5,
        }),
        prisma.building.findMany({
            where: {
                OR: [
                    { name: { contains: q } },
                    { address: { contains: q } },
                    { city: { contains: q } },
                    { zipCode: { contains: q } },
                ],
            },
            select: { id: true, name: true, address: true, city: true },
            take: 5,
        }),
        prisma.company.findMany({
            where: {
                OR: [
                    { name: { contains: q } },
                    { siret: { contains: q } },
                    { address: { contains: q } },
                ],
            },
            select: { id: true, name: true, type: true },
            take: 5,
        }),
        prisma.lease.findMany({
            where: {
                OR: [
                    { tenant: { firstName: { contains: q } } },
                    { tenant: { lastName: { contains: q } } },
                    { apartment: { name: { contains: q } } },
                    { apartment: { address: { contains: q } } },
                ],
            },
            select: {
                id: true,
                tenant: { select: { firstName: true, lastName: true } },
                apartment: { select: { name: true, address: true, city: true } },
                startDate: true,
                endDate: true,
            },
            take: 5,
        }),
    ]);

    return NextResponse.json({ tenants, apartments, buildings, companies, leases });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
