import SMB2 from '@marsaud/smb2';
import { readFile } from 'fs/promises';
import { prisma } from '@/lib/prisma';
import { notifyN8n } from '@/lib/n8n';

export interface SmbConfig {
    host: string;
    share: string;
    /** Sous-dossier dans le partage, vide = racine. */
    folder: string;
    username: string;
    password: string;
    domain: string;
}

export type BackupFrequency = 'daily' | 'weekly' | 'monthly';

const FREQUENCY_DAYS: Record<BackupFrequency, number> = {
    daily: 1,
    weekly: 7,
    // Approximation à 30 jours plutôt qu'un vrai calcul calendaire : évite les
    // cas limites de mois à durée variable pour un intervalle qui n'a de toute
    // façon pas besoin d'être exact au jour près.
    monthly: 30,
};

function getDbPath(): string {
    const url = process.env.DATABASE_URL || 'file:./prisma/dev.db';
    return url.replace(/^file:/, '');
}

function normalizeFolder(folder: string): string {
    return folder.trim().replace(/^[\\/]+|[\\/]+$/g, '').replace(/\//g, '\\');
}

function remotePath(folder: string, fileName: string): string {
    const clean = normalizeFolder(folder);
    return clean ? `${clean}\\${fileName}` : fileName;
}

function makeClient(config: SmbConfig): SMB2 {
    return new SMB2({
        share: `\\\\${config.host}\\${config.share}`,
        domain: config.domain || 'WORKGROUP',
        username: config.username,
        password: config.password,
    });
}

function backupFileName(date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `rentmaestro_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}.db`;
}

const SMB_TIMEOUT_MS = 15000;

/**
 * La librairie SMB2 n'expose pas de délai de connexion : un hôte injoignable
 * (mauvaise IP, pare-feu) bloquerait sinon indéfiniment — dangereux pour le
 * CRON quotidien qui partage sa requête avec l'envoi des quittances/relances.
 */
function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error(`Délai dépassé (${SMB_TIMEOUT_MS / 1000}s) lors de ${label} — serveur injoignable ou pare-feu.`)),
            SMB_TIMEOUT_MS
        );
        promise.then(
            v => { clearTimeout(timer); resolve(v); },
            e => { clearTimeout(timer); reject(e); }
        );
    });
}

/** Vérifie que le partage est joignable avec ces identifiants, sans rien écrire. */
export async function testSmbConnection(config: SmbConfig): Promise<{ success: boolean; error?: string }> {
    const client = makeClient(config);
    try {
        await withTimeout(client.readdir(normalizeFolder(config.folder)), 'la lecture du dossier');
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Erreur de connexion' };
    } finally {
        client.disconnect();
    }
}

/** Envoie la base actuelle sur le partage et purge les sauvegardes au-delà de `retention`. */
async function uploadBackup(config: SmbConfig, retention: number): Promise<{ success: boolean; error?: string; fileName?: string }> {
    const client = makeClient(config);
    try {
        const folder = normalizeFolder(config.folder);
        if (folder) await withTimeout(client.mkdir(folder), 'la création du dossier').catch(() => {});

        const data = await readFile(getDbPath());
        const fileName = backupFileName();
        await withTimeout(client.writeFile(remotePath(config.folder, fileName), data), "l'envoi du fichier");

        if (retention > 0) {
            const entries = await withTimeout(
                client.readdir(folder, { stats: true }),
                'la liste des sauvegardes existantes'
            ) as Array<{ name: string; mtime: Date; isDirectory(): boolean }>;
            const backups = entries
                .filter(e => !e.isDirectory() && /^rentmaestro_.*\.db$/.test(e.name))
                .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
            for (const old of backups.slice(retention)) {
                await withTimeout(client.unlink(remotePath(config.folder, old.name)), 'la purge').catch(() => {});
            }
        }

        return { success: true, fileName };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    } finally {
        client.disconnect();
    }
}

