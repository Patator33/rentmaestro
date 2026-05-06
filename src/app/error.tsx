'use client';

import styles from './error.module.css';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.icon}>💥</div>
                <h2 className={styles.title}>Oups, quelque chose s'est mal passé</h2>
                <p className={styles.message}>
                    {error.message || "Une erreur inattendue est survenue. Veuillez réessayer."}
                </p>
                <button onClick={reset} className={styles.button}>
                    Réessayer
                </button>
            </div>
        </div>
    );
}
