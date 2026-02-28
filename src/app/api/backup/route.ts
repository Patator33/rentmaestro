import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

// GET = Download backup
export async function GET() {
    try {
        const dbPath = join(process.cwd(), 'prisma', 'dev.db');
        const data = await readFile(dbPath);

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
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Validate it's a SQLite file
        const header = buffer.toString('utf8', 0, 16);
        if (!header.startsWith('SQLite format')) {
            return NextResponse.json({ error: 'Le fichier n\'est pas une base SQLite valide' }, { status: 400 });
        }

        const dbPath = join(process.cwd(), 'prisma', 'dev.db');
        await writeFile(dbPath, buffer);

        return NextResponse.json({ success: true, message: 'Base de données restaurée avec succès' });
    } catch (error) {
        console.error('Erreur restauration:', error);
        return NextResponse.json({ error: 'Erreur lors de la restauration' }, { status: 500 });
    }
}
