import Link from "next/link";
import styles from "./page.module.css";
import { createTenant } from "@/actions/tenants";

export default function NewTenantPage() {
    return (
        <div className={styles.container}>
            <Link href="/tenants" className={styles.backLink}>
                ← Retour aux locataires
            </Link>
            <h1 className={styles.title}>Ajouter un locataire</h1>

            <form action={createTenant} className={styles.form}>
                <div className={styles.row}>
                    <div className={styles.formGroup}>
                        <label htmlFor="firstName" className={styles.label}>Prénom *</label>
                        <input type="text" id="firstName" name="firstName" required className={styles.input} placeholder="Jean" />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="lastName" className={styles.label}>Nom *</label>
                        <input type="text" id="lastName" name="lastName" required className={styles.input} placeholder="Dupont" />
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="email" className={styles.label}>Email *</label>
                    <input type="email" id="email" name="email" required className={styles.input} placeholder="jean.dupont@email.com" />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="phone" className={styles.label}>Téléphone</label>
                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        className={styles.input}
                        placeholder="06 12 34 56 78"
                        pattern="^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$"
                        title="Format attendu : 06 12 34 56 78 ou +33 6 12 34 56 78"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="paymentDay" className={styles.label}>Jour de paiement habituel (du mois)</label>
                    <input
                        type="number"
                        id="paymentDay"
                        name="paymentDay"
                        className={styles.input}
                        placeholder="Ex: 5"
                        min="1"
                        max="31"
                        defaultValue="5"
                        style={{ maxWidth: '100px' }}
                    />
                    <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                        Utilisé pour calculer les retards de paiement.
                    </small>
                </div>

                <div className={styles.sectionSeparator} style={{ margin: '2rem 0', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <h2 className={styles.subtitle} style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Colocataire (Optionnel)</h2>
                </div>

                <div className={styles.row}>
                    <div className={styles.formGroup}>
                        <label htmlFor="coTenantFirstName" className={styles.label}>Prénom</label>
                        <input type="text" id="coTenantFirstName" name="coTenantFirstName" className={styles.input} placeholder="Marie" />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="coTenantLastName" className={styles.label}>Nom</label>
                        <input type="text" id="coTenantLastName" name="coTenantLastName" className={styles.input} placeholder="Martin" />
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="coTenantEmail" className={styles.label}>Email</label>
                    <input type="email" id="coTenantEmail" name="coTenantEmail" className={styles.input} placeholder="marie.martin@email.com" />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="coTenantPhone" className={styles.label}>Téléphone</label>
                    <input
                        type="tel"
                        id="coTenantPhone"
                        name="coTenantPhone"
                        className={styles.input}
                        placeholder="06 98 76 54 32"
                        pattern="^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$"
                        title="Format attendu : 06 12 34 56 78 ou +33 6 12 34 56 78"
                    />
                </div>

                <button type="submit" className={styles.submitButton}>Enregistrer</button>
            </form>
        </div>
    );
}
