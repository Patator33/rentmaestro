import { prisma } from "@/lib/prisma";
import LeaseForm from "./LeaseForm";

export const dynamic = "force-dynamic";

export default async function NewLeasePage() {
    const apartments = await prisma.apartment.findMany({
        orderBy: { address: 'asc' },
        include: {
            leases: {
                orderBy: { startDate: 'desc' },
                include: { tenant: true }
            }
        }
    });

    const tenants = await prisma.tenant.findMany({
        orderBy: { lastName: 'asc' }
    });

    return <LeaseForm apartments={apartments} tenants={tenants} />;
}
