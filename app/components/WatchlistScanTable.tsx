'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { WatchlistGroup } from '@/lib/types';
import { RefreshCw, Play, CheckCircle, XCircle, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';

interface ScanResult {
    emiten: string;
    sector?: string;
    harga?: number;
    bandar?: string;
    barang_bandar?: number;
    rata_rata_bandar?: number;
    target_realistis?: number;
    target_max?: number;
    ara?: number;
    arb?: number;
    status: 'success' | 'error' | 'no_data';
    error?: string;
}

type SortKey = 'emiten' | 'harga' | 'bandar' | 'rata_rata_bandar' | 'barang_bandar' | 'target_realistis' | 'target_max' | 'upside_r1' | 'sector';
type SortDir = 'asc' | 'desc';

export default function WatchlistScanTable() {
    const [groups, setGroups] = useState<WatchlistGroup[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [watchlistItems, setWatchlistItems] = useState<{ symbol: string }[]>([]);
    const [scanResults, setScanResults] = useState<ScanResult[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanTotal, setScanTotal] = useState(0);
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('emiten');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    // Default date range = last trading day
    const getYesterday = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        if (d.getDay() === 0) d.setDate(d.getDate() - 2);
        if (d.getDay() === 6) d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
    };
    const today = new Date().toISOString().split('T')[0];
    const [fromDate, setFromDate] = useState<string>(getYesterday());
    const [toDate, setToDate] = useState<string>(getYesterday());

    // Load watchlist groups
    useEffect(() => {
        const fetchGroups = async () => {
            setLoadingGroups(true);
            try {
                const res = await fetch('/api/watchlist/groups');
                const json = await res.json();
                if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                    setGroups(json.data);
                    const defaultG = json.data.find((g: WatchlistGroup) => g.is_default) || json.data[0];
                    setSelectedGroupId(defaultG?.watchlist_id || null);
                }
            } catch {
                setError('Gagal memuat watchlist groups');
            } finally {
                setLoadingGroups(false);
            }
        };
        fetchGroups();
    }, []);

    // Load watchlist items when group changes
    useEffect(() => {
        if (!selectedGroupId) return;
        setScanResults([]);
        setLastScanned(null);
        const fetchItems = async () => {
            try {
                const res = await fetch(`/api/watchlist?groupId=${selectedGroupId}`);
                const json = await res.json();
                if (json.success) {
                    const payload = json.data;
                    const data: any[] = payload?.data?.result || payload?.data || [];
                    setWatchlistItems(
                        data.map((item: any) => ({ symbol: (item.symbol || item.company_code || '').toUpperCase() }))
                    );
                }
            } catch {
                setError('Gagal memuat items watchlist');
            }
        };
        fetchItems();
    }, [selectedGroupId]);



    // Run scan
    const handleScan = useCallback(async () => {
        if (!watchlistItems.length || scanning) return;
        setScanning(true);
        setError(null);
        setScanResults([]);
        setScanProgress(0);

        const symbols = watchlistItems.map(i => i.symbol);
        setScanTotal(symbols.length);

        // Scan in mini-batches of 5 to show live progress
        const BATCH = 5;
        const allResults: ScanResult[] = [];

        for (let i = 0; i < symbols.length; i += BATCH) {
            const batch = symbols.slice(i, i + BATCH);
            try {
                const res = await fetch('/api/watchlist-scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbols: batch, fromDate, toDate }),
                });
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    allResults.push(...json.data);
                }
            } catch {
                // Push error items for this batch
                batch.forEach(sym => allResults.push({ emiten: sym, status: 'error', error: 'Request failed' }));
            }
            setScanProgress(Math.min(i + BATCH, symbols.length));
            setScanResults([...allResults]);
        }

        setScanning(false);
        setLastScanned(`${fromDate === toDate ? fromDate : `${fromDate} → ${toDate}`} · ${new Date().toLocaleTimeString('id-ID')}`);
    }, [watchlistItems, fromDate, toDate, scanning]);

    // Sort
    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const sortedResults = useMemo(() => {
        const arr = [...scanResults];
        arr.sort((a, b) => {
            let av: any, bv: any;
            if (sortKey === 'upside_r1') {
                av = a.harga && a.target_realistis ? ((a.target_realistis - a.harga) / a.harga) * 100 : -9999;
                bv = b.harga && b.target_realistis ? ((b.target_realistis - b.harga) / b.harga) * 100 : -9999;
            } else {
                av = (a as any)[sortKey] ?? '';
                bv = (b as any)[sortKey] ?? '';
            }
            if (typeof av === 'number' && typeof bv === 'number') {
                return sortDir === 'asc' ? av - bv : bv - av;
            }
            return sortDir === 'asc'
                ? String(av).localeCompare(String(bv))
                : String(bv).localeCompare(String(av));
        });
        return arr;
    }, [scanResults, sortKey, sortDir]);

    const successCount = scanResults.filter(r => r.status === 'success').length;
    const noDataCount = scanResults.filter(r => r.status === 'no_data').length;
    const errorCount = scanResults.filter(r => r.status === 'error').length;

    const formatNum = (n?: number) => (n != null ? n.toLocaleString('id-ID') : '-');
    const formatPct = (harga?: number, target?: number) => {
        if (!harga || !target || harga === 0) return '-';
        const pct = ((target - harga) / harga) * 100;
        return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    };
    const pctColor = (harga?: number, target?: number) => {
        if (!harga || !target) return 'var(--text-muted)';
        return target >= harga ? 'var(--accent-success)' : 'var(--accent-warning)';
    };

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <span style={{ opacity: 0.3, fontSize: '0.6rem' }}>⇅</span>;
        return sortDir === 'asc'
            ? <ChevronUp size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
            : <ChevronDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />;
    };

    const thStyle: React.CSSProperties = {
        padding: '0.75rem 1rem',
        textAlign: 'left',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        userSelect: 'none',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
    };

    const thRight: React.CSSProperties = { ...thStyle, textAlign: 'right' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header Controls */}
            <div className="glass-card-static" style={{ padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    {/* Title */}
                    <div style={{ flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            📋 Watchlist Scan
                        </h2>
                        <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Scan Adimology untuk semua saham di watchlist
                        </p>
                    </div>

                    {/* Group Selector */}
                    {!loadingGroups && groups.length > 0 && (
                        <select
                            value={selectedGroupId || ''}
                            onChange={e => setSelectedGroupId(Number(e.target.value))}
                            style={{
                                padding: '0.5rem 0.75rem',
                                fontSize: '0.85rem',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '10px',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                outline: 'none',
                                minWidth: '160px',
                            }}
                        >
                            {groups.map(g => (
                                <option key={g.watchlist_id} value={g.watchlist_id} style={{ background: 'var(--bg-secondary)' }}>
                                    {g.emoji ? `${g.emoji} ` : ''}{g.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Date Range Picker */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Tanggal:</label>
                        <input
                            type="date"
                            value={fromDate}
                            max={today}
                            onChange={e => { setFromDate(e.target.value); setScanResults([]); setLastScanned(null); }}
                            style={{
                                padding: '0.45rem 0.6rem',
                                fontSize: '0.82rem',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '10px',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                cursor: 'pointer',
                            }}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>→</span>
                        <input
                            type="date"
                            value={toDate}
                            min={fromDate}
                            max={today}
                            onChange={e => { setToDate(e.target.value); setScanResults([]); setLastScanned(null); }}
                            style={{
                                padding: '0.45rem 0.6rem',
                                fontSize: '0.82rem',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '10px',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                cursor: 'pointer',
                            }}
                        />
                        {(fromDate === today || toDate === today) && (
                            <span style={{
                                fontSize: '0.68rem',
                                color: '#f59e0b',
                                background: 'rgba(245,158,11,0.12)',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                            }}>⚠️ Market buka s/d 16:15</span>
                        )}
                    </div>

                    {/* Scan Button */}
                    <button
                        onClick={handleScan}
                        disabled={scanning || watchlistItems.length === 0}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.55rem 1.25rem',
                            background: scanning ? 'var(--bg-secondary)' : 'linear-gradient(135deg, var(--accent-primary), #7c3aed)',
                            border: 'none',
                            borderRadius: '10px',
                            color: scanning ? 'var(--text-muted)' : '#fff',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: scanning || watchlistItems.length === 0 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {scanning
                            ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Scanning...</>
                            : <><Play size={15} /> Scan Sekarang</>}
                    </button>
                </div>

                {/* Progress Bar */}
                {scanning && scanTotal > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            marginBottom: '0.3rem'
                        }}>
                            <span>Memproses {Math.min(scanProgress, scanTotal)} / {scanTotal} saham...</span>
                            <span>{Math.round((scanProgress / scanTotal) * 100)}%</span>
                        </div>
                        <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                width: `${(scanProgress / scanTotal) * 100}%`,
                                background: 'linear-gradient(90deg, var(--accent-primary), #7c3aed)',
                                borderRadius: '2px',
                                transition: 'width 0.4s ease',
                            }} />
                        </div>
                    </div>
                )}

                {/* Stats Bar (after scan) */}
                {scanResults.length > 0 && !scanning && (
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Terakhir scan: <strong style={{ color: 'var(--text-secondary)' }}>{lastScanned}</strong>
                        </span>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#22c55e' }}>
                                <CheckCircle size={13} /> {successCount} berhasil
                            </span>
                            {noDataCount > 0 && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#f59e0b' }}>
                                    <AlertCircle size={13} /> {noDataCount} no data
                                </span>
                            )}
                            {errorCount > 0 && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#f87171' }}>
                                    <XCircle size={13} /> {errorCount} error
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {error && (
                    <div style={{ marginTop: '0.75rem', color: 'var(--accent-warning)', fontSize: '0.8rem' }}>
                        ⚠️ {error}
                    </div>
                )}
            </div>

            {/* Empty / Loading State */}
            {loadingGroups && (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p>Memuat watchlist...</p>
                </div>
            )}

            {!loadingGroups && watchlistItems.length === 0 && !scanning && (
                <div className="glass-card-static" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Watchlist kosong atau belum tersinkron.</p>
                    <p style={{ fontSize: '0.8rem' }}>Pilih group watchlist dan sinkronkan data dari Stockbit di sidebar halaman utama.</p>
                </div>
            )}

            {/* Results Table */}
            {sortedResults.length > 0 && (
                <div className="glass-card-static" style={{ overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                            <thead>
                                <tr>
                                    <th style={thStyle} onClick={() => handleSort('emiten')}>
                                        Emiten <SortIcon col="emiten" />
                                    </th>
                                    <th style={thStyle} onClick={() => handleSort('sector')}>
                                        Sektor <SortIcon col="sector" />
                                    </th>
                                    <th style={thRight} onClick={() => handleSort('harga')}>
                                        Harga <SortIcon col="harga" />
                                    </th>
                                    <th style={thStyle} onClick={() => handleSort('bandar')}>
                                        Bandar <SortIcon col="bandar" />
                                    </th>
                                    <th style={thRight} onClick={() => handleSort('rata_rata_bandar')}>
                                        Avg Bandar <SortIcon col="rata_rata_bandar" />
                                    </th>
                                    <th style={thRight} onClick={() => handleSort('barang_bandar')}>
                                        Vol Bandar <SortIcon col="barang_bandar" />
                                    </th>
                                    <th style={thRight} onClick={() => handleSort('target_realistis')}>
                                        Target R1 <SortIcon col="target_realistis" />
                                    </th>
                                    <th style={thRight} onClick={() => handleSort('target_max')}>
                                        Target Max <SortIcon col="target_max" />
                                    </th>
                                    <th style={thRight} onClick={() => handleSort('upside_r1')}>
                                        Upside R1 <SortIcon col="upside_r1" />
                                    </th>
                                    <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedResults.map((row, idx) => {
                                    const isSuccess = row.status === 'success';
                                    const isError = row.status === 'error';

                                    return (
                                        <tr
                                            key={row.emiten}
                                            style={{
                                                borderBottom: idx < sortedResults.length - 1 ? '1px solid var(--border-color)' : 'none',
                                                background: idx % 2 === 0 ? 'transparent' : 'var(--glass-inner-glow)',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(102,126,234,0.05)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'var(--glass-inner-glow)')}
                                        >
                                            {/* Emiten */}
                                            <td style={{ padding: '0.8rem 1rem', fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.88rem' }}>
                                                {row.emiten}
                                            </td>

                                            {/* Sector */}
                                            <td style={{ padding: '0.8rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {row.sector || '-'}
                                            </td>

                                            {/* Harga */}
                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                                {isSuccess || row.harga ? formatNum(row.harga) : '-'}
                                            </td>

                                            {/* Bandar */}
                                            <td style={{ padding: '0.8rem 1rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {isSuccess ? (row.bandar || '-') : (
                                                    isError
                                                        ? <span style={{ color: '#f87171', fontSize: '0.72rem' }}>{row.error?.slice(0, 30)}</span>
                                                        : <span style={{ color: '#f59e0b', fontSize: '0.72rem' }}>Data tidak tersedia</span>
                                                )}
                                            </td>

                                            {/* Avg Bandar */}
                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                                {formatNum(row.rata_rata_bandar)}
                                            </td>

                                            {/* Vol Bandar */}
                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                                {formatNum(row.barang_bandar)}
                                            </td>

                                            {/* Target R1 */}
                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                                                {row.target_realistis ? (
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '0.88rem', color: 'var(--accent-success)' }}>
                                                            {formatNum(row.target_realistis)}
                                                        </div>
                                                    </div>
                                                ) : '-'}
                                            </td>

                                            {/* Target Max */}
                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                                                {row.target_max ? (
                                                    <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '0.88rem', color: 'var(--accent-warning)' }}>
                                                        {formatNum(row.target_max)}
                                                    </div>
                                                ) : '-'}
                                            </td>

                                            {/* Upside R1 */}
                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.85rem', color: pctColor(row.harga, row.target_realistis) }}>
                                                {formatPct(row.harga, row.target_realistis)}
                                            </td>

                                            {/* Status Badge */}
                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>
                                                {row.status === 'success' && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontWeight: 600 }}>
                                                        <CheckCircle size={11} /> OK
                                                    </span>
                                                )}
                                                {row.status === 'no_data' && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontWeight: 600 }}>
                                                        <AlertCircle size={11} /> No Data
                                                    </span>
                                                )}
                                                {row.status === 'error' && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(248,113,113,0.12)', color: '#f87171', fontWeight: 600 }}>
                                                        <XCircle size={11} /> Error
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
