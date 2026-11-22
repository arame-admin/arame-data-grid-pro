'use client';

import React, { useState } from 'react';
import { HeaderFilterTableWrapper } from '../../components/HeaderFilterTableWrapper';
import { HeaderFilterTableColumn, HeaderFilterChangeEventDetail } from '../../../src/header-filter-table/types';

interface ServerLog {
  id: string;
  service: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  endpoint: string;
  latencyMs: number;
  timestamp: string;
}

const mockLogs: ServerLog[] = [
  { id: 'LOG-5001', service: 'auth-service', severity: 'INFO', endpoint: '/oauth/token', latencyMs: 42, timestamp: '2024-05-10' },
  { id: 'LOG-5002', service: 'billing-api', severity: 'ERROR', endpoint: '/v1/charges', latencyMs: 312, timestamp: '2024-05-10' },
  { id: 'LOG-5003', service: 'gateway-proxy', severity: 'INFO', endpoint: '/healthz', latencyMs: 3, timestamp: '2024-05-11' },
  { id: 'LOG-5004', service: 'user-service', severity: 'WARN', endpoint: '/users/profiles', latencyMs: 145, timestamp: '2024-05-11' },
  { id: 'LOG-5005', service: 'billing-api', severity: 'CRITICAL', endpoint: '/webhooks/stripe', latencyMs: 540, timestamp: '2024-05-12' },
  { id: 'LOG-5006', service: 'auth-service', severity: 'INFO', endpoint: '/verify-mfa', latencyMs: 65, timestamp: '2024-05-12' },
  { id: 'LOG-5007', service: 'search-index', severity: 'WARN', endpoint: '/search/query', latencyMs: 280, timestamp: '2024-05-13' },
  { id: 'LOG-5008', service: 'gateway-proxy', severity: 'ERROR', endpoint: '/v2/catalog', latencyMs: 410, timestamp: '2024-05-13' }
];

export default function HeaderFilterPage() {
  const [data] = useState<ServerLog[]>(mockLogs);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [eventLogs, setEventLogs] = useState<string[]>([]);

  const columns: HeaderFilterTableColumn<ServerLog>[] = [
    { key: 'id', header: 'Log ID', width: '120px' },
    {
      key: 'service',
      header: 'Microservice',
      width: '180px',
      filter: {
        type: 'select',
        options: [
          { label: 'auth-service', value: 'auth-service' },
          { label: 'billing-api', value: 'billing-api' },
          { label: 'gateway-proxy', value: 'gateway-proxy' },
          { label: 'user-service', value: 'user-service' },
          { label: 'search-index', value: 'search-index' }
        ]
      }
    },
    {
      key: 'severity',
      header: 'Severity',
      width: '150px',
      filter: {
        type: 'select',
        options: [
          { label: 'INFO', value: 'INFO' },
          { label: 'WARN', value: 'WARN' },
          { label: 'ERROR', value: 'ERROR' },
          { label: 'CRITICAL', value: 'CRITICAL' }
        ]
      },
      render: (val: string) => {
        const bg = val === 'INFO' ? '#e0f2fe' : val === 'WARN' ? '#fef3c7' : val === 'ERROR' ? '#fee2e2' : '#fce7f3';
        const color = val === 'INFO' ? '#0369a1' : val === 'WARN' ? '#b45309' : val === 'ERROR' ? '#b91c1c' : '#be185d';
        return `<span style="background:${bg};color:${color};padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:600;">${val}</span>`;
      }
    },
    {
      key: 'endpoint',
      header: 'HTTP Endpoint',
      width: '220px',
      filter: { type: 'text', placeholder: 'Filter endpoint...' }
    },
    {
      key: 'latencyMs',
      header: 'Latency (ms Range)',
      width: '180px',
      filter: { type: 'number-range' },
      render: (val: number) => `${val} ms`
    },
    {
      key: 'timestamp',
      header: 'Date (Range)',
      width: '200px',
      filter: { type: 'date-range' }
    }
  ];

  const handleFilterChange = (detail: HeaderFilterChangeEventDetail) => {
    const text = `Filter updated: Column [${detail.columnKey}] -> Value: ${JSON.stringify(detail.filterValue)}`;
    setEventLogs(prev => [text, ...prev.slice(0, 4)]);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Next.js App Router — In-Header Filter Data Table
      </h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Each column header integrates dedicated filter controls (text with debouncing, select dropdowns, number ranges, and date ranges) alongside sorting and column resizing.
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={e => setTheme(e.target.checked ? 'dark' : 'light')}
          />
          <span>Dark Mode Theme</span>
        </label>
      </div>

      {/* Table */}
      <HeaderFilterTableWrapper
        columns={columns}
        data={data}
        theme={theme}
        options={{
          pagination: { enabled: true, pageSize: 6 },
          sorting: { enabled: true },
          search: { enabled: true, placeholder: 'Global search across all fields...' }
        }}
        onFilterChange={handleFilterChange}
      />

      {/* Event Logs */}
      {eventLogs.length > 0 && (
        <div style={{ marginTop: '1.5rem', background: '#0f172a', color: '#38bdf8', padding: '0.875rem 1.25rem', borderRadius: '0.375rem', fontSize: '0.8rem', fontFamily: 'monospace' }}>
          <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>Header Filter Audit Events:</div>
          {eventLogs.map((log, idx) => (
            <div key={idx}>&gt; {log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
