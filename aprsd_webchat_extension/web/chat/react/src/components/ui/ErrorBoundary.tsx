import { Component, type ReactNode, type ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Catches any unhandled error in the React component tree and displays
 * a recovery UI instead of a blank white screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('APRSD Webchat error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleClearAndReload = () => {
    // Clear all APRSD webchat localStorage keys
    const keys = Object.keys(localStorage)
    for (const key of keys) {
      if (key.startsWith('aprsd-webchat')) {
        localStorage.removeItem(key)
      }
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-dvh items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The webchat interface encountered an error. This can sometimes
              happen when cached data becomes corrupted.
            </p>
            {this.state.error && (
              <pre className="mt-2 rounded-md bg-secondary p-3 text-left text-xs text-muted-foreground overflow-x-auto">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleClearAndReload}
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                Clear Cache & Reload
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
