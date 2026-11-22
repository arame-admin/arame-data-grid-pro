import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: '#fee2e2',
        color: '#dc2626',
        padding: '0.35rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.85rem',
        fontWeight: 700,
        marginBottom: '1rem'
      }}>
        404 &bull; Page Not Found
      </div>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
        Demo Route Does Not Exist
      </h1>
      <p style={{ color: '#64748b', maxWidth: '480px', lineHeight: 1.5, marginBottom: '1.5rem' }}>
        The data table demo route you attempted to visit is not registered or has been moved. Explore all 14 verified interactive table demos from the main gallery.
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/gallery"
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            padding: '0.55rem 1.25rem',
            borderRadius: '0.375rem',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
        >
          Return to Gallery Hub &rarr;
        </Link>
        <Link
          href="/docs"
          style={{
            backgroundColor: '#ffffff',
            color: '#334155',
            border: '1px solid #cbd5e1',
            padding: '0.55rem 1.25rem',
            borderRadius: '0.375rem',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
        >
          Read Documentation
        </Link>
      </div>
    </div>
  );
}
