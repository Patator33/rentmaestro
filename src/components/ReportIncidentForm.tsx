"use client";

import { useState } from "react";
import { reportIncident } from "@/actions/portal";

interface Props {
    apartmentId: string;
    tenantId: string;
    token: string;
}

export default function ReportIncidentForm({ apartmentId, tenantId, token }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await reportIncident(apartmentId, tenantId, title, description, token);
        setLoading(false);

        if (res.success) {
            setSuccess(true);
            setTitle("");
            setDescription("");
            setTimeout(() => {
                setIsOpen(false);
                setSuccess(false);
            }, 3000);
        } else {
            alert(res.error || "Une erreur est survenue.");
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="std-add-button"
                style={{ background: "#ef4444", border: "none" }}
            >
                ⚠️ Signaler un incident technique
            </button>
        );
    }

    return (
        <div style={{ background: "#f8fafc", padding: "1.5rem", borderRadius: "12px", border: "1px solid #e2e8f0", marginTop: "1rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#1e293b", marginBottom: "1rem" }}>Nouveau Signalement</h3>

            {success ? (
                <div style={{ background: "#ecfdf5", color: "#059669", padding: "1rem", borderRadius: "8px", border: "1px solid #10b981", fontWeight: 500 }}>
                    ✅ Votre incident a bien été transmis au propriétaire.
                </div>
            ) : (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                        <label className="std-label">Objet (ex: Fuite d&apos;eau, Panne Internet)</label>
                        <input
                            type="text"
                            required
                            className="std-input"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="std-label">Description détaillée du problème</label>
                        <textarea
                            required
                            className="std-input"
                            rows={4}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>
                    <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                        <button type="button" onClick={() => setIsOpen(false)} className="std-btn-cancel">Annuler</button>
                        <button type="submit" disabled={loading} className="std-btn-submit">
                            {loading ? "Envoi..." : "Envoyer le signalement"}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
