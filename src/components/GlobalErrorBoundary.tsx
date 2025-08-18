import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Expanded list of ignorable errors
    const ignorableErrors = [
      'Cannot read properties of null',
      'Cannot read properties of undefined',
      'Cannot read property',
      'TypeError: Cannot read properties',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed', 
      'Non-Error promise rejection captured',
      'Load failed',
      'Failed to fetch',
      'Network request failed',
      'ChunkLoadError',
      'Loading chunk',
      'Loading CSS chunk',
      'Script error',
      'NetworkError when attempting to fetch resource',
      'The request timed out',
      'AbortError',
      'NotAllowedError',
      'QuotaExceededError',
      'SecurityError',
      'InvalidStateError',
      'DataError',
      'TransactionInactiveError',
      'ReadOnlyError',
      'VersionError',
      'OperationError',
      'NotSupportedError',
      'InvalidAccessError',
      'TimeoutError',
      'AbortError',
      'NotReadableError',
      'EncodingError',
      'DecodeError',
      'ServiceUnavailableError'
    ];
    
    const errorString = error?.message || error?.toString() || '';
    const shouldIgnore = ignorableErrors.some(msg => 
      errorString.toLowerCase().includes(msg.toLowerCase())
    );
    
    // Also ignore React development warnings and hydration mismatches
    if (errorString.includes('Warning:') || 
        errorString.includes('Hydration') ||
        errorString.includes('useEffect') ||
        errorString.includes('act()') ||
        errorString.includes('findDOMNode')) {
      console.log('Ignoring React development warning:', errorString);
      return;
    }
    
    if (shouldIgnore) {
      console.log('Ignoring transient error:', errorString);
      // Reset state without showing error UI
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
      return;
    }
    
    // Log error to console in development
    if (import.meta.env.DEV) {
      logger.error('Error caught by boundary:', error, errorInfo);
    }

    // Log to error tracking service (e.g., Sentry) in production
    if (import.meta.env.PROD) {
      this.logErrorToService(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
      errorCount: this.state.errorCount + 1,
    });
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // TODO: Integrate with error tracking service like Sentry
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // For now, store in localStorage for debugging
    const errors = JSON.parse(localStorage.getItem('artrio_errors') || '[]');
    errors.push(errorData);
    // Keep only last 10 errors
    if (errors.length > 10) {
      errors.shift();
    }
    localStorage.setItem('artrio_errors', JSON.stringify(errors));
  };

  handleReset = () => {
    // Clear error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Optionally reload the page if errors persist
    if (this.state.errorCount > 2) {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                We've encountered an unexpected error. Don't worry, your data is safe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env.DEV && this.state.error && (
                <div className="p-3 bg-muted rounded-md space-y-2">
                  <p className="text-sm font-medium">Error Details (Dev Only):</p>
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        View stack trace
                      </summary>
                      <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto max-h-40">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={this.handleReset} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {this.state.errorCount > 1 && (
                <p className="text-xs text-muted-foreground text-center">
                  If this keeps happening, please contact support.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;