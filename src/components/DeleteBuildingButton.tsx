'use client';

import { deleteBuilding } from "@/actions/buildings";
import { useState } from "react";
import { useToast } from "./Toast";
import ConfirmModal from "./ConfirmModal";
import styles from "./DeleteButton.module.css";

export default function DeleteBuildingButton({ id, name, hasApartments }: { id: string; name: string; hasApartments: boolean }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const { addToast } = useToast();

    const handleDelete = async () => {
        setShowConfirm(false);
        setIsDeleting(true);
        try {
            await deleteBuilding(id);
            addToast("Immeuble supprimé", "success");
        } catch {
            setIsDeleting(false);
            addToast("Erreur lors de la suppression", "error");
        }
    };

    return (
        <>
            <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true); }}
                disabled={isDeleting || hasApartments}
                title={hasApartments ? "Dissociez d'abord les appartements" : "Supprimer"}
                style={{ padding: '0.35rem 0.75rem', background: 'var(--pill-err-bg)', border: '1px solid var(--pill-err-border)', borderRadius: '999px', color: 'var(--pill-err-color)', fontSize: '0.8rem', fontWeight: 600, cursor: hasApartments ? 'not-allowed' : 'pointer', opacity: hasApartments ? 0.4 : 1, fontFamily: 'inherit' }}
            >
                {isDeleting ? '...' : '🗑'}
            </button>
            <ConfirmModal
                isOpen={showConfirm}
                onConfirm={handleDelete}
                onCancel={() => setShowConfirm(false)}
                title={`Supprimer "${name}" ?`}
                message="Cette action est irréversible."
                confirmText="Supprimer"
                variant="danger"
            />
        </>
    );
}
