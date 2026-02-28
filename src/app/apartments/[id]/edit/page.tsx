import Link from "next/link";
import styles from "../../new/page.module.css"; // Reuse styling
import { updateApartment } from "@/actions/apartments";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function EditApartmentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const apartment = await prisma.apartment.findUnique({
        where: { id },
    });

    if (!apartment) {
        notFound();
    }

    const updateApartmentWithId = updateApartment.bind(null, apartment.id);

    return (
        <div className={styles.container}>
            <Link href={`/apartments/${apartment.id}`} className={styles.backLink}>
                ← Annuler
            </Link>
            <h1 className={styles.title}>Modifier l'appartement</h1>

            <form action={updateApartmentWithId} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="name" className={styles.label}>Nom de l'appartement</label>
                    <input type="text" id="name" name="name" defaultValue={apartment.name || ''} className={styles.input} placeholder="Studio Centre-ville, Appt Republique..." />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="address" className={styles.label}>Adresse *</label>
                    <input type="text" id="address" name="address" defaultValue={apartment.address} required className={styles.input} placeholder="123 rue de la Paix" />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="complement" className={styles.label}>Complément d'adresse</label>
                    <input type="text" id="complement" name="complement" defaultValue={apartment.complement || ''} className={styles.input} placeholder="Etage, Batiment..." />
                </div>

                <div className={styles.row}>
                    <div className={styles.formGroup}>
                        <label htmlFor="zipCode" className={styles.label}>Code Postal *</label>
                        <input
                            type="text"
                            id="zipCode"
                            name="zipCode"
                            defaultValue={apartment.zipCode}
                            required
                            className={styles.input}
                            placeholder="75000"
                            pattern="^\d{5}$"
                            title="Le code postal doit contenir exactement 5 chiffres"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="city" className={styles.label}>Ville *</label>
                        <input type="text" id="city" name="city" defaultValue={apartment.city} required className={styles.input} placeholder="Paris" />
                    </div>
                </div>

                <div className={styles.row}>
                    <div className={styles.formGroup}>
                        <label htmlFor="rent" className={styles.label}>Loyer (HC) *</label>
                        <input type="number" step="0.01" id="rent" name="rent" defaultValue={apartment.rent} required className={styles.input} placeholder="800.00" />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="charges" className={styles.label}>Charges *</label>
                        <input type="number" step="0.01" id="charges" name="charges" defaultValue={apartment.charges} required className={styles.input} placeholder="50.00" />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="mortgageAmount" className={styles.label}>Mensualité crédit</label>
                        <input type="number" step="0.01" id="mortgageAmount" name="mortgageAmount" defaultValue={apartment.mortgageAmount || ''} className={styles.input} placeholder="650.00" />
                    </div>
                </div>

                <div className={styles.row}>
                    <div className={styles.formGroup}>
                        <label htmlFor="insuranceAmount" className={styles.label}>Assurance PNO (Mensuelle)</label>
                        <input type="number" step="0.01" id="insuranceAmount" name="insuranceAmount" defaultValue={apartment.insuranceAmount || ''} className={styles.input} placeholder="15.00" />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="taxAmount" className={styles.label}>Taxe Foncière (Mensuelle)</label>
                        <input type="number" step="0.01" id="taxAmount" name="taxAmount" defaultValue={apartment.taxAmount || ''} className={styles.input} placeholder="80.00" />
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="description" className={styles.label}>Description</label>
                    <textarea id="description" name="description" defaultValue={apartment.description || ''} className={styles.textarea} placeholder="T2 lumineux..." />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="comment" className={styles.label}>Commentaire interne (Privé)</label>
                    <textarea id="comment" name="comment" defaultValue={apartment.comment || ''} className={styles.textarea} placeholder="Notes sur le propriétaire, code d'entrée..." />
                </div>

                <button type="submit" className={styles.submitButton}>Enregistrer les modifications</button>
            </form>
        </div>
    );
}
