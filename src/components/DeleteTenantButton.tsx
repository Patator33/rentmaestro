'use client';

import { deleteTenant } from "@/actions/tenants";
import { useState } from "react";
import styles from "./DeleteButton.module.css";

export default function DeleteTenantButton({ id }: { id: string }) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async (e: React.FormEvent) => {
        // Prevent default form submission or link navigation if wrapping
        e.preventDefault();
        e.stopPropagation();

        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce locataire ? Cette action est irréversible.")) {
            setIsDeleting(true);
            try {
                await deleteTenant(id);
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
            className={styles.deleteButton}
        >
            {isDeleting ? "Suppression..." : "Supprimer"}
        </button>
    );
}
