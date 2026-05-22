// Safely patch DOM manipulation to prevent crashes from Google Translate / Browser Extensions
if (typeof window !== 'undefined') {
  const nativeRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function(child) {
    if (child.parentNode !== this) {
      if (console && console.warn) {
        console.warn('Prevented React removeChild crash on unmatching parentNode:', child, this);
      }
      return child;
    }
    return nativeRemoveChild.apply(this, arguments);
  };

  const nativeInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, referenceNode) {
    if (newNode && newNode.parentNode === this && referenceNode === newNode) {
      // Prevent inserting node before itself
      return newNode;
    }
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console && console.warn) {
        console.warn('Prevented React insertBefore crash on unmatching parentNode:', referenceNode, this);
      }
      return newNode;
    }
    return nativeInsertBefore.apply(this, arguments);
  };
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/lib/LanguageContext"
import { db } from '@/api/firebase'
import { initializeBranchService } from '@/api/branchService'
import { initializeInventorySyncService } from '@/api/inventorySyncService'
import { initializeAuditLogging } from '@/api/auditLogging'

// Initialize core retail services
initializeBranchService(db);
initializeInventorySyncService(db);
initializeAuditLogging(db);


// Global error listener to capture early loading errors
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('ResizeObserver')) {
    event.stopImmediatePropagation();
    return;
  }

  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; background: #fee2e2; color: #991b1b; border: 1px solid #f87171; margin: 20px; font-family: sans-serif; border-radius: 8px;">
        <h3 style="margin-top:0;">Global JS Error Caught</h3>
        <p><strong>Message:</strong> ${event.message}</p>
        <p><strong>Source:</strong> ${event.filename}:${event.lineno}:${event.colno}</p>
        <pre style="background:#fff; padding:10px; border-radius:4px; overflow-x:auto;">${event.error?.stack || ''}</pre>
      </div>
    `;
  }
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#fee2e2', color: '#991b1b', border: '1px solid #f87171', margin: '20px', fontFamily: 'sans-serif', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>React Render Error Caught</h3>
          <p><strong>Message:</strong> {this.state.error?.message}</p>
          <pre style={{ background: '#fff', padding: '10px', borderRadius: '4px', overflowX: 'auto' }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme" attribute="class">
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </ErrorBoundary>
)
