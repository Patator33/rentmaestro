import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { readSession } from "@/lib/session";

const MIME_TYPES: Record<string, string> = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".odt": "application/vnd.oasis.opendocument.text",
    ".txt": "text/plain",
};

/**
 * Sert les fichiers de public/uploads derrière l'authentification propriétaire,
 * au lieu de compter sur le serveur de fichiers statiques (nginx/reverse-proxy
 * devant l'appli, qui peut ne pas être configuré pour /uploads/*).
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    const session = await readSession(request);
    if (!session.userId || session.pendingTotp) {
        return new NextResponse("Non autorisé", { status: 401 });
    }

    const { filename } = await params;
    if (!filename || filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
        return new NextResponse("Fichier invalide", { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filepath = path.join(uploadDir, filename);
    if (!path.resolve(filepath).startsWith(path.resolve(uploadDir) + path.sep)) {
        return new NextResponse("Fichier invalide", { status: 400 });
    }

    try {
        const data = await readFile(filepath);
        const ext = path.extname(filename).toLowerCase();
        return new NextResponse(new Uint8Array(data), {
            headers: {
                "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
                "Cache-Control": "private, max-age=3600",
            },
        });
    } catch {
        return new NextResponse("Document introuvable", { status: 404 });
    }
}
