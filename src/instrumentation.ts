// Planificateur interne : chaque heure, vérifie si une sauvegarde SMB est échue
// puis fait l'entretien des demandes de signature de bail (rattrapage des
// signatures et rappels). Ne dépend d'aucun appel extérieur (n8n, cron hôte) :
// le conteneur Next.js tourne en continu, c'est lui qui porte la planification.
export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;
    const { runScheduledBackupIfDue } = await import('./lib/backup');
    const { runSignatureMaintenance } = await import('./lib/signature-reminders');
    const tick = async () => {
        await runScheduledBackupIfDue().catch(e => console.error('[backup] erreur planifiée:', e));
        await runSignatureMaintenance().catch(e => console.error('[signature] erreur planifiée:', e));
    };
    setTimeout(tick, 60_000);
    setInterval(tick, 60 * 60 * 1000);
}