async function getSetting(key: string): Promise<string | null> {
    const row = await prisma.setting.findUnique({ where: { key } });
    return row?.value ?? null;
}

interface LoadedBackupConfig {
    config: SmbConfig;
    retention: number;
    enabled: boolean;
    frequency: BackupFrequency;
}

async function loadConfig(): Promise<LoadedBackupConfig | null> {
    const [enabled, host, share, folder, username, password, domain, frequencyRaw, retentionRaw] = await Promise.all([
        getSetting('backup_enabled'),
        getSetting('backup_smb_host'),
        getSetting('backup_smb_share'),
        getSetting('backup_smb_folder'),
        getSetting('backup_smb_username'),
        getSetting('backup_smb_password'),
        getSetting('backup_smb_domain'),
        getSetting('backup_frequency'),
        getSetting('backup_retention'),
    ]);
    if (!host || !share) return null;

    const retention = retentionRaw ? parseInt(retentionRaw, 10) : 30;
    return {
        config: { host, share, folder: folder ?? '', username: username ?? '', password: password ?? '', domain: domain ?? '' },
        retention: isNaN(retention) ? 30 : retention,
        enabled: enabled === 'true',
        frequency: (frequencyRaw as BackupFrequency) || 'daily',
    };
}

/** Envoie la sauvegarde et met à jour l'état (date, statut, erreur, alerte Telegram). */
async function performBackup(config: SmbConfig, retention: number): Promise<{ success: boolean; error?: string }> {
    const result = await uploadBackup(config, retention);

    if (result.success) {
        await prisma.setting.upsert({
            where: { key: 'backup_last_run' },
            update: { value: new Date().toISOString() },
            create: { key: 'backup_last_run', value: new Date().toISOString() },
        });
        await prisma.setting.upsert({
            where: { key: 'backup_last_status' },
            update: { value: 'ok' },
            create: { key: 'backup_last_status', value: 'ok' },
        });
        await prisma.setting.deleteMany({ where: { key: 'backup_last_error' } });
    } else {
        await prisma.setting.upsert({
            where: { key: 'backup_last_status' },
            update: { value: 'error' },
            create: { key: 'backup_last_status', value: 'error' },
        });
        await prisma.setting.upsert({
            where: { key: 'backup_last_error' },
            update: { value: result.error ?? 'Erreur inconnue' },
            create: { key: 'backup_last_error', value: result.error ?? 'Erreur inconnue' },
        });
        await notifyN8n('BACKUP_FAILED', { error: result.error ?? 'Erreur inconnue', host: config.host, share: config.share }).catch(() => {});
    }

    return { success: result.success, error: result.error };
}

/**
 * Appelée depuis le cron quotidien existant : n'agit que si la sauvegarde
 * automatique est activée et que la fréquence choisie est échue.
 */
export async function runScheduledBackupIfDue(): Promise<{ ran: boolean; success?: boolean; error?: string }> {
    const loaded = await loadConfig();
    if (!loaded || !loaded.enabled) return { ran: false };

    const lastRunRaw = await getSetting('backup_last_run');
    const lastRun = lastRunRaw ? new Date(lastRunRaw) : null;
    const thresholdDays = FREQUENCY_DAYS[loaded.frequency] ?? 1;
    const dueSince = lastRun ? (Date.now() - lastRun.getTime()) / (24 * 3600 * 1000) : Infinity;
    if (dueSince < thresholdDays) return { ran: false };

    const result = await performBackup(loaded.config, loaded.retention);
    return { ran: true, ...result };
}

/** Déclenchement manuel depuis Paramètres, hors planification. */
export async function runBackupNow(): Promise<{ success: boolean; error?: string }> {
    const loaded = await loadConfig();
    if (!loaded) return { success: false, error: 'Serveur ou partage manquant.' };
    return performBackup(loaded.config, loaded.retention);
}
