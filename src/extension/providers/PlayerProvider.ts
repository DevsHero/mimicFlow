import * as vscode from 'vscode';
import { GhostFileManager } from '../storage/GhostFileManager';
import { GhostFile } from '../../shared/types/GhostFile';

export class PlayerProvider {
    private _panel?: vscode.WebviewPanel;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _ghostFileManager: GhostFileManager
    ) { }

    public async openPlayer(ghostFileId: string) {
        console.log('[PlayerProvider] Opening player for:', ghostFileId);

        // Get ghost file data
        const ghostFile = await this._ghostFileManager.getGhostFile(ghostFileId);
        if (!ghostFile) {
            vscode.window.showErrorMessage(`Ghost file not found: ${ghostFileId}`);
            return;
        }

        await this._showPlayerPanel();

        // Send single ghost file data to player
        this._panel!.webview.postMessage({
            type: 'playGhostFile',
            data: ghostFile
        });
    }

    /**
     * Open player with a playlist of ghost files
     */
    public async openPlaylist(ghostFileIds: string[]) {
        console.log('[PlayerProvider] Opening playlist with', ghostFileIds.length, 'files');

        if (ghostFileIds.length === 0) {
            vscode.window.showWarningMessage('No files to play');
            return;
        }

        // Load all ghost files
        const ghostFiles: GhostFile[] = [];
        for (const id of ghostFileIds) {
            const file = await this._ghostFileManager.getGhostFile(id);
            if (file) {
                ghostFiles.push(file);
            }
        }

        if (ghostFiles.length === 0) {
            vscode.window.showErrorMessage('Could not load ghost files');
            return;
        }

        // Sort by timestamp (oldest to newest for chronological playback)
        ghostFiles.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        await this._showPlayerPanel();

        // Send playlist to player
        this._panel!.webview.postMessage({
            type: 'LOAD_PLAYLIST',
            payload: {
                queue: ghostFiles,
                activeIndex: 0
            }
        });
    }

    /**
     * Show or create the player panel
     */
    private async _showPlayerPanel() {
        // Create or show panel
        if (this._panel) {
            this._panel.reveal(vscode.ViewColumn.One);
        } else {
            this._panel = vscode.window.createWebviewPanel(
                'mimicflowPlayer',
                '🎬 MimicFlow Player',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [this._extensionUri],
                    retainContextWhenHidden: true
                }
            );

            this._panel.webview.onDidReceiveMessage(async (message) => {
                if (!message || typeof message !== 'object') return;

                switch (message.type) {
                    case 'toggleVscodeFullscreen':
                        // True fullscreen in VS Code is controlled by the host app, not the webview iframe.
                        await vscode.commands.executeCommand('workbench.action.toggleFullScreen');
                        break;
                }
            });

            this._panel.onDidDispose(() => {
                this._panel = undefined;
            });

            this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'player', 'player.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'globals', 'globals.css')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src https://cdn.jsdelivr.net; style-src ${webview.cspSource} 'unsafe-inline' https://cdn.jsdelivr.net; script-src ${webview.cspSource} 'unsafe-inline' https://cdn.jsdelivr.net; font-src ${webview.cspSource} data:; worker-src ${webview.cspSource} blob: data:; img-src ${webview.cspSource} data:;">
    <link href="${styleUri}" rel="stylesheet">
    <title>MimicFlow Player</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        #root {
            width: 100vw;
            height: 100vh;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
    }
}
