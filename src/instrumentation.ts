// Planificateur interne : vérifie chaque heure si une sauvegarde SMB est échue.
// Ne dépend d'aucun appel extérieur (n8n, cron hôte) : le conteneur Next.js
// tourne en continu, c'est lui qui porte la planification.
export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;
    const { runScheduledBackupIfDue } = await import('./lib/backup');
    const tick = () => runScheduledBackupIfDue().catch(e => console.error('[backup] erreur planifiée:', e));
    setTimeout(tick, 60_000);
    setInterval(tick, 60 * 60 * 1000);
}
