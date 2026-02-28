'use client';

import { deleteLease } from "@/actions/leases";
import { useState } from "react";
import { useToast } from "./Toast";
import ConfirmModal from "./ConfirmModal";
import styles from "./DeleteButton.module.css";

export default function DeleteLeaseButton({ id, label = "Supprimer" }: { id: string; label?: string }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const { addToast } = useToast();

    const handleDelete = async () => {
        setShowConfirm(false);
        setIsDeleting(true);
        try {
            await deleteLease(id);
            addToast("Contrat supprimé avec succès", "success");
        } catch (error) {
            console.error("Erreur lors de la suppression:", error);
            setIsDeleting(false);
            addToast("Erreur lors de la suppression du contrat", "error");
        }
    };

    return (
        <>
            <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true); }}
                disabled={isDeleting}
                className={styles.deleteButton}
            >
                {isDeleting ? "Suppression..." : label}
            </button>
            <ConfirmModal
                isOpen={showConfirm}
                onConfirm={handleDelete}
                onCancel={() => setShowConfirm(false)}
                title="Supprimer ce contrat ?"
                message="Cette action est irréversible et supprimera le contrat ainsi que son historique de paiements."
                confirmText="Supprimer"
                variant="danger"
            />
        </>
    );
}
