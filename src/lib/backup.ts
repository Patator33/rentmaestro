import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { prisma } from '@/lib/prisma';
import { notifyN8n } from '@/lib/n8n';

const execFileAsync = promisify(execFile);

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

/**
 * Nettoie le sous-dossier saisi : sépare avec des '/', et liste blanche
 * stricte (plutôt qu'une liste noire, qui peut toujours laisser passer un
 * caractère de contrôle imprévu) — cette valeur finit dans la chaîne `-c` de
 * smbclient pour le `mkdir` initial, jamais interprétée par un shell mais par
 * la mini-syntaxe de commandes de smbclient, où un `;` ou un saut de ligne
 * injecterait une commande supplémentaire.
 */
function normalizeFolder(folder: string): string {
    const cleaned = folder.trim()
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '');
    return cleaned.replace(/[^A-Za-z0-9 _./-]/g, '');
}

function backupFileName(date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `rentmaestro_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}.db`;
}

const NT_STATUS_HINTS: Record<string, string> = {
    NT_STATUS_LOGON_FAILURE: 'Identifiants refusés (utilisateur ou mot de passe incorrect)',
    NT_STATUS_ACCESS_DENIED: "Accès refusé — l'utilisateur n'a pas les droits sur ce dossier",
    NT_STATUS_BAD_NETWORK_NAME: 'Partage introuvable sur le serveur (nom de partage incorrect ?)',
    NT_STATUS_OBJECT_PATH_NOT_FOUND: 'Sous-dossier introuvable',
    NT_STATUS_CONNECTION_REFUSED: 'Connexion refusée par le serveur',
    NT_STATUS_HOST_UNREACHABLE: 'Serveur injoignable',
    NT_STATUS_IO_TIMEOUT: 'Délai réseau dépassé',
};

/** Cherche une erreur dans la sortie de smbclient, même quand il rend un code 0. */
function checkSmbOutput(output: string): string | null {
    const match = output.match(/NT_STATUS_[A-Z_]+/);
    if (match) {
        const code = match[0];
        return NT_STATUS_HINTS[code] ? `${NT_STATUS_HINTS[code]} (${code})` : code;
    }
    if (/session setup failed/i.test(output)) return 'Authentification refusée.';
    if (/Connection to .* failed/i.test(output)) return 'Connexion au serveur impossible.';
    return null;
}

const SMB_TIMEOUT_MS = 20000;

/**
 * Exécute smbclient en non-interactif. Le mot de passe passe par la variable
 * d'environnement PASSWD plutôt que par un argument, pour ne pas apparaître
 * dans la liste des processus. `execFile` (et non `exec`) : les arguments
 * sont passés en tableau, jamais interprétés par un shell. Le sous-dossier,
 * quand il y en a un, passe par `-D` (son propre argument) plutôt que par un
 * `cd` inséré dans `commands` : il n'est alors jamais interprété par la
 * mini-syntaxe de commandes de smbclient, donc aucune valeur qu'il contient
 * ne peut y injecter une commande supplémentaire.
 */
async function runSmbClient(config: SmbConfig, commands: string, folder?: string): Promise<{ stdout: string; stderr: string }> {
    const args = ['-U', config.username, `//${config.host}/${config.share}`];
    if (folder) args.push('-D', folder);
    if (config.domain) args.push('-W', config.domain);
    args.push('-c', commands);

    try {
        const { stdout, stderr } = await execFileAsync('smbclient', args, {
            timeout: SMB_TIMEOUT_MS,
            env: { ...process.env, PASSWD: config.password },
        });
        return { stdout, stderr };
    } catch (error) {
        const e = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string; killed?: boolean; signal?: string | null };
        if (e.killed || e.signal) {
            throw new Error(`Délai dépassé (${SMB_TIMEOUT_MS / 1000}s) — serveur injoignable ou pare-feu.`);
        }
        const output = `${e.stdout ?? ''}${e.stderr ?? ''}`;
        throw new Error(checkSmbOutput(output) || e.message || 'Erreur smbclient inconnue');
    }
}

/** Vérifie que le partage est joignable avec ces identifiants, sans rien écrire. */
export async function testSmbConnection(config: SmbConfig): Promise<{ success: boolean; error?: string }> {
    try {
        const folder = normalizeFolder(config.folder);
        const { stdout, stderr } = await runSmbClient(config, 'ls', folder || undefined);
        const err = checkSmbOutput(stdout + stderr);
        if (err) return { success: false, error: err };
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Erreur de connexion' };
    }
}

/** Envoie la base actuelle sur le partage et purge les sauvegardes au-delà de `retention`. */
async function uploadBackup(config: SmbConfig, retention: number): Promise<{ success: boolean; error?: string; fileName?: string }> {
    try {
        const folder = normalizeFolder(config.folder);
        const dir = folder || undefined;

        // Le dossier existe peut-être déjà : échec ignoré, seul l'envoi compte.
        // Doit se faire à la racine (le dossier n'existe pas encore, -D ne
        // peut pas encore y pointer) ; `folder` est déjà passé par la liste
        // blanche de normalizeFolder, sûr à insérer dans la commande.
        if (folder) await runSmbClient(config, `mkdir "${folder}"`).catch(() => {});

        const fileName = backupFileName();
        const { stdout, stderr } = await runSmbClient(config, `put "${getDbPath()}" "${fileName}"`, dir);
        const err = checkSmbOutput(stdout + stderr);
        if (err) return { success: false, error: err };

        if (retention > 0) {
            const listing = await runSmbClient(config, 'ls rentmaestro_*.db', dir).catch(() => ({ stdout: '', stderr: '' }));
            const names = Array.from(
                listing.stdout.matchAll(/\s(rentmaestro_\d{4}-\d{2}-\d{2}_\d{4}\.db)\s/g),
                m => m[1]
            );
            // Format de nom triable lexicographiquement = triable chronologiquement :
            // pas besoin de parser les dates de la sortie texte de `ls`.
            const uniqueSorted = Array.from(new Set(names)).sort().reverse();
            const toDelete = uniqueSorted.slice(retention);
            if (toDelete.length > 0) {
                const delCmd = toDelete.map(n => `del "${n}"`).join('; ');
                await runSmbClient(config, delCmd, dir).catch(() => {});
            }
        }

        return { success: true, fileName };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
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
