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

    const lease = await prisma.lease.findUnique({
        where: { id },
        include: {
            tenant: true,
            apartment: true,
            payments: { orderBy: { period: 'desc' } },
            documents: { orderBy: { createdAt: 'asc' } },
        },
    });

    if (!lease) return NextResponse.json({ error: 'Bail introuvable.' }, { status: 404 });
    return NextResponse.json(lease);
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const body = await request.json();
    const { startDate, endDate, rentAmount, chargesAmount, depositAmount, depositStatus, isActive, rentEffectiveDate } = body;

    let effectiveDate: Date | null = null;
    if (rentEffectiveDate) {
        const [y, m] = (rentEffectiveDate as string).split('-').map(Number);
        effectiveDate = new Date(Date.UTC(y, m - 1, 1));
    }

    const lease = await prisma.lease.update({
        where: { id },
        data: {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : null,
            rentAmount: rentAmount != null ? parseFloat(rentAmount) : undefined,
            chargesAmount: chargesAmount != null ? parseFloat(chargesAmount) : undefined,
            depositAmount: depositAmount != null ? parseFloat(depositAmount) : undefined,
            depositStatus: depositStatus !== undefined ? depositStatus : undefined,
            isActive: isActive != null ? Boolean(isActive) : undefined,
            ...(effectiveDate ? { lastRentReviewDate: effectiveDate } : {}),
        },
    });

    if (effectiveDate && (rentAmount != null || chargesAmount != null)) {
        const newRent = rentAmount != null ? parseFloat(rentAmount) : lease.rentAmount;
        const newCharges = chargesAmount != null ? parseFloat(chargesAmount) : lease.chargesAmount;
        await prisma.rentPayment.updateMany({
            where: {
                leaseId: id,
                period: { gte: effectiveDate },
                status: { not: 'PAID' },
            },
            data: { amount: newRent + newCharges },
        });
    }

    return NextResponse.json(lease);
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const body = await request.json();

    if (body.action === 'depositPay') {
        const paidAmount = parseFloat(body.paidAmount);
        if (isNaN(paidAmount) || paidAmount <= 0) {
            return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
        }
        const lease = await prisma.lease.findUnique({ where: { id } });
        if (!lease) return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 });
        const total = lease.depositAmount ?? 0;
        const alreadyPaid = lease.depositPaidAmount ?? 0;
        const totalPaid = alreadyPaid + paidAmount;
        const isComplete = totalPaid >= total;
        await prisma.lease.update({
            where: { id },
            data: {
                depositPaidAmount: isComplete ? null : totalPaid,
                depositStatus: isComplete ? 'RECEIVED' : 'PARTIAL_RECEIVED',
            },
        });
        return NextResponse.json({ success: true, status: isComplete ? 'RECEIVED' : 'PARTIAL_RECEIVED' });
    }

    if (body.action === 'terminate') {
        const terminationDate = body.terminationDate ? new Date(body.terminationDate) : new Date();
        await prisma.lease.update({
            where: { id },
            data: { isActive: false, endDate: terminationDate },
        });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
