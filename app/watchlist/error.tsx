'use client';

import { useEffect } from 'react';

export default function WatchlistError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Auto-reload on ChunkLoadError
        if (
            error.message?.includes('ChunkLoadError') ||
            error.message?.includes('Loading chunk') ||
            error.message?.includes('Failed to fetch')
        ) {
            const key = 'chunk_reload_watchlist';
            if (!sessionStorage.getItem(key)) {
                sessionStorage.setItem(key, '1');
                window.location.reload();
            }
        }
    }, [error]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            gap: '1rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '2rem',
        }}>
            <span style={{ fontSize: '2rem' }}>⚠️</span>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 600 }}>
                Gagal memuat halaman
            </h2>
            <p style={{ fontSize: '0.85rem' }}>
                {error.message?.includes('chunk') || error.message?.includes('Chunk')
                    ? 'Memuat ulang (update baru tersedia)...'
                    : error.message || 'Terjadi kesalahan tidak terduga'}
            </p>
            <button
                onClick={reset}
                style={{
                    padding: '0.6rem 1.5rem',
                    background: 'var(--accent-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                }}
            >
                Coba Lagi
            </button>
        </div>
    );
}
