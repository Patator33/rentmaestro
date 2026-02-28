import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CompanyForm from "@/components/CompanyForm";
import Link from "next/link";
import styles from "@/components/CompanyForm.module.css";

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const company = await prisma.company.findUnique({
        where: { id },
    });

    if (!company) {
        notFound();
    }

    return (
        <div className={styles.container}>
            <Link href={`/companies/${company.id}`} className={styles.backLink}>
                ← Retour à la société
            </Link>
            <h1 className={styles.title}>Modifier {company.name}</h1>
            <CompanyForm company={company} />
        </div>
    );
}
