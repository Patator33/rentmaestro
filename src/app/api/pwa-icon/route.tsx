import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const size = Math.min(512, Math.max(16, parseInt(searchParams.get('size') || '192')));
    const radius = Math.round(size * 0.2);
    const fontSize = Math.round(size * 0.55);

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
                    borderRadius: `${radius}px`,
                }}
            >
                <span
                    style={{
                        fontSize: `${fontSize}px`,
                        color: 'white',
                        fontFamily: 'sans-serif',
                        fontWeight: 800,
                        lineHeight: 1,
                    }}
                >
                    R
                </span>
            </div>
        ),
        { width: size, height: size }
    );
}
