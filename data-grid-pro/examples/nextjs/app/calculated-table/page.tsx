'use client';

import React, { useState } from 'react';
import { CalculatedTableWrapper } from '../../components/CalculatedTableWrapper';
import { CalculatedTableColumn, CellChangeDetail } from '../../../src/calculated-table/types';

interface ProjectBudgetRow {
  id: string;
  milestone: string;
  category: string;
  plannedHours: number;
  hourlyRate: number;
  expenses: number;
  allocatedBudget?: number;
  laborCost?: number;
  projectedSpend?: number;
  variance?: number;
}

const initialBudget: ProjectBudgetRow[] = [
  { id: 'MS-101', milestone: 'Sprint 1: Architecture & Design', category: 'Engineering', plannedHours: 120, hourlyRate: 95, expenses: 1200 },
  { id: 'MS-102', milestone: 'Sprint 2: Core Data Engine', category: 'Engineering', plannedHours: 240, hourlyRate: 95, expenses: 800 },
  { id: 'MS-103', milestone: 'Sprint 3: UI/UX Component Library', category: 'Frontend', plannedHours: 180, hourlyRate: 85, expenses: 450 },
  { id: 'MS-104', milestone: 'Sprint 4: Integration & Security QA', category: 'Quality', plannedHours: 100, hourlyRate: 90, expenses: 2500 },
  { id: 'MS-105', milestone: 'Sprint 5: User Acceptance & Deployment', category: 'DevOps', plannedHours: 80, hourlyRate: 110, expenses: 1600 }
];

export default function CalculatedTablePage() {
  const [data, setData] = useState<ProjectBudgetRow[]>(initialBudget);
  const [stickyFirst, setStickyFirst] = useState(true);
  const [stickyLast, setStickyLast] = useState(true);
  const [isRtl, setIsRtl] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [changeEvents, setChangeEvents] = useState<string[]>([]);

  const columns: CalculatedTableColumn<ProjectBudgetRow>[] = [
    // Pinned First: Milestone ID
    { key: 'id', header: 'Milestone ID', width: '130px' },

    // Middle Scrollable Columns
    { key: 'milestone', header: 'Deliverable Title', width: '260px' },
    { key: 'category', header: 'Team', width: '130px' },
    { key: 'plannedHours', header: 'Planned Hours (Edit)', width: '150px', editable: true, editorType: 'number' },
    { key: 'hourlyRate', header: 'Hourly Rate (Edit)', width: '140px', editable: true, editorType: 'number' },
    { key: 'expenses', header: 'Direct Expenses (Edit)', width: '160px', editable: true, editorType: 'number' },

    // Calculated Columns
    {
      key: 'laborCost',
      header: 'Labor Cost',
      width: '140px',
      dependencies: ['plannedHours', 'hourlyRate'],
      calculate: (row) => row.plannedHours * row.hourlyRate,
      formatter: (val) => `$${Number(val).toLocaleString()}`
    },
    {
      key: 'projectedSpend',
      header: 'Projected Spend',
      width: '150px',
      dependencies: ['laborCost', 'expenses', 'plannedHours', 'hourlyRate'],
      calculate: (row) => (row.plannedHours * row.hourlyRate) + (row.expenses || 0),
      formatter: (val) => `<strong>$${Number(val).toLocaleString()}</strong>`
    },

    // Pinned Last: Total Variance
    {
      key: 'variance',
      header: 'Target vs Cap ($25k)',
      width: '160px',
      dependencies: ['projectedSpend', 'plannedHours', 'hourlyRate', 'expenses'],
      calculate: (row) => {
        const total = (row.plannedHours * row.hourlyRate) + (row.expenses || 0);
        return 25000 - total;
      },
      formatter: (val) => {
        const num = Number(val);
        const color = num >= 0 ? '#16a34a' : '#dc2626';
        return `<span style="color:${color};font-weight:700;">${num >= 0 ? '+' : ''}$${num.toLocaleString()}</span>`;
      }
    }
  ];

  const handleCellChange = (detail: CellChangeDetail<ProjectBudgetRow>) => {
    const text = `Cell '${detail.columnKey}' modified from ${detail.oldValue} to ${detail.newValue} (Row ID: ${detail.rowId}) -> Recalculated: [${detail.recalculatedFields.join(', ')}]`;
    setChangeEvents(prev => [text, ...prev.slice(0, 4)]);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Next.js App Router — Calculated Data Table
      </h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Interactive project budgeting table featuring dual sticky columns (Milestone ID pinned to start, Variance pinned to end), editable cells, and real-time reactive recalculation.
      </p>

      {/* Control Panel */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.25rem', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={stickyFirst}
            onChange={e => setStickyFirst(e.target.checked)}
          />
          <span>Sticky First Column</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={stickyLast}
            onChange={e => setStickyLast(e.target.checked)}
          />
          <span>Sticky Last Column</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={isRtl}
            onChange={e => setIsRtl(e.target.checked)}
          />
          <span>Right-to-Left (RTL)</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={e => setTheme(e.target.checked ? 'dark' : 'light')}
          />
          <span>Dark Theme</span>
        </label>
      </div>

      {/* Calculated Table Component */}
      <CalculatedTableWrapper
        columns={columns}
        data={data}
        dir={isRtl ? 'rtl' : 'ltr'}
        theme={theme}
        options={{
          sticky: { stickyFirst, stickyLast },
          pagination: { enabled: true, pageSize: 5 },
          sorting: { enabled: true },
          search: { enabled: true, placeholder: 'Search milestone deliverables...' }
        }}
        onCellChange={handleCellChange}
      />

      {/* Audit Log */}
      {changeEvents.length > 0 && (
        <div style={{ marginTop: '1.5rem', background: '#0f172a', color: '#38bdf8', padding: '0.875rem 1.25rem', borderRadius: '0.375rem', fontSize: '0.8rem', fontFamily: 'monospace' }}>
          <div style={{ color: '#94a3b8', marginBottom: '0.35rem' }}>Audit Event Log:</div>
          {changeEvents.map((evt, idx) => (
            <div key={idx}>&gt; {evt}</div>
          ))}
        </div>
      )}
    </div>
  );
}
