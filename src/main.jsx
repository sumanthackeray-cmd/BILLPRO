// Prevent React DOM crashes from browser extensions / Google Translate
if (typeof window !== 'undefined') {
  const nativeRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child?.parentNode !== this) return child;
    return nativeRemoveChild.apply(this, arguments);
  };

  const nativeInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (newNode?.parentNode === this && referenceNode === newNode) return newNode;
    if (referenceNode && referenceNode.parentNode !== this) return newNode;
    return nativeInsertBefore.apply(this, arguments);
  };

  window.addEventListener('error', (event) => {
    if (event.message?.includes('ResizeObserver')) {
      event.stopImmediatePropagation();
      return;
    }
    console.error('[EasyBMT] Uncaught error:', event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[EasyBMT] Unhandled promise rejection:', event.reason);
  });
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from '@/App.jsx'
import '@/index.css'
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/lib/LanguageContext"
import { db } from '@/api/firebase'
import { initializeBranchService } from '@/api/branchService'
import { initializeInventorySyncService } from '@/api/inventorySyncService'
import { initializeAuditLogging } from '@/api/auditLogging'

try {
  initializeBranchService(db);
  initializeInventorySyncService(db);
  initializeAuditLogging(db);
} catch (e) {
  console.error('[EasyBMT] Service init failed:', e);
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  registerSW({ immediate: true });
}
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[EasyBMT Root Error]', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      return (
        <div style={{ padding: '24px', background: '#1a1a2e', color: '#ff4444', fontFamily: 'system-ui,sans-serif', minHeight: '100vh' }}>
          <h2 style={{ color: '#ff8800', marginTop: 0 }}>Something went wrong</h2>
          <p style={{ color: '#ccc' }}>{err?.message || 'An unexpected error occurred.'}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: '16px', padding: '10px 20px', background: '#ff8800', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <RootErrorBoundary>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme" attribute="class">
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </RootErrorBoundary>
)
