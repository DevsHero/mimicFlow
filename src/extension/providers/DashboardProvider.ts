import * as vscode from 'vscode';
import * as cp from 'child_process';
import { promisify } from 'util';
import { GhostFileManager } from '../storage/GhostFileManager';

const execAsync = promisify(cp.exec);

export class DashboardProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _ghostFileManager: GhostFileManager
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        console.log('[DashboardProvider] Webview HTML set, waiting for webview to be ready...');

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            console.log('[DashboardProvider] Received message from webview:', message.type);
            switch (message.type) {
                case 'getGhostFiles':
                    console.log('[DashboardProvider] Processing getGhostFiles request');
                    await this.sendGhostFiles();
                    break;

                case 'getBranch':
                    await this.sendBranch();
                    break;

                case 'openPlayer':
                    vscode.commands.executeCommand('mimicflow.openPlayer', message.ghostFileId);
                    break;

                case 'openPlaylist':
                    vscode.commands.executeCommand('mimicflow.openPlaylist', message.ghostFileIds);
                    break;

                case 'shareGhostFile':
                    vscode.commands.executeCommand('mimicflow.shareGhostFile', message.ghostFileId);
                    break;

                case 'deleteHistory':
                    vscode.commands.executeCommand('mimicflow.deleteHistory', message.ghostFileId);
                    break;

                case 'webviewReady':
                    console.log('[DashboardProvider] Webview confirmed ready, sending initial data');
                    await this.sendGhostFiles();
                    await this.sendBranch();
                    break;
            }
        });

        // Send initial data after a short delay to ensure webview is loaded
        setTimeout(async () => {
            console.log('[DashboardProvider] Timeout elapsed, sending initial ghost files');
            await this.sendGhostFiles();
            await this.sendBranch();
        }, 100);
    }

    private async sendGhostFiles() {
        if (!this._view) {
            console.log('[DashboardProvider] No view available');
            return;
        }

        const files = await this._ghostFileManager.getAllGhostFiles();
        console.log(`[DashboardProvider] Sending ${files.length} ghost files to webview`);
        this._view.webview.postMessage({
            type: 'ghostFilesData',
            data: files
        });
    }

    private async sendBranch() {
        if (!this._view) return;

        const branch = await this.getCurrentBranch();
        this._view.webview.postMessage({
            type: 'UPDATE_BRANCH',
            branch
        });
    }

    private async getCurrentBranch(): Promise<string> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return 'unknown';

        try {
            const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
                cwd: workspaceFolder.uri.fsPath,
                encoding: 'utf8'
            });
            const branch = String(stdout || '').trim();
            return branch || 'unknown';
        } catch {
            return 'unknown';
        }
    }

    /**
     * Refresh the dashboard with latest data
     * Called by WorkspaceWatcher when new ghost files are created
     */
    public async refresh() {
        await this.sendGhostFiles();
        await this.sendBranch();
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'dashboard', 'dashboard.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'globals', 'globals.css')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};">
    <link href="${styleUri}" rel="stylesheet">
    <title>MimicFlow Dashboard</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
    }
}
