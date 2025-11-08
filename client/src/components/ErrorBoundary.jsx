import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // MODIFIED: Enhanced error logging with null safety
        console.error('ErrorBoundary caught an error:', {
            error: error?.message || 'Unknown error',
            stack: error?.stack,
            componentStack: errorInfo?.componentStack || 'No component stack available'
        });

        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // MODIFIED: Optional: Send to error reporting service
        if (process.env.NODE_ENV === 'production') {
            // this.reportError(error, errorInfo);
        }
    }

    // MODIFIED: Added method to safely get error details
    getErrorDetails() {
        const { error, errorInfo } = this.state;

        if (!error && !errorInfo) {
            return 'No error details available.';
        }

        const errorMessage = error?.toString() || 'Unknown error occurred';
        const componentStack = errorInfo?.componentStack || 'No component stack trace available';

        return `${errorMessage}\n\nComponent Stack:\n${componentStack}`;
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className='bg-gray-200 w-screen h-screen flex items-center justify-center'>
                    <div className="p-4 m-4 border border-red-500 rounded-lg bg-red-50 text-red-800 max-w-2xl">
                        <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
                        <p className="text-sm mb-3">
                            The application encountered an unexpected error. This has been logged.
                        </p>

                        {/* MODIFIED: Safe error details display */}
                        <details className="mt-2 text-sm bg-red-100 p-3 rounded">
                            <summary className="cursor-pointer font-medium mb-2">
                                Error Details (Click to expand)
                            </summary>
                            <pre className="whitespace-pre-wrap text-xs mt-2">
                                {this.getErrorDetails()}
                            </pre>
                        </details>

                        <div className="mt-4 flex gap-2">
                            <button
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                                onClick={this.handleReset}
                            >
                                Try to recover
                            </button>
                            <button
                                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                                onClick={() => window.location.reload()}
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;