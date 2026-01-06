import * as vscode from 'vscode';
import * as cp from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { GhostFileManager } from '../storage/GhostFileManager';
import { DiffEngine } from '../engine/DiffEngine';
import { HistorySyncService } from './HistorySyncService';
import { IgnoreService } from './IgnoreService';
import { GhostFile } from '../../shared/types/GhostFile';

const execAsync = promisify(cp.exec);

interface GitCommit {
    hash: string;
    author: string;
    timestamp: Date;
    message: string;
    files: GitFileChange[];
}

interface GitFileChange {
    status: 'M' | 'A' | 'D';
    path: string;
}

export class GitHistoryMiner {
    private ignoreService: IgnoreService;

    constructor(
        private readonly ghostFileManager: GhostFileManager,
        private readonly diffEngine: DiffEngine,
        private readonly historySyncService: HistorySyncService,
        private readonly outputChannel: vscode.OutputChannel
    ) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        this.ignoreService = new IgnoreService(workspaceFolder);
    }

    /**
     * Mine git history and generate ghost files for past changes
     * Only runs if .mimicflow folder is empty
     */
    async mineHistory(): Promise<number> {
        this.outputChannel.appendLine('🔍 Checking for existing ghost files...');

        // Check if we already have ghost files
        const existingFiles = await this.ghostFileManager.getAllGhostFiles();
        if (existingFiles.length > 0) {
            this.outputChannel.appendLine(`✅ Found ${existingFiles.length} existing ghost files. Skipping mining.`);
            return existingFiles.length;
        }

        this.outputChannel.appendLine('⛏️  Mining git history (last 20 commits)...');

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this.outputChannel.appendLine('❌ No workspace folder found');
            return 0;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;

        const branch = await this.getCurrentBranch(workspaceRoot);

        try {
            // Get last 20 commits with file changes
            const commits = await this.getCommitHistory(workspaceRoot, 20);
            this.outputChannel.appendLine(`📜 Found ${commits.length} commits to process`);

            // Process commits in parallel (batches of 5 for M4 optimization)
            let totalGhosts = 0;
            const batchSize = 5;

            for (let i = 0; i < commits.length; i += batchSize) {
                const batch = commits.slice(i, i + batchSize);
                this.outputChannel.appendLine(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(commits.length / batchSize)}...`);

                const results = await Promise.allSettled(
                    batch.map(commit => this.processCommit(commit, workspaceRoot, branch))
                );

                const successful = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<number>[];
                const ghostCount = successful.reduce((sum, r) => sum + r.value, 0);
                totalGhosts += ghostCount;

                const failed = results.filter(r => r.status === 'rejected').length;
                if (failed > 0) {
                    this.outputChannel.appendLine(`⚠️  ${failed} commits failed in this batch`);
                }
            }

            this.outputChannel.appendLine(`✨ Mining complete! Generated ${totalGhosts} ghost files from history`);
            return totalGhosts;

        } catch (error) {
            this.outputChannel.appendLine(`❌ Git mining failed: ${error}`);
            return 0;
        }
    }

    /**
     * Get git commit history with file changes
     */
    private async getCommitHistory(cwd: string, limit: number): Promise<GitCommit[]> {
        const format = '--pretty=format:%H|%an|%at|%s';
        const command = `git log ${format} --name-status -n ${limit}`;

        const { stdout } = await execAsync(command, { cwd, maxBuffer: 10 * 1024 * 1024 });

        const commits: GitCommit[] = [];
        const lines = stdout.split('\n');

        let currentCommit: GitCommit | null = null;

        for (const line of lines) {
            if (!line.trim()) continue;

            if (line.includes('|')) {
                // Commit header line
                if (currentCommit) {
                    commits.push(currentCommit);
                }

                const [hash, author, timestamp, ...messageParts] = line.split('|');
                currentCommit = {
                    hash,
                    author,
                    timestamp: new Date(parseInt(timestamp) * 1000),
                    message: messageParts.join('|'),
                    files: []
                };
            } else if (currentCommit && line.match(/^[MAD]\s+/)) {
                // File change line
                const [status, filePath] = line.split(/\s+/);
                if (this.shouldProcessFile(filePath)) {
                    currentCommit.files.push({
                        status: status as 'M' | 'A' | 'D',
                        path: filePath
                    });
                }
            }
        }

        if (currentCommit) {
            commits.push(currentCommit);
        }

        return commits;
    }

    /**
     * Process a single commit and generate ghost files
     */
    private async processCommit(commit: GitCommit, workspaceRoot: string, branch: string): Promise<number> {
        let ghostCount = 0;

        for (const fileChange of commit.files) {
            try {
                // Only process modifications (not additions or deletions)
                if (fileChange.status !== 'M') continue;

                const relativePath = fileChange.path;

                // Filter out ignored files
                if (this.ignoreService.shouldIgnore(relativePath)) {
                    continue;
                }

                // Get content before and after
                const oldContent = await this.getFileContentAtCommit(
                    workspaceRoot,
                    relativePath,
                    `${commit.hash}~1`
                );
                const newContent = await this.getFileContentAtCommit(
                    workspaceRoot,
                    relativePath,
                    commit.hash
                );

                if (!oldContent || !newContent || oldContent === newContent) {
                    continue;
                }

                // Check deduplication
                if (!await this.historySyncService.shouldCreateGhostFile(relativePath, newContent)) {
                    continue;
                }

                // Generate diff actions
                const actions = this.diffEngine.computeChanges(oldContent, newContent);
                if (actions.length === 0) continue;

                const stats = this.diffEngine.calculateStats(oldContent, newContent);

                // Create ghost file with historical timestamp
                const ghostFile: GhostFile = {
                    id: require('crypto').randomUUID(),
                    timestamp: commit.timestamp.getTime(),
                    filePath: relativePath,
                    fileExtension: path.extname(relativePath),
                    author: commit.author,
                    agentName: 'Git History Miner',
                    source: 'git',
                    branch,
                    commitHash: commit.hash,
                    commitMessage: commit.message,
                    actionType: 'edit',
                    originalContent: oldContent,
                    newContent: newContent,
                    actions: actions,
                    stats: stats
                };

                await this.ghostFileManager.saveGhostFile(ghostFile);

                // Register with sync service
                await this.historySyncService.registerGhostFile(ghostFile);
                ghostCount++;

            } catch (error) {
                this.outputChannel.appendLine(`⚠️  Failed to process ${fileChange.path}: ${error}`);
            }
        }

        return ghostCount;
    }

    private async getCurrentBranch(cwd: string): Promise<string> {
        try {
            const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
                cwd,
                encoding: 'utf8'
            });
            const branch = String(stdout || '').trim();
            return branch || 'unknown';
        } catch {
            return 'unknown';
        }
    }

    /**
     * Get file content at specific commit
     */
    private async getFileContentAtCommit(
        cwd: string,
        filePath: string,
        commitRef: string
    ): Promise<string | null> {
        try {
            const command = `git show "${commitRef}:${filePath}"`;
            const { stdout } = await execAsync(command, { cwd, maxBuffer: 5 * 1024 * 1024 });
            return stdout;
        } catch (error) {
            // File might not exist at this commit
            return null;
        }
    }

    /**
     * Check if file should be processed
     */
    private shouldProcessFile(filePath: string): boolean {
        const ignored = [
            /node_modules/,
            /\.git\//,
            /dist\//,
            /build\//,
            /out\//,
            /\.mimicflow\//,
            /package-lock\.json$/,
            /yarn\.lock$/,
            /pnpm-lock\.yaml$/,
            /\.min\.js$/,
            /\.map$/,
            /\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/
        ];

        return !ignored.some(pattern => pattern.test(filePath));
    }
}
