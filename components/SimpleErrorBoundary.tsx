import * as React from 'react';

export type Props = {
    children: React.ReactNode;
    viewName?: string;
};

export type State = {
    hasError: boolean;
    error: Error | null;
};

export class SimpleErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Uncaught error in view:', this.props.viewName, error, errorInfo);
        const errorMessage = error?.message || error?.toString() || '';
        const isChunkError =
            errorMessage.includes('Failed to fetch dynamically imported module') ||
            errorMessage.includes('Importing a module script failed') ||
            errorMessage.includes('Loading chunk') ||
            errorMessage.includes('error loading dynamically imported module');

        if (isChunkError) {
            const lastReload = window.sessionStorage.getItem(`simcop_view_${this.props.viewName}_reload`);
            const now = Date.now();
            if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
                window.sessionStorage.setItem(`simcop_view_${this.props.viewName}_reload`, now.toString());
                window.location.reload();
            }
        }
    }

    public render() {
        if (this.state.hasError) {
            const errorMessage = this.state.error?.message || this.state.error?.toString() || '';
            const isChunkError =
                errorMessage.includes('Failed to fetch dynamically imported module') ||
                errorMessage.includes('Importing a module script failed') ||
                errorMessage.includes('Loading chunk') ||
                errorMessage.includes('error loading dynamically imported module');

            return (
                <div className="p-6 bg-slate-900/90 border border-blue-500/40 rounded-xl m-4 backdrop-blur-md shadow-2xl">
                    <h2 className="text-lg font-bold text-blue-400 mb-2 font-mono flex items-center gap-2">
                        <span>🔄</span> {isChunkError ? `Actualización del módulo ${this.props.viewName || ''}` : `Error al cargar: ${this.props.viewName}`}
                    </h2>
                    <p className="text-gray-300 text-sm mb-4">
                        {isChunkError
                            ? 'Este módulo ha sido actualizado con una nueva versión en el servidor. Presione el botón para sincronizar.'
                            : 'Ha ocurrido un error inesperado al mostrar este módulo.'}
                    </p>
                    <button
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 font-mono text-xs uppercase tracking-wider rounded-lg text-white font-bold transition-all shadow-lg"
                        onClick={() => {
                            if (isChunkError) {
                                window.location.reload();
                            } else {
                                this.setState({ hasError: false, error: null });
                            }
                        }}
                    >
                        {isChunkError ? 'Actualizar y Cargar Módulo' : 'Intentar de nuevo'}
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
