import * as vscode from 'vscode';
import { DashboardProvider } from './providers/DashboardProvider';
import { PlayerProvider } from './providers/PlayerProvider';
import { GhostFileManager } from './storage/GhostFileManager';
import { DiffEngine } from './engine/DiffEngine';
import { HistorySyncService } from './services/HistorySyncService';
import { WorkspaceWatcher } from './services/WorkspaceWatcher';
import { GitHistoryMiner } from './services/GitHistoryMiner';
import { GhostCleanupService } from './services/GhostCleanupService';
import { GhostFile } from '../shared/types/GhostFile';
import * as path from 'path';
import { randomUUID } from 'crypto';

export function activate(context: vscode.ExtensionContext) {
    try {
        // Create output channel (don't show by default to avoid UI disruption)
        const outputChannel = vscode.window.createOutputChannel('MimicFlow');
        outputChannel.appendLine('🎬 MimicFlow Active - The Digital Mirror is watching...');

        // Initialize core services
        const ghostFileManager = new GhostFileManager(context);
        const diffEngine = new DiffEngine();
        const historySyncService = new HistorySyncService(context, ghostFileManager);

        // Perform initial workspace sync
        outputChannel.appendLine('[MimicFlow] Starting initial workspace sync...');
        historySyncService.syncWorkspace().then(() => {
            outputChannel.appendLine('[MimicFlow] ✅ Initial sync complete');
        }).catch(error => {
            outputChannel.appendLine(`[MimicFlow] ⚠️ Sync failed: ${error}`);
        });

        // Register Dashboard Provider
        const dashboardProvider = new DashboardProvider(context.extensionUri, ghostFileManager);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('mimicflow.dashboard', dashboardProvider)
        );

        // Detect branch switching by watching .git/HEAD
        const workspaceFolders = vscode.workspace.workspaceFolders || [];
        if (workspaceFolders.length > 0) {
            let refreshTimer: NodeJS.Timeout | undefined;

            const scheduleRefresh = () => {
                if (refreshTimer) clearTimeout(refreshTimer);
                refreshTimer = setTimeout(() => {
                    dashboardProvider.refresh();
                }, 250);
            };

            for (const folder of workspaceFolders) {
                const pattern = new vscode.RelativePattern(folder, '.git/HEAD');
                const headWatcher = vscode.workspace.createFileSystemWatcher(pattern);
                headWatcher.onDidChange(scheduleRefresh);
                headWatcher.onDidCreate(scheduleRefresh);
                headWatcher.onDidDelete(scheduleRefresh);
                context.subscriptions.push(headWatcher);
            }
        }

        // Register Player Provider
        const playerProvider = new PlayerProvider(context.extensionUri, ghostFileManager);

        // Initialize GitHistoryMiner for retrospective analysis
        const gitHistoryMiner = new GitHistoryMiner(
            ghostFileManager,
            diffEngine,
            historySyncService,
            outputChannel
        );

        // Mine git history on startup (async, non-blocking)
        gitHistoryMiner.mineHistory().then(count => {
            outputChannel.appendLine(`[MimicFlow] ⛏️  Mined ${count} ghost files from git history`);
            // Refresh dashboard after mining
            dashboardProvider.refresh();
        }).catch(error => {
            outputChannel.appendLine(`[MimicFlow] ⚠️  Mining failed: ${error}`);
        });

        // Initialize WorkspaceWatcher for auto-capture
        const workspaceWatcher = new WorkspaceWatcher(
            context,
            ghostFileManager,
            diffEngine,
            historySyncService,
            () => {
                // Refresh callback
                dashboardProvider.refresh();
            }
        );
        context.subscriptions.push(workspaceWatcher);

        outputChannel.appendLine('[MimicFlow] 👁️  Auto-capture enabled - watching for file changes...');

        // Storage cleanup (low priority)
        const cleanupService = new GhostCleanupService(ghostFileManager);
        setTimeout(() => {
            cleanupService.run().catch((error) => {
                outputChannel.appendLine(`[MimicFlow] ⚠️  Cleanup failed: ${error}`);
            });
        }, 10_000);

        // Register Commands
        context.subscriptions.push(
            vscode.commands.registerCommand('mimicflow.openDashboard', () => {
                vscode.commands.executeCommand('workbench.view.extension.mimicflow');
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('mimicflow.captureChange', async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showWarningMessage('No active editor found');
                    return;
                }

                // TODO: Implement capture logic
                vscode.window.showInformationMessage('Capture feature coming soon!');
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('mimicflow.openPlayer', (ghostFileId: string) => {
                playerProvider.openPlayer(ghostFileId);
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('mimicflow.openPlaylist', (ghostFileIds: string[]) => {
                playerProvider.openPlaylist(ghostFileIds);
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('mimicflow.shareGhostFile', async (ghostFile: unknown) => {
                try {
                    const ghostFileId = typeof ghostFile === 'string'
                        ? ghostFile
                        : (ghostFile && typeof ghostFile === 'object' && 'id' in ghostFile)
                            ? String((ghostFile as any).id)
                            : '';

                    if (!ghostFileId) {
                        vscode.window.showErrorMessage('No ghost file provided to share');
                        return;
                    }

                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                    if (!workspaceFolder) {
                        vscode.window.showErrorMessage('No workspace folder found');
                        return;
                    }

                    const sourceUri = await ghostFileManager.findLocalGhostFileUri(String(ghostFileId));
                    if (!sourceUri) {
                        vscode.window.showErrorMessage(`Ghost file not found: ${ghostFileId}`);
                        return;
                    }

                    const targetDir = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode', 'mimicflow-shared');
                    await vscode.workspace.fs.createDirectory(targetDir);

                    const fileName = path.posix.basename(sourceUri.path);
                    const targetUri = vscode.Uri.joinPath(targetDir, fileName);

                    await vscode.workspace.fs.copy(sourceUri, targetUri, { overwrite: true });

                    vscode.window.showInformationMessage('Animation shared to team folder!');
                    await dashboardProvider.refresh();
                } catch (error) {
                    vscode.window.showErrorMessage(`Share failed: ${error}`);
                }
            })
        );

        // TEST COMMAND: Demonstrate DiffEngine and GhostFileManager
        context.subscriptions.push(
            vscode.commands.registerCommand('mimicflow.triggerTest', async () => {
                try {
                    // Hardcoded test strings
                    const originalContent = `const a = 1;\nconst b = 2;\nfunction hello() {\n  console.log('old');\n}`;
                    const newContent = `const a = 2;\nconst b = 3;\nfunction hello() {\n  console.log('new world');\n  return true;\n}`;

                    // Generate actions using DiffEngine
                    const actions = diffEngine.computeChanges(originalContent, newContent);
                    const stats = diffEngine.calculateStats(originalContent, newContent);

                    // Get git author info (fallback to system user)
                    const gitExtension = vscode.extensions.getExtension('vscode.git');
                    let author = 'Developer';

                    if (gitExtension) {
                        const git = gitExtension.exports.getAPI(1);
                        if (git.repositories.length > 0) {
                            const config = git.repositories[0].state.HEAD?.commit?.author;
                            if (config) {
                                author = config.name || 'Developer';
                            }
                        }
                    }

                    // Get current branch (best-effort)
                    let branch = 'unknown';
                    try {
                        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                        if (workspaceFolder) {
                            const cp = await import('child_process');
                            const util = await import('util');
                            const execAsync = util.promisify(cp.exec);
                            const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
                                cwd: workspaceFolder.uri.fsPath,
                                encoding: 'utf8'
                            });
                            branch = String(stdout || '').trim() || 'unknown';
                        }
                    } catch {
                        branch = 'unknown';
                    }

                    // Create GhostFile
                    const ghostFile: GhostFile = {
                        id: randomUUID(),
                        timestamp: Date.now(),
                        filePath: 'test/example.ts',
                        fileExtension: '.ts',
                        author: author,
                        agentName: 'MimicFlow',
                        source: 'watch',
                        branch,
                        actionType: 'edit',
                        stats: stats,
                        originalContent: originalContent,
                        newContent: newContent,
                        actions: actions
                    };

                    // Check for duplicates before saving
                    const shouldCreate = await historySyncService.shouldCreateGhostFile(
                        ghostFile.filePath,
                        ghostFile.newContent
                    );

                    if (!shouldCreate) {
                        vscode.window.showInformationMessage('⚠️ Content unchanged - skipping duplicate ghost file');
                        return;
                    }

                    // Save to disk
                    await ghostFileManager.saveGhostFile(ghostFile);

                    // Register with sync service
                    await historySyncService.registerGhostFile(ghostFile);

                    // Get workspace folder for display
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                    const relativePath = workspaceFolder
                        ? path.relative(workspaceFolder.uri.fsPath, await ghostFileManager.getStoragePath())
                        : '.mimicflow';

                    // Show success message
                    vscode.window.showInformationMessage(
                        `✅ Ghost File Generated!\n` +
                        `ID: ${ghostFile.id.slice(0, 8)}\n` +
                        `Actions: ${actions.length}\n` +
                        `Stats: +${stats.linesAdded} -${stats.linesDeleted}\n` +
                        `Path: ${relativePath}/ghosts/`
                    );

                    // Refresh dashboard
                    vscode.commands.executeCommand('mimicflow.openDashboard');

                } catch (error) {
                    vscode.window.showErrorMessage(`Test failed: ${error}`);
                    console.error('Test command error:', error);
                }
            })
        );

        // Command to clear sync state (useful for testing/debugging)
        context.subscriptions.push(
            vscode.commands.registerCommand('mimicflow.clearSyncState', async () => {
                const confirm = await vscode.window.showWarningMessage(
                    'Clear MimicFlow sync state? This will reset deduplication tracking.',
                    'Clear',
                    'Cancel'
                );

                if (confirm === 'Clear') {
                    await historySyncService.clearSyncState();
                    vscode.window.showInformationMessage('✅ MimicFlow sync state cleared');
                }
            })
        );

        outputChannel.appendLine('[MimicFlow] ✅ Extension activated successfully');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`MimicFlow failed to activate: ${errorMessage}`);
        console.error('[MimicFlow] Activation error:', error);
        throw error;
    }
}

export function deactivate() {
    console.log('MimicFlow extension deactivated');
}
