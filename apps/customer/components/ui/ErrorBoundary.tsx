'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCcw, AlertTriangle } from 'lucide-react';
import { useI18n } from "@/lib/I18nContext";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name || 'Global'}] Uncaught error:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-8 text-center bg-white rounded-[32px] border border-red-50 shadow-sm animate-in fade-in duration-500">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="text-red-500 w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 font-serif-thai">เกิดข้อผิดพลาดในการแสดงผล</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto text-sm leading-relaxed">
                         ขออภัย ระบบพบข้อผิดพลาดบางประการระหว่างการทำงาน<br/>
                         ส่วนใหญ่มักเกิดจากการเชื่อมต่อขัดข้องชั่วคราว</p>
          
          <div className="mb-8 p-6 bg-red-50/50 rounded-2xl text-left max-w-lg overflow-auto border border-red-100">
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-3">Technical Error Report:</p>
            <pre className="text-[12px] font-mono text-red-700 font-bold whitespace-pre-wrap leading-relaxed">
              {this.state.error?.name}: {this.state.error?.message}
            </pre>
            {this.state.error?.stack && (
              <pre className="mt-4 text-[9px] font-mono text-gray-400 whitespace-pre-wrap">
                {this.state.error.stack.split('\n').slice(0, 3).join('\n')}
              </pre>
            )}
          </div>

          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-8 py-4 bg-[#1A3626] text-white rounded-full font-bold text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-green-100"
          >
            <RefreshCcw size={16} />
                         รีเฟรชเพื่อลองใหม่อีกครั้ง</button>
        </div>
      );
    }

    return this.props.children;
  }
}