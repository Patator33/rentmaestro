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
                style={{ padding: '0.35rem 0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', color: '#ef4444', fontSize: '0.8rem', cursor: hasApartments ? 'not-allowed' : 'pointer', opacity: hasApartments ? 0.4 : 1, fontFamily: 'inherit' }}
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
