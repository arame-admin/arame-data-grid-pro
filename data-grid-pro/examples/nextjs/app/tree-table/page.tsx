'use client';

import React, { useState } from 'react';
import { TreeTableWrapper } from '../../components/TreeTableWrapper';
import { TreeTableColumn, TreeExpansionDetail, TreeSelectionDetail } from '../../../src/tree-table/types';

interface FileTreeNode {
  id: string;
  name: string;
  kind: string;
  size: string;
  owner: string;
  updated: string;
  children?: FileTreeNode[];
}

const mockFileTree: FileTreeNode[] = [
  {
    id: 'f-root',
    name: 'Cloud Storage Bucket',
    kind: 'Root Volume',
    size: '14.2 GB',
    owner: 'Admin',
    updated: '2024-05-18',
    children: [
      {
        id: 'f-media',
        name: 'Media Assets',
        kind: 'Folder',
        size: '12.8 GB',
        owner: 'Marketing',
        updated: '2024-05-16',
        children: [
          { id: 'f-video', name: 'launch-keynote-4k.mp4', kind: 'Video (MP4)', size: '8.4 GB', owner: 'Creative', updated: '2024-05-14' },
          { id: 'f-brand', name: 'Brand-Guidelines-2024.pdf', kind: 'PDF Document', size: '240 MB', owner: 'Design', updated: '2024-05-12' },
          { id: 'f-icons', name: 'ui-icon-pack.svg', kind: 'SVG Vector', size: '15 MB', owner: 'Design', updated: '2024-05-10' }
        ]
      },
      {
        id: 'f-docs',
        name: 'Financial Reports',
        kind: 'Folder',
        size: '1.4 GB',
        owner: 'Finance',
        updated: '2024-05-18',
        children: [
          { id: 'f-q1', name: 'Q1-2024-Earnings-Report.xlsx', kind: 'Spreadsheet', size: '42 MB', owner: 'Accounting', updated: '2024-04-30' },
          { id: 'f-audit', name: 'SOC2-Type-II-Audit.pdf', kind: 'Security Report', size: '18 MB', owner: 'Security', updated: '2024-05-08' }
        ]
      }
    ]
  }
];

export default function TreeTablePage() {
  const [data] = useState<FileTreeNode[]>(mockFileTree);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [stickyParents, setStickyParents] = useState(true);
  const [auditLog, setAuditLog] = useState<string[]>([]);

  const columns: TreeTableColumn<FileTreeNode>[] = [
    { key: 'name', header: 'Name', width: '320px', isTreeColumn: true },
    { key: 'kind', header: 'File Type', width: '160px' },
    { key: 'size', header: 'Size', width: '120px' },
    { key: 'owner', header: 'Owner', width: '140px' },
    { key: 'updated', header: 'Modified Date', width: '140px' }
  ];

  const handleExpansion = (detail: TreeExpansionDetail<FileTreeNode>) => {
    const text = `Node '${detail.nodeId}' ${detail.isExpanded ? 'Expanded' : 'Collapsed'}`;
    setAuditLog(prev => [text, ...prev.slice(0, 4)]);
  };

  const handleSelection = (detail: TreeSelectionDetail<FileTreeNode>) => {
    const text = `Selection altered: Node '${detail.lastToggledId}' -> Total: ${detail.selectedIds.length} items`;
    setAuditLog(prev => [text, ...prev.slice(0, 4)]);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Next.js App Router — Tree Data Table Component
      </h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Hierarchical data table featuring sticky parent rows, drag & drop reordering, cascading selection, and CSV export.
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={stickyParents}
            onChange={e => setStickyParents(e.target.checked)}
          />
          <span>Sticky Parent Rows</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={e => setTheme(e.target.checked ? 'dark' : 'light')}
          />
          <span>Dark Mode Theme</span>
        </label>
      </div>

      {/* Tree Table */}
      <TreeTableWrapper
        columns={columns}
        data={data}
        theme={theme}
        options={{
          stickyParentRows: stickyParents,
          defaultExpandedAll: true,
          pagination: { enabled: true, pageSize: 8, mode: 'root-nodes' },
          sorting: { enabled: true },
          search: { enabled: true, placeholder: 'Search folder & file nodes...' }
        }}
        onExpansionChange={handleExpansion}
        onSelectionChange={handleSelection}
      />

      {/* Audit Log */}
      {auditLog.length > 0 && (
        <div style={{ marginTop: '1.5rem', background: '#0f172a', color: '#38bdf8', padding: '0.875rem 1.25rem', borderRadius: '0.375rem', fontSize: '0.8rem', fontFamily: 'monospace' }}>
          <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>Tree Event Log:</div>
          {auditLog.map((log, idx) => (
            <div key={idx}>&gt; {log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
