import * as React from 'react';

interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  children?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('RemoteSlot failed to load', error, info);
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <div>Remote Failed to Load</div>;
    }
    return this.props.children;
  }
}
