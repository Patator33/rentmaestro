import { prisma } from "@/lib/prisma";
import GlobalDocumentUpload from "@/components/GlobalDocumentUpload";
import PageTitleIcon from "@/components/PageTitleIcon";

export const dynamic = "force-dynamic";

export default async function GlobalGedPage() {
    const documents = await prisma.globalDocument.findMany({
        orderBy: { createdAt: 'asc' },
    });

    return (
        <div style={{ maxWidth: '1400px', padding: '2rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}><PageTitleIcon />GED Globale</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Documents disponibles pour tous les baux (RIB générique, modèles de contrats, etc.)
            </p>
            <GlobalDocumentUpload initialDocuments={documents} />
        </div>
    );
}
