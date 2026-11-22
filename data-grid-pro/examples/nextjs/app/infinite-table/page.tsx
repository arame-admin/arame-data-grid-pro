'use client';

import React, { useState, useCallback } from 'react';
import { InfiniteTableWrapper } from '../../components/InfiniteTableWrapper';
import { InfiniteTableColumn, InfiniteDataLoader } from '../../../src/infinite-table/types';

interface OrderItem {
  id: string;
  customer: string;
  product: string;
  amount: number;
  status: 'Delivered' | 'Processing' | 'Shipped' | 'Cancelled';
  date: string;
}

const mockOrders: OrderItem[] = Array.from({ length: 250 }, (_, i) => ({
  id: `ORD-${1000 + i}`,
  customer: `Customer ${i + 1}`,
  product: ['MacBook Pro 16"', '4K Ultra-wide Display', 'Mechanical Keyboard', 'Wireless Mouse', 'Noise Cancelling Headphones'][i % 5],
  amount: Math.round(150 + (i * 73) % 1800),
  status: (['Delivered', 'Processing', 'Shipped', 'Cancelled'] as const)[i % 4],
  date: new Date(2024, i % 12, (i % 28) + 1).toISOString().split('T')[0]
}));

export default function InfiniteTablePage() {
  const [virtualized, setVirtualized] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev.slice(0, 4)]);
  };

  const columns: InfiniteTableColumn<OrderItem>[] = [
    { key: 'id', header: 'Order ID', width: '120px' },
    { key: 'customer', header: 'Customer' },
    { key: 'product', header: 'Product' },
    {
      key: 'amount',
      header: 'Amount',
      render: (val: number) => `$${val.toLocaleString()}`
    },
    {
      key: 'status',
      header: 'Status',
      render: (val: string) => {
        const bg = val === 'Delivered' ? '#dcfce7' : val === 'Processing' ? '#fef9c3' : val === 'Shipped' ? '#dbeafe' : '#fee2e2';
        const fg = val === 'Delivered' ? '#166534' : val === 'Processing' ? '#854d0e' : val === 'Shipped' ? '#1e40af' : '#991b1b';
        return `<span style="background:${bg};color:${fg};padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:600;">${val}</span>`;
      }
    },
    { key: 'date', header: 'Date' }
  ];

  const dataLoader: InfiniteDataLoader<OrderItem> = useCallback(async ({ pagination, searchTerm, sortRule, signal }) => {
    // Artificial latency
    await new Promise(r => setTimeout(r, 250));
    if (signal.aborted) throw new Error('Aborted');

    let rows = [...mockOrders];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter(r =>
        r.customer.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    }

    if (sortRule) {
      rows.sort((a, b) => {
        const valA = (a as any)[sortRule.column];
        const valB = (b as any)[sortRule.column];
        if (valA === valB) return 0;
        return (valA > valB ? 1 : -1) * (sortRule.direction === 'asc' ? 1 : -1);
      });
    }

    const offset = pagination.mode === 'offset' ? pagination.offset : 0;
    const limit = pagination.limit || 25;
    const batch = rows.slice(offset, offset + limit);

    return {
      rows: batch,
      hasMore: offset + batch.length < rows.length,
      totalRows: rows.length
    };
  }, []);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Next.js App Router — Infinite Scrolling Data Table
      </h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Demonstrating the Web Component integrated inside a Next.js Client Component with typed DataLoader, cancelable queries, and row virtualization.
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={virtualized}
            onChange={e => setVirtualized(e.target.checked)}
          />
          <span>Enable Row Virtualization</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={manualMode}
            onChange={e => setManualMode(e.target.checked)}
          />
          <span>Manual &quot;Load more&quot; Mode</span>
        </label>
      </div>

      {/* Table */}
      <InfiniteTableWrapper
        columns={columns}
        dataLoader={dataLoader}
        config={{
          batchSize: 20,
          prefetchThresholdPx: 120,
          manualLoadMode: manualMode,
          virtualization: {
            enabled: virtualized,
            rowHeight: 46,
            overscanCount: 5,
            viewportHeight: 460
          }
        }}
        onBatchLoaded={(e) => addLog(`Batch loaded: ${e.detail.loadedCount} rows (total: ${e.detail.totalLoaded})`)}
        onComplete={(e) => addLog(`All ${e.detail.totalLoaded} rows loaded!`)}
      />

      {/* Event Logs */}
      {logs.length > 0 && (
        <div style={{ marginTop: '1.5rem', background: '#0f172a', color: '#38bdf8', padding: '0.75rem 1rem', borderRadius: '0.375rem', fontSize: '0.8rem', fontFamily: 'monospace' }}>
          <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>Recent Events:</div>
          {logs.map((log, i) => (
            <div key={i}>&gt; {log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
