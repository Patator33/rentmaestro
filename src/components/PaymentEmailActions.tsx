'use client';

import { useState } from 'react';
import { sendQuittanceEmail, sendReminderEmail } from '@/actions/email';

interface Props {
    paymentId: string | null;
    leaseId: string;
    periodStr: string;
    isPaid: boolean;
    hasEmail: boolean;
    buttonStyle: string;
}

export default function PaymentEmailActions({ paymentId, leaseId, periodStr, isPaid, hasEmail, buttonStyle }: Props) {
    const [loading, setLoading] = useState(false);

    if (!hasEmail) return null;

    const handleSendReceipt = async () => {
        if (!paymentId) {
            alert("❌ Erreur : Paiement introuvable.");
            return;
        }
        if (!confirm("Voulez-vous envoyer la quittance par email au locataire ?")) return;
        setLoading(true);
        const res = await sendQuittanceEmail(paymentId);
        setLoading(false);
        if (res.success) {
            alert("✅ Quittance envoyée avec succès !");
        } else {
            alert("❌ Erreur : " + res.error);
        }
    };

    const handleSendReminder = async () => {
        if (!confirm("Voulez-vous envoyer une relance par email au locataire ?")) return;
        setLoading(true);
        const res = await sendReminderEmail(leaseId, periodStr);
        setLoading(false);
        if (res.success) {
            alert("✅ Relance envoyée avec succès !");
            // Optional: you could router.refresh() here to update the 'Relancé le' text, but the server action doesn't update the DB sentAt yet. Let's fix that in action.
        } else {
            alert("❌ Erreur : " + res.error);
        }
    };

    return (
        <>
            {isPaid ? (
                <button
                    onClick={handleSendReceipt}
                    disabled={loading}
                    className={buttonStyle}
                    style={{ background: 'rgba(56,189,248,0.15)', color: '#0ea5e9', border: 'none', marginLeft: '0.5rem' }}
                >
                    {loading ? '⏳ Envoi...' : '📧 Envoyer Quittance'}
                </button>
            ) : (
                <button
                    onClick={handleSendReminder}
                    disabled={loading}
                    className={buttonStyle}
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', marginLeft: '0.5rem' }}
                >
                    {loading ? '⏳ Envoi...' : '⚠️ Relance par Email'}
                </button>
            )}
        </>
    );
}
