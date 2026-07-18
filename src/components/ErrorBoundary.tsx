// ============================================================================
// ErrorBoundary — Hata yakalayıcı bileşen
// ============================================================================
// Bir bileşen render sırasında hata fırlatırsa, modalın tamamen boş
// görünmesini engellemek için hatayı yakalar ve kullanıcıya bilgi verir.
// ============================================================================

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'Beklenmeyen bir hata oluştu.' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary yakaladı:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--md-error)' }}>
          <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8, color: 'var(--md-on-surface)' }}>
            ⚠️ Bir hata oluştu
          </p>
          <p style={{ fontSize: 13, color: 'var(--md-on-surface-variant)', marginBottom: 16 }}>
            {this.state.errorMessage}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            className="md-ripple"
            style={{
              padding: '10px 24px',
              background: 'var(--md-primary)',
              color: 'var(--md-on-primary)',
              border: 'none',
              borderRadius: 24,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              minHeight: 48,
            }}
          >
            Tekrar Dene
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
