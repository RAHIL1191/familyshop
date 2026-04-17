import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let isFirestoreError = false;
      let firestoreDetails = null;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.operationType) {
            isFirestoreError = true;
            firestoreDetails = parsed;
          }
        }
      } catch (e) {
        // Not a JSON error message
      }

      return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-border p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center text-warning mx-auto">
              <AlertCircle size={32} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-black text-primary uppercase tracking-tight">Something went wrong</h1>
              <p className="text-xs text-neutral-500 font-medium italic">
                {isFirestoreError 
                  ? "We encountered a database connection issue. This usually happens if permissions are restricted."
                  : "An unexpected error occurred in the application."}
              </p>
            </div>

            {isFirestoreError && firestoreDetails && (
              <div className="bg-[#F1F3F5] rounded-lg p-4 text-left border border-border/50">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Details</p>
                <code className="text-[10px] font-mono text-primary block break-words leading-relaxed">
                  Path: {firestoreDetails.path}<br />
                  Action: {firestoreDetails.operationType}<br />
                  Error: {firestoreDetails.error}
                </code>
              </div>
            )}

            {!isFirestoreError && this.state.error && (
               <div className="bg-[#F1F3F5] rounded-lg p-4 text-left border border-border/50 max-h-32 overflow-auto">
                 <p className="text-[10px] font-mono text-warning break-words">{this.state.error.message}</p>
               </div>
            )}

            <button 
              onClick={this.handleRefresh}
              className="w-full density-btn-primary py-3 flex items-center justify-center gap-2 group"
            >
              <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
              <span>Refresh Page</span>
            </button>
            
            <p className="text-[10px] text-neutral-400">
              If this continues, please contact support with the details above.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
