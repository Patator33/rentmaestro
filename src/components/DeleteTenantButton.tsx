'use client';

import { deleteTenant } from "@/actions/tenants";
import { useState } from "react";
import { useToast } from "./Toast";
import ConfirmModal from "./ConfirmModal";
import styles from "./DeleteButton.module.css";

export default function DeleteTenantButton({ id }: { id: string }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const { addToast } = useToast();

    const handleDelete = async () => {
        setShowConfirm(false);
        setIsDeleting(true);
        try {
            await deleteTenant(id);
            addToast("Locataire supprimé avec succès", "success");
        } catch (error) {
            console.error("Erreur lors de la suppression:", error);
            setIsDeleting(false);
            addToast("Erreur lors de la suppression du locataire", "error");
        }
    };

    return (
        <>
            <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true); }}
                disabled={isDeleting}
                className={styles.deleteButton}
            >
                {isDeleting ? "Suppression..." : "Supprimer"}
            </button>
            <ConfirmModal
                isOpen={showConfirm}
                onConfirm={handleDelete}
                onCancel={() => setShowConfirm(false)}
                title="Supprimer ce locataire ?"
                message="Cette action est irréversible et supprimera toutes les informations et documents associés."
                confirmText="Supprimer"
                variant="danger"
            />
        </>
    );
}
