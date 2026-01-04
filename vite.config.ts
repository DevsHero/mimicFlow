import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@shared': path.resolve(__dirname, './src/shared'),
            '@webview': path.resolve(__dirname, './src/webview')
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    build: {
        outDir: 'dist/webview',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                dashboard: path.resolve(__dirname, 'src/webview/dashboard/dashboard.html'),
                player: path.resolve(__dirname, 'src/webview/player/player.html')
            },
            output: {
                entryFileNames: '[name]/[name].js',
                chunkFileNames: '[name]/[name].js',
                assetFileNames: '[name]/[name].[ext]'
            }
        }
    },
    server: {
        port: 5173,
        strictPort: true
    }
});
