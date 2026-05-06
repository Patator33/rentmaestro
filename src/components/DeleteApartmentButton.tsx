'use client';

import { deleteApartment } from "@/actions/apartments";
import { useState } from "react";
import { useToast } from "./Toast";
import ConfirmModal from "./ConfirmModal";
import styles from "./DeleteButton.module.css";

export default function DeleteApartmentButton({ id }: { id: string }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const { addToast } = useToast();

    const handleDelete = async () => {
        setShowConfirm(false);
        setIsDeleting(true);
        try {
            await deleteApartment(id);
            addToast("Appartement supprimé avec succès", "success");
        } catch (error) {
            console.error("Erreur lors de la suppression:", error);
            setIsDeleting(false);
            addToast("Erreur lors de la suppression de l'appartement", "error");
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
                title="Supprimer cet appartement ?"
                message="Cette action est irréversible et supprimera tout l'historique associé (baux, paiements)."
                confirmText="Supprimer"
                variant="danger"
            />
        </>
    );
}
