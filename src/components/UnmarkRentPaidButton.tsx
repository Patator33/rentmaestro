'use client';

import { useTransition } from 'react';
import { cancelRentPayment } from '@/actions/rents';

interface Props {
    paymentId: string;
    buttonStyle?: string;
}

export default function UnmarkRentPaidButton({ paymentId, buttonStyle }: Props) {
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        if (!window.confirm('Annuler ce paiement marqué reçu ?')) return;
        startTransition(async () => {
            await cancelRentPayment(paymentId);
        });
    };

    return (
        <button
            onClick={handleClick}
            disabled={isPending}
            className={buttonStyle}
            style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--error)', opacity: isPending ? 0.6 : 1 }}
            title="Annuler le paiement"
        >
            ↩
        </button>
    );
}
