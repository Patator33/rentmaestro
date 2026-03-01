import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (q.length < 2) {
        return NextResponse.json({ tenants: [], apartments: [], contacts: [] });
    }

    const [tenants, apartments, contacts] = await Promise.all([
        prisma.tenant.findMany({
            where: {
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
    ]);

    return NextResponse.json({ tenants, apartments, contacts });
}
