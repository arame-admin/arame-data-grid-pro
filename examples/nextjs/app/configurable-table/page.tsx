'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import type { ProDataGrid, ColumnDef, GridOptions, GridQuery, GridResult } from '@pro-data-grid/core';
import '@pro-data-grid/core/styles.css';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  supplier: string;
  leadTime: string;
}

const INITIAL_PRODUCTS: Product[] = [
  { id: 'PRD-101', name: 'Quantum Core Processor X1', sku: 'QC-X1-88', category: 'Hardware', price: 549.99, stock: 42, status: 'In Stock', supplier: 'AcroCorp', leadTime: '3 days' },
  { id: 'PRD-102', name: 'Titanium Mechanical Switch', sku: 'TMS-44-A', category: 'Peripherals', price: 89.50, stock: 120, status: 'In Stock', supplier: 'KeyTech', leadTime: '5 days' },
  { id: 'PRD-103', name: 'Ultra-Wide 5K OLED Display', sku: 'UWD-5K-09', category: 'Displays', price: 1299.00, stock: 5, status: 'Low Stock', supplier: 'VisionWorks', leadTime: '14 days' },
  { id: 'PRD-104', name: 'Neural Tensor Accelerator', sku: 'NTA-02-B', category: 'Hardware', price: 849.00, stock: 0, status: 'Out of Stock', supplier: 'NeuroSys', leadTime: '21 days' },
  { id: 'PRD-105', name: 'Ergonomic Magnetic Mount', sku: 'EMM-11-Z', category: 'Accessories', price: 45.00, stock: 310, status: 'In Stock', supplier: 'KeyTech', leadTime: '2 days' },
  { id: 'PRD-106', name: 'Low-Latency Fiber Transceiver', sku: 'LLF-10G', category: 'Networking', price: 215.20, stock: 18, status: 'Low Stock', supplier: 'OptiCom', leadTime: '7 days' },
  { id: 'PRD-107', name: 'Shielded USB-C Bus Hub', sku: 'HUB-C8', category: 'Peripherals', price: 65.00, stock: 75, status: 'In Stock', supplier: 'KeyTech', leadTime: '4 days' },
  { id: 'PRD-108', name: 'PCIe Gen5 NVMe 4TB Solid State', sku: 'SSD-G5-4T', category: 'Storage', price: 380.00, stock: 27, status: 'In Stock', supplier: 'AcroCorp', leadTime: '5 days' },
  { id: 'PRD-109', name: 'Precision Calibrator Probe', sku: 'PCP-88-K', category: 'Accessories', price: 155.00, stock: 8, status: 'Low Stock', supplier: 'VisionWorks', leadTime: '10 days' },
  { id: 'PRD-110', name: 'Dual-Band Mesh Antenna Node', sku: 'MESH-24-W', category: 'Networking', price: 110.00, stock: 0, status: 'Out of Stock', supplier: 'OptiCom', leadTime: '12 days' }
];

interface SettingsState {
  pagination: boolean;
  pageSize: number;
  sorting: boolean;
  multiSort: boolean;
  globalSearch: boolean;
  density: 'compact' | 'comfortable' | 'spacious';
  animations: boolean;
  selectable: boolean;
  multiSelect: boolean;
  rowReordering: boolean;
  columnReordering: boolean;
  editable: boolean;
  deletable: boolean;
  expandable: boolean;
  serverSide: boolean;
  theme: 'light' | 'dark';
}

const DEFAULT_SETTINGS: SettingsState = {
  pagination: true,
  pageSize: 5,
  sorting: true,
  multiSort: false,
  globalSearch: true,
  density: 'comfortable',
  animations: true,
  selectable: true,
  multiSelect: true,
  rowReordering: false,
  columnReordering: true,
  editable: true,
  deletable: true,
  expandable: true,
  serverSide: false,
  theme: 'light'
};

