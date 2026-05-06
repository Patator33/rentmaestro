export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import ContactForm from "@/components/ContactForm";
import Link from "next/link";
import styles from "../page.module.css";

export default async function NewContactPage() {
    const apartments = await prisma.apartment.findMany({
        orderBy: { address: "asc" },
        select: { id: true, name: true, address: true }
    });

    return (
        <div className={styles.container} style={{ maxWidth: "600px" }}>
            <Link href="/contacts" style={{ color: "var(--accent-color)", textDecoration: "none", marginBottom: "1rem", display: "inline-block" }}>
                ← Retour à l'annuaire
            </Link>
            <h1 className={styles.title} style={{ marginBottom: "2rem" }}>Nouveau Contact</h1>

            <div className="std-card" style={{ padding: "2rem" }}>
                <ContactForm apartments={apartments} />
            </div>
        </div>
    );
}
