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
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg m-4">
                    <h2 className="text-xl font-bold text-red-500 mb-2">Error al cargar la vista: {this.props.viewName}</h2>
                    <p className="text-gray-300 mb-4">Ha ocurrido un error inesperado al mostrar este módulo.</p>
                    <pre className="bg-black/50 p-2 rounded text-xs text-red-300 overflow-auto max-h-40">
                        {this.state.error?.toString()}
                    </pre>
                    <button
                        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
                        onClick={() => this.setState({ hasError: false, error: null })}
                    >
                        Intentar de nuevo
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
