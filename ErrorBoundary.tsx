import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  // FIX: Switched from class property initializer to a constructor for state initialization.
  // This is a more traditional and widely supported way to define a React class component,
  // ensuring `this.props` is correctly set up via `super(props)` and that `this.setState`
  // and other lifecycle methods have the correct `this` context.
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): Pick<State, 'hasError' | 'error'> {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error in React tree:", error, errorInfo);
    
    const errorMessage = error?.message || error?.toString() || '';
    const isChunkError =
      errorMessage.includes('Failed to fetch dynamically imported module') ||
      errorMessage.includes('Importing a module script failed') ||
      errorMessage.includes('Loading chunk') ||
      errorMessage.includes('error loading dynamically imported module');

    if (isChunkError) {
      const lastReload = window.sessionStorage.getItem('simcop_boundary_chunk_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        window.sessionStorage.setItem('simcop_boundary_chunk_reload', now.toString());
        console.info('[SIMCOP ErrorBoundary] Chunk 404 detected after deployment. Forcing reload...');
        window.location.reload();
        return;
      }
    }

    this.setState({
      errorInfo: errorInfo
    });
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || this.state.error?.toString() || '';
      const isChunkError =
        errorMessage.includes('Failed to fetch dynamically imported module') ||
        errorMessage.includes('Importing a module script failed') ||
        errorMessage.includes('Loading chunk') ||
        errorMessage.includes('error loading dynamically imported module');

      // Fallback UI
      return (
        <div style={{ 
            padding: '20px', 
            backgroundColor: '#111827', /* bg-gray-900 */
            color: 'white', 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontFamily: 'sans-serif'
        }}>
          <h1 style={{ color: isChunkError ? '#60A5FA' : '#F87171', fontSize: '2em', marginBottom: '1rem' }}>
            {isChunkError ? '🔄 Actualización del Sistema Detectada' : '⚠️ Oops! Algo salió mal.'}
          </h1>
          <p style={{ color: isChunkError ? '#93C5FD' : '#FCA5A5', marginBottom: '0.5rem', textAlign: 'center', maxWidth: '600px' }}>
            {isChunkError
              ? 'Se ha desplegado una nueva versión de SIMCOP. Para cargar los módulos actualizados, haga clic en el botón inferior para recargar.'
              : 'La aplicación encontró un error y no puede continuar.'}
          </p>
          <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
            <button
              onClick={() => {
                window.sessionStorage.clear();
                window.location.reload();
              }}
              style={{
                backgroundColor: '#2563EB',
                color: 'white',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                letterSpacing: '1px'
              }}
            >
              🔄 RECARGAR Y ACTUALIZAR
            </button>
          </div>
          {this.state.error && (
            <details style={{ 
                marginTop: '20px', 
                color: '#D1D5DB', /* text-gray-300 */
                backgroundColor: '#1F2937', /* bg-gray-800 */
                border: '1px solid #374151', /* border-gray-700 */
                padding: '15px', 
                borderRadius: '8px', 
                maxWidth: '800px', 
                width: '90%',
                overflowWrap: 'break-word',
                textAlign: 'left'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#FCD34D' /* text-yellow-300 */ }}>
                Detalles del Error (para desarrollo)
              </summary>
              <pre style={{ 
                  whiteSpace: 'pre-wrap', 
                  fontSize: '0.8em', 
                  marginTop: '10px', 
                  color: '#E5E7EB', /* text-gray-200 */
                  maxHeight: '300px',
                  overflowY: 'auto'
              }}>
                <strong>Error:</strong> {this.state.error.toString()}
                {this.state.error.stack && (
                  <>
                    <br /><br />
                    <strong>Stack Trace:</strong>
                    {this.state.error.stack}
                  </>
                )}
                {this.state.errorInfo && this.state.errorInfo.componentStack && (
                  <>
                    <br /><br />
                    <strong>Stack del Componente:</strong>
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
