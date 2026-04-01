import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const tenant = await prisma.tenant.findUnique({
        where: { id },
        include: {
            leases: {
                where: { isActive: true },
                include: { apartment: true },
                orderBy: { startDate: 'desc' },
                take: 1
            }
        }
    });

    if (!tenant) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const apt = tenant.leases[0]?.apartment;
    const adrParts = apt
        ? [apt.address, apt.zipCode, apt.city, 'France']
        : [];

    const lines: string[] = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${tenant.firstName} ${tenant.lastName}`,
        `N:${tenant.lastName};${tenant.firstName};;;`,
    ];

    if (tenant.email) lines.push(`EMAIL;TYPE=INTERNET:${tenant.email}`);
    if (tenant.phone) lines.push(`TEL;TYPE=CELL:${tenant.phone}`);
    if (adrParts.length) {
        lines.push(`ADR;TYPE=HOME:;;${adrParts[0]};${adrParts[1]};;${adrParts[2]};${adrParts[3]}`);
    }
    if (apt?.name) {
        lines.push(`NOTE:Locataire — ${apt.name}`);
    }
    lines.push('END:VCARD');

    const vcf = lines.join('\r\n');
    const filename = `${tenant.firstName}_${tenant.lastName}.vcf`.replace(/\s+/g, '_');

    return new Response(vcf, {
        headers: {
            'Content-Type': 'text/vcard; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
        }
    });
}
