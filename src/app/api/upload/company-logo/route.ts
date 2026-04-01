import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
        }

        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 });
        }

        const ext = file.name.split('.').pop() ?? 'png';
        const filename = `logo-${Date.now()}.${ext}`;
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'company-logos');
        const filePath = join(uploadDir, filename);

        await mkdir(uploadDir, { recursive: true });
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        return NextResponse.json({ url: `/uploads/company-logos/${filename}` });
    } catch (error) {
        console.error('Erreur upload logo:', error);
        return NextResponse.json({ error: 'Erreur lors du téléversement' }, { status: 500 });
    }
}
