import Link from 'next/link';

export default function DocsPage() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', padding: '0.25rem 0.65rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            @pro-data-grid/core
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>Developer Guide &amp; API Reference</h1>
        </div>
        <Link href="/gallery" style={{ background: '#2563eb', color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '0.375rem', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
          &larr; View Demo Gallery
        </Link>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', color: '#334155' }}>
        {/* Overview */}
        <section style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '0.75rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>Architecture Overview</h2>
          <p style={{ lineHeight: 1.6, marginBottom: '1rem' }}>
            A unified suite of 13 high-performance data table Web Components designed in pure TypeScript. Does not depend on React, Tailwind runtimes, or external table libraries. Every table includes default pagination, sorting, and global search.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div style={{ background: '#ffffff', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
              <strong style={{ color: '#0f172a' }}>Framework Agnostic</strong>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>Runs in Vanilla JS, Next.js App Router, Vue, Angular, or Svelte via standard Custom Elements.</p>
            </div>
            <div style={{ background: '#ffffff', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
              <strong style={{ color: '#0f172a' }}>Zero Runtime Styling Deps</strong>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>Ships scoped CSS variables with dark-mode support; consumers do not need Tailwind installed.</p>
            </div>
            <div style={{ background: '#ffffff', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
              <strong style={{ color: '#0f172a' }}>Server-Side Operations</strong>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>Cancelable queries via AbortSignal with stale-response protection and debouncing.</p>
            </div>
          </div>
        </section>

        {/* Integration */}
        <section>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>Next.js App Router Integration</h2>
          <p style={{ lineHeight: 1.6, marginBottom: '1rem' }}>
            Because Web Components interact directly with the browser DOM, mark your wrapper components with <code>&apos;use client&apos;</code> and attach data inside <code>useEffect()</code>:
          </p>
          <pre style={{ background: '#0f172a', color: '#38bdf8', padding: '1.25rem', borderRadius: '0.5rem', overflowX: 'auto', fontSize: '0.85rem' }}>
{`'use client';

import React, { useEffect, useRef } from 'react';
import '@pro-data-grid/core';

export function MyGrid() {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.columns = [
        { id: 'name', header: 'Name', field: 'name', sortable: true },
        { id: 'role', header: 'Role', field: 'role' }
      ];
      ref.current.rows = [
        { id: '1', name: 'Alice Cooper', role: 'Staff Engineer' }
      ];
    }
  }, []);

  return <pro-data-grid ref={ref} />;
}`}
          </pre>
        </section>

        {/* Available Packages */}
        <section>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>Component Custom Element Exports</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>Custom Element Tag</th>
                <th style={{ padding: '0.75rem' }}>Subpath Export</th>
                <th style={{ padding: '0.75rem' }}>Features</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>&lt;pro-data-grid&gt;</td>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>@pro-data-grid/core</td>
                <td style={{ padding: '0.75rem' }}>Core data grid with server querying, reordering, inline editing, and deletion.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>&lt;sticky-data-table&gt;</td>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>@pro-data-grid/core/sticky-table</td>
                <td style={{ padding: '0.75rem' }}>Pinned first column with horizontal scrolling and RTL layout support.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>&lt;expandable-data-table&gt;</td>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>@pro-data-grid/core/expandable-table</td>
                <td style={{ padding: '0.75rem' }}>Master-detail rows that expand to display custom sub-components.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>&lt;tree-data-table&gt;</td>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>@pro-data-grid/core/tree-table</td>
                <td style={{ padding: '0.75rem' }}>Multi-level tree nesting, sticky parent rows during scroll, DND reorder, and CSV export.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>&lt;calculated-data-table&gt;</td>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>@pro-data-grid/core/calculated-table</td>
                <td style={{ padding: '0.75rem' }}>Reactive formulas without eval; pinned first and last columns.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>&lt;advanced-filter-data-table&gt;</td>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>@pro-data-grid/core/advanced-filter-table</td>
                <td style={{ padding: '0.75rem' }}>Boolean expression builder (AND/OR), saved presets, and cascading dropdowns.</td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid #e2e8f0', marginTop: '3rem', paddingTop: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
        <span>Documentation for @pro-data-grid/core &bull; MIT License</span>
      </footer>
    </div>
  );
}
