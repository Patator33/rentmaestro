import { prisma } from "@/lib/prisma";
import Link from "next/link";
import styles from "./page.module.css";
import { deleteContact } from "@/actions/contacts";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
    const contacts = await prisma.contact.findMany({
        include: { apartment: true },
        orderBy: { name: "asc" },
    });

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Annuaire des Contacts</h1>
                <Link href="/contacts/new" className="std-add-button">
                    + Nouveau Contact
                </Link>
            </header>

            {contacts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
                    <p>Aucun contact enregistré. Commencez par en ajouter un (Artisans, Syndic, Assurance...).</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {contacts.map((contact) => (
                        <div key={contact.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h2 className={styles.cardTitle}>{contact.name}</h2>
                                <span className={styles.badge}>{contact.role}</span>
                            </div>
                            <div className={styles.cardBody}>
                                {contact.phone && (
                                    <div className={styles.infoRow}>
                                        <span>📞</span> <a href={`tel:${contact.phone}`} className={styles.link}>{contact.phone}</a>
                                    </div>
                                )}
                                {contact.email && (
                                    <div className={styles.infoRow}>
                                        <span>✉️</span> <a href={`mailto:${contact.email}`} className={styles.link}>{contact.email}</a>
                                    </div>
                                )}
                                {contact.address && (
                                    <div className={styles.infoRow}>
                                        <span>📍</span> {contact.address}
                                    </div>
                                )}
                                {contact.apartment && (
                                    <div className={styles.apartmentLink}>
                                        🏠 Lié à: <Link href={`/apartments/${contact.apartment.id}`}>{contact.apartment.name || contact.apartment.address}</Link>
                                    </div>
                                )}
                                {contact.comment && (
                                    <div className={styles.comment}>
                                        {contact.comment}
                                    </div>
                                )}
                            </div>
                            <div className={styles.cardFooter}>
                                <form action={deleteContact.bind(null, contact.id)}>
                                    <button type="submit" className={styles.deleteButton} onClick={() => confirm("Supprimer ce contact ?")}>
                                        Supprimer
                                    </button>
                                </form>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
