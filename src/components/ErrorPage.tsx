import Link from 'next/link';
import { useEffect } from 'react';

export function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset?: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  const details =
    process.env.NODE_ENV === 'development'
      ? error.message
      : 'Try reopening this screen from the main navigation.';

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <section
        style={{
          maxWidth: '420px',
          width: '100%',
          borderRadius: '16px',
          border: '1px solid rgba(14, 24, 39, 0.14)',
          background: '#fff',
          padding: '18px',
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: '24px', lineHeight: 1.1 }}>
          Something went wrong
        </h2>
        <p style={{ margin: 0, color: '#5f6b7e', lineHeight: 1.4 }}>{details}</p>
        <div
          style={{
            marginTop: '14px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {reset && (
            <button
              onClick={() => reset()}
              style={{
                minHeight: '40px',
                borderRadius: '10px',
                border: 0,
                padding: '0 14px',
                background: '#2d63f1',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              Try again
            </button>
          )}
          <Link
            href="/"
            style={{
              minHeight: '40px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              padding: '0 14px',
              border: '1px solid rgba(14, 24, 39, 0.14)',
              color: '#0f1728',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}
