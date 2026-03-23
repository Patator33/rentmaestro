import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditLeaseForm from "./EditLeaseForm";

export const dynamic = "force-dynamic";

export default async function EditLeasePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const lease = await prisma.lease.findUnique({
        where: { id },
        include: { apartment: true, tenant: true }
    });

    if (!lease) notFound();

    return <EditLeaseForm lease={lease} />;
}
