/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/webview/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                vscode: {
                    'editor-bg': 'var(--vscode-editor-background)',
                    'editor-fg': 'var(--vscode-editor-foreground)',
                    'sidebar-bg': 'var(--vscode-sideBar-background)',
                    'button-bg': 'var(--vscode-button-background)',
                    'button-fg': 'var(--vscode-button-foreground)',
                    'button-hover': 'var(--vscode-button-hoverBackground)',
                    'input-bg': 'var(--vscode-input-background)',
                    'input-border': 'var(--vscode-input-border)',
                }
            }
        },
    },
    plugins: [],
}
