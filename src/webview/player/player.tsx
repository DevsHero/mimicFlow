import React from 'react';
import ReactDOM from 'react-dom/client';
import { PlayerApp } from './PlayerApp';
import '../styles/globals.css';

const root = document.getElementById('root');
if (root) {
    ReactDOM.createRoot(root).render(
        <React.StrictMode>
            <PlayerApp />
        </React.StrictMode>
    );
}
