import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const session = await readSession(request);
    if (!session.userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (q.length < 2) {
        return NextResponse.json({ tenants: [], apartments: [], contacts: [], buildings: [], companies: [], leases: [] });
    }

    const [tenants, apartments, contacts, buildings, companies, leases] = await Promise.all([
        prisma.tenant.findMany({
            where: {
                isArchived: false,
                OR: [
                    { firstName: { contains: q } },
                    { lastName: { contains: q } },
                    { email: { contains: q } },
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
                ],
            },
            select: { id: true, address: true, city: true, name: true },
            take: 5,
        }),
        prisma.contact.findMany({
            where: {
                OR: [
                    { name: { contains: q } },
                    { email: { contains: q } },
                ],
            },
            select: { id: true, name: true, role: true, apartmentId: true },
            take: 3,
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

    return NextResponse.json({ tenants, apartments, contacts, buildings, companies, leases });
}
