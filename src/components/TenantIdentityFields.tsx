import styles from '@/app/apartments/new/page.module.css';

type Props = {
    /** '' pour le locataire principal, 'coTenant' pour le colocataire. */
    prefix?: '' | 'coTenant';
    birthDate?: Date | string | null;
    birthPlace?: string | null;
    address?: string | null;
};

function toDateInput(v: Date | string | null | undefined): string {
    if (!v) return '';
    const d = typeof v === 'string' ? new Date(v) : v;
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

/**
 * État civil repris dans les baux. Les `name` sont ceux lus par
 * `readTenantIdentityData` : birthDate/birthPlace/address ou coTenant*.
 */
export default function TenantIdentityFields({ prefix = '', birthDate, birthPlace, address }: Props) {
    const n = (base: string) => (prefix ? `${prefix}${base[0].toUpperCase()}${base.slice(1)}` : base);
    return (
        <>
            <div className={styles.row}>
                <div className={styles.formGroup}>
                    <label htmlFor={n('birthDate')} className={styles.label}>Date de naissance</label>
                    <input type="date" id={n('birthDate')} name={n('birthDate')} defaultValue={toDateInput(birthDate)} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor={n('birthPlace')} className={styles.label}>Lieu de naissance</label>
                    <input type="text" id={n('birthPlace')} name={n('birthPlace')} defaultValue={birthPlace ?? ''} className={styles.input} />
                </div>
            </div>
            <div className={styles.formGroup}>
                <label htmlFor={n('address')} className={styles.label}>Adresse actuelle</label>
                <input type="text" id={n('address')} name={n('address')} defaultValue={address ?? ''} className={styles.input} placeholder="44 la Rennerie, 35390 Saint-Sulpice-des-Landes" />
            </div>
        </>
    );
}