export default function ConfigurableTablePage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastAction, setLastAction] = useState<string>('Ready');
  const [isGridLoaded, setIsGridLoaded] = useState(false);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const gridElRef = useRef<ProDataGrid<Product> | null>(null);

  // Initialize and mount ProDataGrid
  useEffect(() => {
    let mounted = true;
    import('@pro-data-grid/core').then(({ defineProDataGrid }) => {
      if (!mounted) return;
      defineProDataGrid();
      setIsGridLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Columns definition
  const columns: ColumnDef<Product>[] = useMemo(() => [
    { id: 'id', header: 'ID', field: 'id', width: 100, sortable: true },
    { id: 'name', header: 'Product Name', field: 'name', width: 220, sortable: true, editable: true },
    { id: 'category', header: 'Category', field: 'category', width: 140, sortable: true },
    {
      id: 'price',
      header: 'Price',
      field: 'price',
      width: 120,
      sortable: true,
      editable: true,
      formatter: (val: number) => `$${Number(val).toFixed(2)}`
    },
    { id: 'stock', header: 'Stock', field: 'stock', width: 90, sortable: true },
    {
      id: 'status',
      header: 'Status',
      field: 'status',
      width: 130,
      sortable: true,
      formatter: (val: string) => {
        const color = val === 'In Stock' ? '#16a34a' : val === 'Low Stock' ? '#d97706' : '#dc2626';
        return `<span style="font-weight:600; color:${color}; font-size:0.825rem;">${val}</span>`;
      }
    },
    { id: 'supplier', header: 'Supplier', field: 'supplier', width: 140 }
  ], []);

  // Update ProDataGrid instance whenever settings, columns, or data change
  useEffect(() => {
    if (!isGridLoaded || !gridContainerRef.current) return;

    let el = gridElRef.current;
    if (!el) {
      el = document.createElement('pro-data-grid') as ProDataGrid<Product>;
      gridContainerRef.current.innerHTML = '';
      gridContainerRef.current.appendChild(el);
      gridElRef.current = el;

      // Attach event listeners
      el.addEventListener('pdg:select', (e: any) => {
        const ids = e.detail?.selectedIds ? Array.from(e.detail.selectedIds) : [];
        setSelectedIds(ids as string[]);
        setLastAction(`Selection updated: ${ids.length} item(s) selected`);
      });

      el.addEventListener('pdg:cell-edit-commit', (e: any) => {
        const { rowId, field, newValue } = e.detail;
        setProducts(prev => prev.map(p => p.id === rowId ? { ...p, [field]: newValue } : p));
        setLastAction(`Edited row ${rowId}: [${field}] = ${newValue}`);
      });

      el.addEventListener('pdg:row-delete', (e: any) => {
        const rowId = e.detail?.row?.id || e.detail?.rowId;
        if (rowId) {
          setProducts(prev => prev.filter(p => p.id !== rowId));
          setLastAction(`Deleted row ${rowId}`);
        }
      });

      el.addEventListener('pdg:sort', (e: any) => {
        const sorts = e.detail?.sorts || [];
        setLastAction(`Sorted by: ${sorts.map((s: any) => `${s.field} (${s.direction})`).join(', ') || 'none'}`);
      });
    }

    const gridOptions: Partial<GridOptions<Product>> = {
      pagination: settings.pagination ? { pageSize: settings.pageSize, pageSizes: [5, 8, 15, 25] } : false,
      sorting: settings.sorting ? { multiColumn: settings.multiSort } : false,
      globalSearch: settings.globalSearch ? { debounceMs: 250, placeholder: 'Filter catalog...' } : false,
      density: settings.density,
      animations: settings.animations,
      selectable: settings.selectable,
      multiSelect: settings.selectable && settings.multiSelect,
      rowReordering: settings.rowReordering,
      columnReordering: settings.columnReordering,
      editable: settings.editable,
      deletable: settings.deletable,
      expandable: settings.expandable ? {
        detailRenderer: (row: Product) => {
          return `
            <div style="padding: 0.75rem 1rem; background: #f8fafc; font-size: 0.85rem; border-left: 3px solid #3b82f6;">
              <strong>${row.name} (${row.sku})</strong> &bull; Lead Time: <em>${row.leadTime}</em> &bull; Supplier: <em>${row.supplier}</em>
            </div>
          `;
        }
      } : false
    };

    if (settings.serverSide) {
      gridOptions.serverSide = {
        loader: async (query: GridQuery) => {
          await new Promise(r => setTimeout(r, 400));
          let filtered = [...products];
          if (query.search) {
            const s = query.search.toLowerCase();
            filtered = filtered.filter(p => p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s));
          }
          if (query.sorts && query.sorts.length > 0) {
            const sort = query.sorts[0];
            filtered.sort((a, b) => {
              const va = (a as any)[sort.field];
              const vb = (b as any)[sort.field];
              return sort.direction === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
            });
          }
          const total = filtered.length;
          const page = query.pagination?.page || 0;
          const size = query.pagination?.pageSize || settings.pageSize;
          const rows = filtered.slice(page * size, (page + 1) * size);
          return { rows, total };
        }
      };
    } else {
      gridOptions.serverSide = undefined;
    }

    el.columns = columns;
    el.rows = products;
    el.options = gridOptions;
  }, [isGridLoaded, settings, columns, products]);

  const updateSetting = <K extends keyof SettingsState>(key: K, val: SettingsState[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: val };
      if (key === 'selectable' && !val) {
        next.multiSelect = false;
      }
      return next;
    });
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setProducts(INITIAL_PRODUCTS);
    setSelectedIds([]);
    setLastAction('Reset configuration to default presets.');
  };

  const isDark = settings.theme === 'dark';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      color: isDark ? '#f1f5f9' : '#0f172a',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      transition: 'background-color 0.2s ease, color 0.2s ease'
    }}>
      {/* Top Header */}
      <header style={{
        borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        padding: '1.25rem 2rem'
      }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <span style={{
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                Interactive Settings Studio
              </span>
              <span style={{ fontSize: '0.85rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                Next.js App Router &bull; Web Components
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.025em' }}>
              Configurable Data Table
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link
              href="/gallery"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: isDark ? '#cbd5e1' : '#475569',
                border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
                padding: '0.4rem 0.85rem',
                borderRadius: '0.375rem',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 600
              }}
            >
              &larr; Gallery Hub
            </Link>
            <Link
              href="/docs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                padding: '0.4rem 0.85rem',
                borderRadius: '0.375rem',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 600
              }}
            >
              Documentation &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem 2rem' }}>
        {/* Active Settings Summary Banner */}
        <section
          aria-label="Active Configuration Summary"
          style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '0.4rem' }}>
              Active Capabilities Summary
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: '0.25rem', background: settings.pagination ? '#dcfce7' : '#fee2e2', color: settings.pagination ? '#166534' : '#991b1b', fontWeight: 600 }}>
                Pagination: {settings.pagination ? `${settings.pageSize}/page` : 'Disabled'}
              </span>
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: '0.25rem', background: settings.sorting ? '#dcfce7' : '#fee2e2', color: settings.sorting ? '#166534' : '#991b1b', fontWeight: 600 }}>
                Sorting: {settings.sorting ? (settings.multiSort ? 'Multi-Col' : 'Single') : 'Off'}
              </span>
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: '0.25rem', background: settings.globalSearch ? '#dcfce7' : '#fee2e2', color: settings.globalSearch ? '#166534' : '#991b1b', fontWeight: 600 }}>
                Search: {settings.globalSearch ? 'Active' : 'Off'}
              </span>
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: '0.25rem', background: settings.selectable ? '#dcfce7' : '#fee2e2', color: settings.selectable ? '#166534' : '#991b1b', fontWeight: 600 }}>
                Selection: {settings.selectable ? (settings.multiSelect ? 'Multi' : 'Single') : 'None'}
              </span>
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: '0.25rem', background: settings.editable ? '#dcfce7' : '#fee2e2', color: settings.editable ? '#166534' : '#991b1b', fontWeight: 600 }}>
                Editing: {settings.editable ? 'Inline On' : 'Off'}
              </span>
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: '0.25rem', background: settings.deletable ? '#dcfce7' : '#fee2e2', color: settings.deletable ? '#166534' : '#991b1b', fontWeight: 600 }}>
                Delete: {settings.deletable ? 'Allowed' : 'Off'}
              </span>
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: '0.25rem', background: settings.serverSide ? '#e0e7ff' : '#f1f5f9', color: settings.serverSide ? '#3730a3' : '#475569', fontWeight: 600 }}>
                Mode: {settings.serverSide ? 'Server-Side' : 'Client-Side'}
              </span>
            </div>
          </div>
          <button
            onClick={handleReset}
            style={{
              padding: '0.45rem 0.85rem',
              backgroundColor: isDark ? '#334155' : '#f1f5f9',
              color: isDark ? '#f8fafc' : '#334155',
              border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
              borderRadius: '0.375rem',
              fontWeight: 600,
              fontSize: '0.825rem',
              cursor: 'pointer'
            }}
          >
            Reset Defaults
          </button>
        </section>

        {/* Studio Layout: Settings Drawer on Left, Table on Right */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Settings Control Panel */}
          <aside
            aria-label="Configuration Settings Drawer"
            style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.75rem',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0', paddingBottom: '0.5rem', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
              Component Options
            </h2>

            {/* Density & Theme */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', marginBottom: '0.35rem' }}>
                Row Density
              </label>
              <select
                value={settings.density}
                onChange={(e) => updateSetting('density', e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.5rem',
                  borderRadius: '0.375rem',
                  border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  fontSize: '0.85rem'
                }}
              >
                <option value="compact">Compact (36px)</option>
                <option value="comfortable">Comfortable (48px)</option>
                <option value="spacious">Spacious (60px)</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', marginBottom: '0.35rem' }}>
                Appearance Theme
              </label>
              <select
                value={settings.theme}
                onChange={(e) => updateSetting('theme', e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.5rem',
                  borderRadius: '0.375rem',
                  border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  fontSize: '0.85rem'
                }}
              >
                <option value="light">Light Theme</option>
                <option value="dark">Dark Theme</option>
              </select>
            </div>

            {/* Core Feature Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
                Core Capabilities
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.pagination}
                  onChange={(e) => updateSetting('pagination', e.target.checked)}
                />
                Pagination
              </label>

              {settings.pagination && (
                <div style={{ marginLeft: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '0.2rem' }}>
                    Page Size
                  </label>
                  <select
                    value={settings.pageSize}
                    onChange={(e) => updateSetting('pageSize', Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.3rem',
                      borderRadius: '0.25rem',
                      border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      fontSize: '0.8rem'
                    }}
                  >
                    <option value={3}>3 rows</option>
                    <option value={5}>5 rows</option>
                    <option value={10}>10 rows</option>
                  </select>
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.globalSearch}
                  onChange={(e) => updateSetting('globalSearch', e.target.checked)}
                />
                Global Search
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.sorting}
                  onChange={(e) => updateSetting('sorting', e.target.checked)}
                />
                Column Sorting
              </label>

              {settings.sorting && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginLeft: '1.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.multiSort}
                    onChange={(e) => updateSetting('multiSort', e.target.checked)}
                  />
                  Multi-Column Sort
                </label>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.animations}
                  onChange={(e) => updateSetting('animations', e.target.checked)}
                />
                Smooth Animations
              </label>
            </div>

            {/* Selection & Interaction */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
                Selection &amp; Rows
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.selectable}
                  onChange={(e) => updateSetting('selectable', e.target.checked)}
                />
                Row Selection
              </label>

              {settings.selectable && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginLeft: '1.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.multiSelect}
                    onChange={(e) => updateSetting('multiSelect', e.target.checked)}
                  />
                  Multi-Row Select
                </label>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.expandable}
                  onChange={(e) => updateSetting('expandable', e.target.checked)}
                />
                Expandable Details
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.editable}
                  onChange={(e) => updateSetting('editable', e.target.checked)}
                />
                Inline Cell Editing
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.deletable}
                  onChange={(e) => updateSetting('deletable', e.target.checked)}
                />
                Row Deletion
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.columnReordering}
                  onChange={(e) => updateSetting('columnReordering', e.target.checked)}
                />
                Column Drag &amp; Reorder
              </label>
            </div>

            {/* Server-Side Operations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
                Data Source Mode
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.serverSide}
                  onChange={(e) => updateSetting('serverSide', e.target.checked)}
                />
                Server-Side Querying
              </label>
              <div style={{ fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                Simulates remote 400ms server latency with remote pagination &amp; sorting.
              </div>
            </div>
          </aside>

          {/* Table Preview and Activity Log */}
          <section aria-label="Live Data Table Preview" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.75rem',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  Live Interactive Table
                </h2>
                <div style={{ fontSize: '0.85rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                  {selectedIds.length} row(s) selected
                </div>
              </div>

              {/* ProDataGrid mounting target */}
              <div ref={gridContainerRef} style={{ minHeight: '380px' }} />
            </div>

            {/* Action and Event Activity Log */}
            <div style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#2563eb' }}>
                Last Event:
              </span>
              <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: isDark ? '#cbd5e1' : '#334155' }}>
                {lastAction}
              </span>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
