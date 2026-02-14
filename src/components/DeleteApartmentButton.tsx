'use client';

import { deleteApartment } from "@/actions/apartments";
import { useState } from "react";

export default function DeleteApartmentButton({ id }: { id: string }) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async (e: React.FormEvent) => {
        e.preventDefault();

        if (window.confirm("Êtes-vous sûr de vouloir supprimer cet appartement ? Cette action est irréversible et supprimera tout l'historique associé.")) {
            setIsDeleting(true);
            try {
                await deleteApartment(id);
            } catch (error) {
                console.error("Erreur lors de la suppression:", error);
                setIsDeleting(false);
                alert("Une erreur est survenue lors de la suppression.");
            }
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="delete-btn"
            style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
        >
            {isDeleting ? "Suppression..." : "Supprimer"}
        </button>
    );
}

// Add hover styles globally or inline with a style tag if needed, but for now inline styles + global css classes work nicely if they exist.
// Since we are using modules mostly, we might want to pass a className or just rely on the inline styles for simplicity in this component.
