import Link from 'next/link';

interface TableDemoMeta {
  title: string;
  description: string;
  href: string;
  tags: string[];
}

export default function GalleryPage() {
  const demos: TableDemoMeta[] = [
    {
      title: 'Core Grid',
      description: 'Foundational enterprise grid featuring server-side and client-side data loading, multi-column sorting, debounced search, inline editing, and deletion.',
      href: '/',
      tags: ['Foundation', 'Pagination', 'Search', 'Sorting']
    },
    {
      title: 'Sticky Column Table',
      description: 'Pins the first column securely while intermediate columns scroll horizontally, complete with divider edge shadows and RTL orientation support.',
      href: '/sticky-table',
      tags: ['Sticky', 'Horizontal Scroll', 'RTL']
    },
    {
      title: 'Expandable Row Table',
      description: 'Master-detail rows that expand to display custom nested sub-components, single or multi-row expansion, and keyboard accessibility.',
      href: '/expandable-table',
      tags: ['Master-Detail', 'Accordions', 'Sub-views']
    },
    {
      title: 'Column Visibility Table',
      description: 'Checkbox menu for showing, hiding, and re-ordering columns, with mandatory column locks and localStorage persistence.',
      href: '/column-visibility',
      tags: ['Column Toggles', 'Local Persistence']
    },
    {
      title: 'Filtering Table',
      description: 'Multi-criteria filter panel with text, select, multi-select, number range, and date range filters with active count badges.',
      href: '/filterable-table',
      tags: ['Multi-Filter', 'Date Range', 'Number Range']
    },
    {
      title: 'Editable Table',
      description: 'Direct cell editing with text, number, date, select, and checkbox editors. Includes validation feedback, Enter/Escape controls, and save handlers.',
      href: '/editable-table',
      tags: ['Inline Edit', 'Validation', 'Keyboard Navigation']
    },
    {
      title: 'Row-Grouped Table',
      description: 'Groups rows by one or more fields with expandable headers, aggregations (sum, average, count, min/max), and group-level sorting.',
      href: '/grouped-table',
      tags: ['Grouping', 'Aggregations', 'Nested Groups']
    },
    {
      title: 'Menu-Enhanced Table',
      description: 'Column header dropdowns (sorting, pinning, hiding) and right-click row context menus with smart boundary positioning.',
      href: '/context-menu-table',
      tags: ['Header Menus', 'Context Menus', 'Accessibility']
    },
    {
      title: 'Infinite Scrolling Table',
      description: 'Incremental data loading approaching bottom threshold, duplicate request locking, AbortSignal cancellation, and optional DOM row virtualization.',
      href: '/infinite-table',
      tags: ['Infinite Scroll', 'Virtualization', 'AbortSignal']
    },
    {
      title: 'Calculated Data Table',
      description: 'Non-eval reactive calculated formulas updating when source cells edit. Keeps first and last columns pinned simultaneously.',
      href: '/calculated-table',
      tags: ['Calculated Columns', 'Dual Sticky', 'Non-eval']
    },
    {
      title: 'Header Filter Table',
      description: 'Dedicated filter controls integrated directly inside column headers (text, select, multi-select, number range, date range) alongside sorting.',
      href: '/header-filter-table',
      tags: ['In-Header Filters', 'Debouncing', 'Composite Search']
    },
    {
      title: 'Tree Data Table',
      description: 'Multi-level hierarchical parent-child rows with sticky parent headers during scroll, drag & drop reordering, cascading selection, and hierarchy CSV export.',
      href: '/tree-table',
      tags: ['Tree Hierarchy', 'Drag & Drop', 'CSV Export']
    },
    {
      title: 'Advanced Filtering Table',
      description: 'Boolean expression builder with AND/OR logic trees, quick-search pills, saved presets with localStorage persistence, cascading select, and removable chips.',
      href: '/advanced-filter-table',
      tags: ['Filter Presets', 'AND/OR Logic', 'Cascading']
    },
    {
      title: 'Configurable Data Table',
      description: 'Feature-rich composite studio unifying all table capabilities into an interactive settings drawer with real-time reactive reconfiguration.',
      href: '/configurable-table',
      tags: ['Settings Panel', 'Composite Studio', 'Dynamic Presets']
    }
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2.5rem 1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '2rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Next.js App Router Gallery
          </div>
          <Link
            href="/docs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#2563eb',
              border: '1px solid #2563eb',
              padding: '0.35rem 0.75rem',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <span>Developer Documentation &amp; API Guide</span>
            <span>&rarr;</span>
          </Link>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>
          Data Table Component Gallery
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '800px', lineHeight: 1.6 }}>
          Main navigation hub showcasing all 14 specialized data table variants built with framework-agnostic TypeScript Web Components.
        </p>
      </header>

      <main>
        <nav aria-label="Component Demo Navigation">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {demos.map((demo) => (
              <article
                key={demo.title}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                    {demo.tags.map((tag) => (
                      <span key={tag} style={{ background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: 600 }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                    {demo.title}
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    {demo.description}
                  </p>
                </div>

                <Link
                  href={demo.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 1rem',
                    background: '#2563eb',
                    color: '#ffffff',
                    textDecoration: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}
                >
                  <span>Open Demo</span>
                  <span>&rarr;</span>
                </Link>
              </article>
            ))}
          </div>
        </nav>
      </main>

      <footer style={{ borderTop: '1px solid #e2e8f0', marginTop: '3rem', paddingTop: '1.5rem', color: '#94a3b8', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <span>TypeScript Web Components &bull; Next.js App Router Client Components</span>
        <span>13 Data Table Variants &bull; Zero External Dependencies</span>
      </footer>
    </div>
  );
}
