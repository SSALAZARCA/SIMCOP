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
    this.setState({
      errorInfo: errorInfo
    });
  }

  public render(): ReactNode {
    if (this.state.hasError) {
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
          <h1 style={{ color: '#F87171', /* text-red-400 */ fontSize: '2em', marginBottom: '1rem' }}>
            &#x26A0; Oops! Algo salió mal.
          </h1>
          <p style={{ color: '#FCA5A5', /* text-red-300 */ marginBottom: '0.5rem' }}>
            La aplicación encontró un error y no puede continuar.
          </p>
          <p style={{ color: '#FDBA74', /* text-orange-300 */ marginBottom: '1.5rem', fontSize: '0.9em' }}>
            Por favor, intente recargar la página. Si el problema persiste, contacte al soporte.
          </p>
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
