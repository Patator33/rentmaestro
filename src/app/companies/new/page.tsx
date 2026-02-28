import Link from "next/link";
import CompanyForm from "@/components/CompanyForm";
import styles from "@/components/CompanyForm.module.css";

export default function NewCompanyPage() {
    return (
        <div className={styles.container}>
            <Link href="/companies" className={styles.backLink}>
                ← Retour aux sociétés
            </Link>
            <h1 className={styles.title}>Ajouter une société</h1>
            <CompanyForm />
        </div>
    );
}
