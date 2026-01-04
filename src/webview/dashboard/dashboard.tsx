import React from 'react';
import ReactDOM from 'react-dom/client';
import { DashboardApp } from './DashboardApp';
import '../styles/globals.css';

console.log('[Dashboard] Webview script loaded');

// Add visual confirmation
try {
    const root = document.getElementById('root');
    if (root) {
        console.log('[Dashboard] Root element found, rendering app');
        root.innerHTML = '<div style="padding: 20px; color: white;">Loading MimicFlow Dashboard...</div>';

        setTimeout(() => {
            ReactDOM.createRoot(root).render(
                <React.StrictMode>
                    <DashboardApp />
                </React.StrictMode>
            );
            console.log('[Dashboard] React app rendered');
        }, 100);
    } else {
        console.error('[Dashboard] Root element not found!');
        document.body.innerHTML = '<div style="padding: 20px; color: red;">ERROR: Root element not found!</div>';
    }
} catch (error) {
    console.error('[Dashboard] Error during initialization:', error);
    document.body.innerHTML = `<div style="padding: 20px; color: red;">ERROR: ${error}</div>`;
}
