import { writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Extensions autorisées pour les documents/pièces jointes.
const ALLOWED_EXTENSIONS = new Set([
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".odt",
    ".txt",
]);

const MAX_UPLOAD_SIZE = 20 * 1024 * 1024; // 20 Mo

export interface SavedFile {
    /** URL publique servie depuis /uploads/ */
    url: string;
    /** Nom original du fichier (pour affichage / champ `name` en base) */
    originalName: string;
}

/**
 * Écrit un fichier uploadé dans public/uploads de façon sûre.
 *
 * - Ne conserve jamais le chemin fourni par le client : le nom stocké est
 *   généré aléatoirement, seule l'extension (validée) est reprise. Cela évite
 *   toute traversée de répertoire (`../`) et toute collision.
 * - Rejette les extensions non listées (ex. .html, .svg, .js) qui pourraient
 *   être servies depuis la même origine et provoquer un XSS stocké.
 */
export async function saveUploadedFile(file: File): Promise<SavedFile> {
    if (!file || typeof file.arrayBuffer !== "function") {
        throw new Error("Fichier invalide");
    }
    if (file.size > MAX_UPLOAD_SIZE) {
        throw new Error("Fichier trop volumineux (max 20 Mo)");
    }

    const originalName = path.basename(file.name || "fichier");
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        throw new Error(`Type de fichier non autorisé (${ext || "inconnu"})`);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const safeName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    const filepath = path.join(uploadDir, safeName);

    // Ceinture et bretelles : garantir qu'on reste dans uploadDir.
    const resolved = path.resolve(filepath);
    if (!resolved.startsWith(path.resolve(uploadDir) + path.sep)) {
        throw new Error("Chemin de fichier invalide");
    }

    await writeFile(filepath, buffer);

    return { url: `/uploads/${safeName}`, originalName };
}
