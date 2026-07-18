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
        <div style={{ padding: 24, textAlign: 'center', color: '#DC2626' }}>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            ⚠️ Bir hata oluştu
          </p>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
            {this.state.errorMessage}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            style={{
              padding: '10px 20px',
              background: '#2563EB',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
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
