import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ReconciliationBoard from "@/components/ReconciliationBoard";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
    // Fetch base data logic
    const apartments = await prisma.apartment.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, address: true, name: true, city: true }
    });

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 className={styles.title}>Rapprochement Bancaire</h1>
                    <Link href="/" style={{ color: "var(--primary-color)" }}>Retour Dashboard</Link>
                </div>
            </header>

            <div className={styles.infoBox}>
                <p>
                    Importez un fichier CSV issu de votre espace bancaire. Le système tentera de faire correspondre
                    vos transactions (Crédit) avec vos loyers en attente, et vous permettra de les valider en un clic.
                </p>
            </div>

            <ReconciliationBoard apartments={apartments} />
        </div>
    );
}
