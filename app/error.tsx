'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        const msg = error?.message || '';
        const isChunkError =
            msg.includes('ChunkLoadError') ||
            msg.includes('Loading chunk') ||
            msg.includes('Failed to fetch') ||
            msg.includes('Importing a module script failed');

        if (isChunkError) {
            // Force hard reload to get fresh chunks from new deploy
            window.location.reload();
        }
    }, [error]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: '1rem',
            textAlign: 'center',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
        }}>
            <span style={{ fontSize: '2.5rem' }}>⚠️</span>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Terjadi Kesalahan</h2>
            <p style={{ fontSize: '0.9rem', color: '#888', maxWidth: 400 }}>
                {error?.message?.includes('chunk') || error?.message?.includes('Chunk')
                    ? 'Memuat ulang halaman dengan versi terbaru...'
                    : 'Terjadi kesalahan tidak terduga. Coba muat ulang halaman.'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        padding: '0.6rem 1.5rem',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                    }}
                >
                    Muat Ulang
                </button>
                <button
                    onClick={reset}
                    style={{
                        padding: '0.6rem 1.5rem',
                        background: 'transparent',
                        color: '#667eea',
                        border: '1px solid #667eea',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                    }}
                >
                    Coba Lagi
                </button>
            </div>
        </div>
    );
}
