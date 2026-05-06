import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { readSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

function getDbPath(): string {
    const url = process.env.DATABASE_URL || 'file:./prisma/dev.db';
    // Strip "file:" prefix — handles both "file:./relative" and "file:/absolute"
    return url.replace(/^file:/, '');
}

// GET = Download backup
export async function GET(req: NextRequest) {
    const session = await readSession(req);
    if (!session.userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    try {
        const data = await readFile(getDbPath());
        const date = new Date().toISOString().slice(0, 10);
        return new NextResponse(data, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename=rentmaestro_backup_${date}.db`,
            },
        });
    } catch (error) {
        console.error('Erreur backup:', error);
        return NextResponse.json({ error: 'Erreur lors du backup' }, { status: 500 });
    }
}

// POST = Restore backup
export async function POST(req: NextRequest) {
    const session = await readSession(req);
    if (!session.userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Validate SQLite magic header
        const header = buffer.toString('utf8', 0, 16);
        if (!header.startsWith('SQLite format')) {
            return NextResponse.json({ error: "Le fichier n'est pas une base SQLite valide" }, { status: 400 });
        }

        await writeFile(getDbPath(), buffer);
        return NextResponse.json({ success: true, message: 'Base de données restaurée avec succès. Redémarrez le serveur pour appliquer.' });
    } catch (error) {
        console.error('Erreur restauration:', error);
        return NextResponse.json({ error: 'Erreur lors de la restauration' }, { status: 500 });
    }
}
