import React from 'react';

interface State { hasError: boolean; error: Error | null }

/**
 * ErrorBoundary – catches render errors from child components and displays
 * a graceful fallback instead of unmounting the whole React tree.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          padding: '32px',
          backgroundColor: 'var(--surface-container)',
          border: '1px solid #ff4444',
          color: '#ff4444',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px'
        }}>
          <strong>RENDER ERROR</strong>
          <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap', color: 'var(--text-muted)' }}>
            {this.state.error?.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
