'use client';

import React, { useState } from 'react';
import { AdvancedFilterTableWrapper } from '../../components/AdvancedFilterTableWrapper';
import { AdvancedFilterColumn, ExpressionChangeEventDetail } from '../../../src/advanced-filter-table/types';

interface RealEstateAsset {
  id: string;
  name: string;
  propertyType: 'Residential' | 'Commercial' | 'Industrial' | 'Mixed-Use';
  state: 'CA' | 'NY' | 'TX' | 'WA';
  city: string;
  valuation: number;
  occupancyRate: number;
  acquiredDate: string;
}

const mockProperties: RealEstateAsset[] = [
  { id: 'RE-101', name: 'Silicon Valley Tech Park', propertyType: 'Commercial', state: 'CA', city: 'San Jose', valuation: 45000000, occupancyRate: 94, acquiredDate: '2021-06-15' },
  { id: 'RE-102', name: 'Manhattan High-Rise Residence', propertyType: 'Residential', state: 'NY', city: 'New York', valuation: 82000000, occupancyRate: 98, acquiredDate: '2019-11-20' },
  { id: 'RE-103', name: 'Austin Industrial Distribution Center', propertyType: 'Industrial', state: 'TX', city: 'Austin', valuation: 28000000, occupancyRate: 100, acquiredDate: '2022-03-10' },
  { id: 'RE-104', name: 'Seattle Mixed Waterfront', propertyType: 'Mixed-Use', state: 'WA', city: 'Seattle', valuation: 64000000, occupancyRate: 91, acquiredDate: '2020-08-01' },
  { id: 'RE-105', name: 'Dallas Logistics Center', propertyType: 'Industrial', state: 'TX', city: 'Dallas', valuation: 19500000, occupancyRate: 88, acquiredDate: '2023-01-25' }
];

export default function AdvancedFilterPage() {
  const [data] = useState<RealEstateAsset[]>(mockProperties);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [auditLog, setAuditLog] = useState<string[]>([]);

  const columns: AdvancedFilterColumn<RealEstateAsset>[] = [
    { key: 'id', header: 'Asset ID', width: '110px' },
    { key: 'name', header: 'Asset Name', width: '260px' },
    {
      key: 'propertyType',
      header: 'Type',
      width: '150px',
      type: 'select',
      options: [
        { label: 'Commercial', value: 'Commercial' },
        { label: 'Residential', value: 'Residential' },
        { label: 'Industrial', value: 'Industrial' },
        { label: 'Mixed-Use', value: 'Mixed-Use' }
      ]
    },
    {
      key: 'state',
      header: 'State',
      width: '100px',
      type: 'select',
      options: [
        { label: 'CA', value: 'CA' },
        { label: 'NY', value: 'NY' },
        { label: 'TX', value: 'TX' },
        { label: 'WA', value: 'WA' }
      ]
    },
    {
      key: 'valuation',
      header: 'Valuation',
      width: '160px',
      type: 'number',
      render: (val: number) => `$${(val / 1000000).toFixed(1)}M`
    },
    {
      key: 'occupancyRate',
      header: 'Occupancy',
      width: '120px',
      type: 'number',
      render: (val: number) => `${val}%`
    },
    { key: 'acquiredDate', header: 'Acquired Date', width: '140px', type: 'date' }
  ];

  const handleExpression = (detail: ExpressionChangeEventDetail) => {
    const text = `Expression Updated: Logic [${detail.expression.logic}] with ${detail.flatRules.length} rules.`;
    setAuditLog(prev => [text, ...prev.slice(0, 4)]);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Next.js App Router — Advanced Filtering Data Table
      </h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Complex expression builder supporting AND/OR groupings, quick-search pills, presets, removable filter chips, numeric range filtering, and relative dates.
      </p>

      {/* Control panel */}
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

      {/* Advanced Filter Table */}
      <AdvancedFilterTableWrapper
        columns={columns}
        data={data}
        theme={theme}
        options={{
          presets: [
            {
              id: 'preset-high-val',
              name: 'Institutional Grade ($50M+)',
              expression: {
                id: 'exp-1',
                logic: 'AND',
                rules: [{ id: 'r-val', field: 'valuation', operator: 'greaterThan', value: 50000000 }]
              }
            },
            {
              id: 'preset-tx-ind',
              name: 'Texas Industrial',
              expression: {
                id: 'exp-2',
                logic: 'AND',
                rules: [
                  { id: 'r-tx', field: 'state', operator: 'equals', value: 'TX' },
                  { id: 'r-ind', field: 'propertyType', operator: 'equals', value: 'Industrial' }
                ]
              }
            }
          ],
          quickFilters: [
            { id: 'q-industrial', label: 'Industrial Assets', expression: { id: 'qi', logic: 'AND', rules: [{ id: 'ri', field: 'propertyType', operator: 'equals', value: 'Industrial' }] } },
            { id: 'q-prime-occ', label: '≥ 95% Occupied', expression: { id: 'qo', logic: 'AND', rules: [{ id: 'ro', field: 'occupancyRate', operator: 'greaterThanOrEqual', value: 95 }] } }
          ],
          pagination: { enabled: true, pageSize: 6 },
          sorting: { enabled: true },
          search: { enabled: true, placeholder: 'Search portfolio assets...' }
        }}
        onExpressionChange={handleExpression}
      />

      {/* Audit Log */}
      {auditLog.length > 0 && (
        <div style={{ marginTop: '1.5rem', background: '#0f172a', color: '#38bdf8', padding: '0.875rem 1.25rem', borderRadius: '0.375rem', fontSize: '0.8rem', fontFamily: 'monospace' }}>
          <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>Filter Engine Audit Log:</div>
          {auditLog.map((log, idx) => (
            <div key={idx}>&gt; {log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
