import Link from "next/link";
import { prisma } from "@/lib/prisma";
import GlobalDocumentUpload from "@/components/GlobalDocumentUpload";
import PageTitleIcon from "@/components/PageTitleIcon";

export const dynamic = "force-dynamic";

export default async function GlobalGedPage() {
    const documents = await prisma.globalDocument.findMany({
        orderBy: { createdAt: 'asc' },
    });

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}><PageTitleIcon />GED Globale</h1>
                <Link href="/" className="std-add-button" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>← Retour Dashboard</Link>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Documents disponibles pour tous les baux (RIB générique, modèles de contrats, etc.)
            </p>
            <GlobalDocumentUpload initialDocuments={documents} />
        </div>
    );
}
