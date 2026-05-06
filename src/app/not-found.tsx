import Link from "next/link";
import styles from "./error.module.css";

export default function NotFound() {
    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.icon}>🔍</div>
                <h2 className={styles.title}>Page introuvable</h2>
                <p className={styles.message}>
                    La page que vous recherchez n'existe pas ou a été déplacée.
                </p>
                <Link href="/" className={styles.homeLink}>
                    ← Retour à l'accueil
                </Link>
            </div>
        </div>
    );
}
