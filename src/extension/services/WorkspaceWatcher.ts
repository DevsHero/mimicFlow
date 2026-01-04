import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GhostFileManager } from '../storage/GhostFileManager';
import { DiffEngine } from '../engine/DiffEngine';
import { HistorySyncService } from './HistorySyncService';
import { GhostFile } from '../../shared/types/GhostFile';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

export class WorkspaceWatcher {
    private lastSavedContent: Map<string, string> = new Map();
    private disposables: vscode.Disposable[] = [];
    private outputChannel: vscode.OutputChannel;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly ghostFileManager: GhostFileManager,
        private readonly diffEngine: DiffEngine,
        private readonly historySyncService: HistorySyncService,
        private readonly onRefresh: () => void
    ) {
        this.outputChannel = vscode.window.createOutputChannel('MimicFlow');
        this.initialize();
    }

    private initialize() {
        // Listen to file save events
        const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
            await this.handleFileSave(document);
        });

        this.disposables.push(saveListener);
        this.outputChannel.appendLine('[MimicFlow] Workspace watcher initialized');
    }

    private async handleFileSave(document: vscode.TextDocument) {
        try {
            const filePath = document.uri.fsPath;

            // Filter out unwanted files
            if (this.shouldIgnoreFile(filePath)) {
                return;
            }

            const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
            if (!workspaceFolder) {
                return;
            }

            const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);
            const currentContent = document.getText();

            // Get previous content
            const previousContent = await this.getPreviousContent(filePath, relativePath, workspaceFolder.uri.fsPath);

            if (previousContent === null) {
                this.outputChannel.appendLine(`[MimicFlow] Skipping ${relativePath} - could not determine previous state`);
                return;
            }

            // Skip if content hasn't changed
            if (previousContent === currentContent) {
                this.outputChannel.appendLine(`[MimicFlow] Skipping ${relativePath} - no changes detected`);
                this.lastSavedContent.set(filePath, currentContent);
                return;
            }

            // Check for duplicates using sync service
            const shouldCreate = await this.historySyncService.shouldCreateGhostFile(relativePath, currentContent);
            if (!shouldCreate) {
                this.outputChannel.appendLine(`[MimicFlow] Skipping ${relativePath} - duplicate content`);
                this.lastSavedContent.set(filePath, currentContent);
                return;
            }

            // Generate ghost file
            await this.captureChange(relativePath, previousContent, currentContent, document.uri);

            // Update cache
            this.lastSavedContent.set(filePath, currentContent);

        } catch (error) {
            this.outputChannel.appendLine(`[MimicFlow] Error handling file save: ${error}`);
            console.error('[MimicFlow] Error:', error);
        }
    }

    private shouldIgnoreFile(filePath: string): boolean {
        const ignoredPatterns = [
            '.git',
            '.mimicflow',
            'node_modules',
            '.vscode',
            'dist',
            'build',
            'out',
            '.next',
            'coverage',
            '.DS_Store'
        ];

        const normalizedPath = filePath.replace(/\\/g, '/');
        return ignoredPatterns.some(pattern => normalizedPath.includes(`/${pattern}/`) || normalizedPath.endsWith(`/${pattern}`));
    }

    private async getPreviousContent(filePath: string, relativePath: string, workspacePath: string): Promise<string | null> {
        // Check cache first
        if (this.lastSavedContent.has(filePath)) {
            return this.lastSavedContent.get(filePath)!;
        }

        // Try to get from git HEAD
        try {
            const { stdout } = await execAsync(`git show HEAD:"${relativePath}"`, {
                cwd: workspacePath,
                encoding: 'utf8'
            });
            return stdout;
        } catch (error) {
            // File might be new or not in git
            // Return empty string to treat as new file
            return '';
        }
    }

    private async captureChange(
        relativePath: string,
        originalContent: string,
        newContent: string,
        fileUri: vscode.Uri
    ) {
        try {
            // Generate actions using DiffEngine
            const actions = this.diffEngine.computeChanges(originalContent, newContent);
            const stats = this.diffEngine.calculateStats(originalContent, newContent);

            // Determine action type
            const actionType = originalContent === '' ? 'create' : 'edit';

            const branch = await this.getCurrentBranch();
            const author = await this.getGitAuthorName();
            const commitMessage = await this.getLastCommitMessage();

            // Create ghost file
            const ghostFile: GhostFile = {
                id: randomUUID(),
                timestamp: Date.now(),
                filePath: relativePath,
                fileExtension: path.extname(relativePath),
                author: author,
                agentName: 'MimicFlow',
                source: 'watch',
                branch,
                commitMessage,
                actionType: actionType,
                stats: stats,
                originalContent: originalContent,
                newContent: newContent,
                actions: actions
            };

            // Save ghost file
            await this.ghostFileManager.saveGhostFile(ghostFile);

            // Register with sync service
            await this.historySyncService.registerGhostFile(ghostFile);

            this.outputChannel.appendLine(
                `[MimicFlow] ✅ Captured: ${relativePath} (+${stats.linesAdded}/-${stats.linesDeleted})`
            );

            // Refresh dashboard
            this.onRefresh();

            // Show notification (optional, can be disabled)
            const config = vscode.workspace.getConfiguration('mimicflow');
            if (config.get('showCaptureNotifications', false)) {
                vscode.window.showInformationMessage(
                    `MimicFlow: Captured changes to ${path.basename(relativePath)}`
                );
            }

        } catch (error) {
            this.outputChannel.appendLine(`[MimicFlow] ❌ Failed to capture ${relativePath}: ${error}`);
            console.error('[MimicFlow] Capture error:', error);
        }
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

    private async getGitAuthorName(): Promise<string> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return 'Developer';

        try {
            const { stdout } = await execAsync('git config user.name', {
                cwd: workspaceFolder.uri.fsPath,
                encoding: 'utf8'
            });
            const name = String(stdout || '').trim();
            return name || 'Developer';
        } catch {
            return 'Developer';
        }
    }

    private async getLastCommitMessage(): Promise<string | undefined> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return undefined;

        try {
            const { stdout } = await execAsync('git log -1 --pretty=%s', {
                cwd: workspaceFolder.uri.fsPath,
                encoding: 'utf8'
            });
            const message = String(stdout || '').trim();
            return message || undefined;
        } catch {
            return undefined;
        }
    }

    public dispose() {
        this.disposables.forEach(d => d.dispose());
        this.outputChannel.dispose();
    }
}
