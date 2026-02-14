import Link from "next/link";
import styles from "../../new/page.module.css"; // Reuse styling
import { updateTenant } from "@/actions/tenants";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({
        where: { id },
    });

    if (!tenant) {
        notFound();
    }

    const updateTenantWithId = updateTenant.bind(null, tenant.id);

    return (
        <div className={styles.container}>
            <Link href={`/tenants/${tenant.id}`} className={styles.backLink}>
                ← Annuler
            </Link>
            <h1 className={styles.title}>Modifier le locataire</h1>

            <form action={updateTenantWithId} className={styles.form}>
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Informations principales</h2>
                    <div className={styles.row}>
                        <div className={styles.formGroup}>
                            <label htmlFor="firstName" className={styles.label}>Prénom *</label>
                            <input type="text" id="firstName" name="firstName" defaultValue={tenant.firstName} required className={styles.input} />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="lastName" className={styles.label}>Nom *</label>
                            <input type="text" id="lastName" name="lastName" defaultValue={tenant.lastName} required className={styles.input} />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="email" className={styles.label}>Email *</label>
                        <input type="email" id="email" name="email" defaultValue={tenant.email} required className={styles.input} />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="phone" className={styles.label}>Téléphone</label>
                        <input type="tel" id="phone" name="phone" defaultValue={tenant.phone || ''} className={styles.input} />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="paymentDay" className={styles.label}>Jour de paiement habituel</label>
                        <input
                            type="number"
                            id="paymentDay"
                            name="paymentDay"
                            defaultValue={tenant.paymentDay || 5}
                            className={styles.input}
                            min="1"
                            max="31"
                            style={{ maxWidth: '100px' }}
                        />
                        <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                            Le retard est calculé après ce jour du mois.
                        </small>
                    </div>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Colocataire (Optionnel)</h2>
                    <div className={styles.row}>
                        <div className={styles.formGroup}>
                            <label htmlFor="coTenantFirstName" className={styles.label}>Prénom</label>
                            <input type="text" id="coTenantFirstName" name="coTenantFirstName" defaultValue={tenant.coTenantFirstName || ''} className={styles.input} />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="coTenantLastName" className={styles.label}>Nom</label>
                            <input type="text" id="coTenantLastName" name="coTenantLastName" defaultValue={tenant.coTenantLastName || ''} className={styles.input} />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="coTenantEmail" className={styles.label}>Email</label>
                        <input type="email" id="coTenantEmail" name="coTenantEmail" defaultValue={tenant.coTenantEmail || ''} className={styles.input} />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="coTenantPhone" className={styles.label}>Téléphone</label>
                        <input type="tel" id="coTenantPhone" name="coTenantPhone" defaultValue={tenant.coTenantPhone || ''} className={styles.input} />
                    </div>
                </div>

                <button type="submit" className={styles.submitButton}>Enregistrer les modifications</button>
            </form>
        </div>
    );
}
