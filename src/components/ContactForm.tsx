"use client";

import { createContact } from "@/actions/contacts";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Apartment {
    id: string;
    name: string | null;
    address: string;
}

interface Props {
    apartments: Apartment[];
}

export default function ContactForm({ apartments }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        await createContact(formData);
        router.push("/contacts");
        router.refresh();
    }

    return (
        <form onSubmit={handleSubmit} className="std-form">
            <div className="form-group">
                <label className="std-label">Nom / Entreprise</label>
                <input type="text" name="name" required className="std-input" placeholder="Ex: Jean Dujardin ou Plomberie Express" />
            </div>

            <div className="form-group">
                <label className="std-label">Rôle / Catégorie</label>
                <select name="role" required className="std-input">
                    <option value="ARTISAN">Artisan / Maintenance</option>
                    <option value="SYNDIC">Syndic de copropriété</option>
                    <option value="INSURANCE">Assurance</option>
                    <option value="TAX">Administration / Impôts</option>
                    <option value="TENANT_REFEREE">Référent Locataire</option>
                    <option value="OTHER">Autre</option>
                </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                    <label className="std-label">Email</label>
                    <input type="email" name="email" className="std-input" placeholder="email@exemple.com" />
                </div>
                <div className="form-group">
                    <label className="std-label">Téléphone</label>
                    <input type="tel" name="phone" className="std-input" placeholder="06.." />
                </div>
            </div>

            <div className="form-group">
                <label className="std-label">Adresse</label>
                <input type="text" name="address" className="std-input" placeholder="Adresse complète" />
            </div>

            <div className="form-group">
                <label className="std-label">Lier à un appartement (Optionnel)</label>
                <select name="apartmentId" className="std-input">
                    <option value="">-- Aucun --</option>
                    {apartments.map(apt => (
                        <option key={apt.id} value={apt.id}>{apt.name || apt.address}</option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label className="std-label">Notes / Commentaires</label>
                <textarea name="comment" className="std-input" rows={3} placeholder="Détails supplémentaires..."></textarea>
            </div>

            <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
                <button type="submit" disabled={loading} className="std-add-button" style={{ flex: 1 }}>
                    {loading ? "Enregistrement..." : "💾 Enregistrer le contact"}
                </button>
                <button type="button" onClick={() => router.back()} className="std-cancel-button" style={{ flex: 1 }}>
                    Annuler
                </button>
            </div>
        </form>
    );
}
