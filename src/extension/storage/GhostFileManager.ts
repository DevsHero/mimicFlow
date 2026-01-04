import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { GhostFile, GhostFileMetadata } from '../../shared/types/GhostFile';
import { STORAGE_FOLDER, GHOSTS_FOLDER, GHOST_FILE_EXTENSION, INDEX_FILE } from '../../shared/constants/config';

export class GhostFileManager {
    private storageUri: vscode.Uri;
    private ghostsUri: vscode.Uri;
    private sharedUri: vscode.Uri;

    constructor(private context: vscode.ExtensionContext) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        this.storageUri = vscode.Uri.joinPath(workspaceFolder.uri, STORAGE_FOLDER);
        this.ghostsUri = vscode.Uri.joinPath(this.storageUri, GHOSTS_FOLDER);
        this.sharedUri = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode', 'mimicflow-shared');
    }

    async initialize(): Promise<void> {
        try {
            await vscode.workspace.fs.createDirectory(this.storageUri);
            await vscode.workspace.fs.createDirectory(this.ghostsUri);
        } catch (error) {
            // Directory might already exist
        }

        // Ensure local gitignore exists to keep .mimicflow strictly local
        await this.ensureLocalGitignore();
    }

    private async ensureLocalGitignore(): Promise<void> {
        const ignoreUri = vscode.Uri.joinPath(this.storageUri, '.gitignore');
        try {
            await vscode.workspace.fs.readFile(ignoreUri);
            return;
        } catch {
            // Missing -> create
        }

        const content = [
            '# Ignore all content in this folder',
            '*',
            '# Except the ignore file itself',
            '!.gitignore',
            ''
        ].join('\n');

        try {
            await vscode.workspace.fs.writeFile(ignoreUri, Buffer.from(content, 'utf8'));
        } catch {
            // Best-effort; ignore
        }
    }

    async saveGhostFile(ghostFile: GhostFile): Promise<void> {
        await this.initialize();

        const date = new Date(ghostFile.timestamp);
        const dateFolder = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const dateFolderUri = vscode.Uri.joinPath(this.ghostsUri, dateFolder);

        await vscode.workspace.fs.createDirectory(dateFolderUri);

        const fileName = `${path.basename(ghostFile.filePath, path.extname(ghostFile.filePath))}-${ghostFile.actionType}-${ghostFile.id}${GHOST_FILE_EXTENSION}`;
        const fileUri = vscode.Uri.joinPath(dateFolderUri, fileName);

        const content = JSON.stringify(ghostFile, null, 2);
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
    }

    async getAllGhostFiles(): Promise<GhostFileMetadata[]> {
        await this.initialize();

        console.log('[GhostFileManager] getAllGhostFiles called, ghostsUri:', this.ghostsUri.fsPath);
        const byId = new Map<string, GhostFileMetadata>();

        try {
            const dateFolders = await vscode.workspace.fs.readDirectory(this.ghostsUri);

            for (const [folderName, type] of dateFolders) {
                if (type === vscode.FileType.Directory) {
                    const folderUri = vscode.Uri.joinPath(this.ghostsUri, folderName);
                    const files = await vscode.workspace.fs.readDirectory(folderUri);

                    for (const [fileName, fileType] of files) {
                        if (fileType === vscode.FileType.File && fileName.endsWith(GHOST_FILE_EXTENSION)) {
                            const fileUri = vscode.Uri.joinPath(folderUri, fileName);
                            const content = await vscode.workspace.fs.readFile(fileUri);
                            const ghostFile: GhostFile = JSON.parse(content.toString());

                            const source: 'watch' | 'git' = (ghostFile as any).source
                                ? (ghostFile as any).source
                                : (ghostFile.agentName === 'Git History Miner' ? 'git' : 'watch');

                            const branch: string = (ghostFile as any).branch
                                ? String((ghostFile as any).branch)
                                : 'unknown';

                            byId.set(ghostFile.id, {
                                id: ghostFile.id,
                                timestamp: ghostFile.timestamp,
                                filePath: ghostFile.filePath,
                                fileExtension: ghostFile.fileExtension,
                                author: ghostFile.author,
                                agentName: ghostFile.agentName,
                                source,
                                branch,
                                commitHash: ghostFile.commitHash,
                                commitMessage: ghostFile.commitMessage,
                                isShared: false,
                                actionType: ghostFile.actionType,
                                stats: ghostFile.stats
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error reading ghost files:', error);
        }

        // Also scan shared folder (.vscode/mimicflow-shared)
        try {
            const sharedEntries = await vscode.workspace.fs.readDirectory(this.sharedUri);
            for (const [fileName, fileType] of sharedEntries) {
                if (fileType !== vscode.FileType.File || !fileName.endsWith(GHOST_FILE_EXTENSION)) continue;
                const fileUri = vscode.Uri.joinPath(this.sharedUri, fileName);
                const content = await vscode.workspace.fs.readFile(fileUri);
                const ghostFile: GhostFile = JSON.parse(content.toString());

                const source: 'watch' | 'git' = (ghostFile as any).source
                    ? (ghostFile as any).source
                    : (ghostFile.agentName === 'Git History Miner' ? 'git' : 'watch');

                const branch: string = (ghostFile as any).branch
                    ? String((ghostFile as any).branch)
                    : 'unknown';

                byId.set(ghostFile.id, {
                    id: ghostFile.id,
                    timestamp: ghostFile.timestamp,
                    filePath: ghostFile.filePath,
                    fileExtension: ghostFile.fileExtension,
                    author: ghostFile.author,
                    agentName: ghostFile.agentName,
                    source,
                    branch,
                    commitHash: ghostFile.commitHash,
                    commitMessage: ghostFile.commitMessage,
                    isShared: true,
                    actionType: ghostFile.actionType,
                    stats: ghostFile.stats
                });
            }
        } catch {
            // Shared folder might not exist yet
        }

        return Array.from(byId.values()).sort((a, b) => b.timestamp - a.timestamp);
    }

    async getGhostFile(id: string): Promise<GhostFile | null> {
        await this.initialize();

        try {
            const dateFolders = await vscode.workspace.fs.readDirectory(this.ghostsUri);

            for (const [folderName, type] of dateFolders) {
                if (type === vscode.FileType.Directory) {
                    const folderUri = vscode.Uri.joinPath(this.ghostsUri, folderName);
                    const files = await vscode.workspace.fs.readDirectory(folderUri);

                    for (const [fileName, fileType] of files) {
                        if (fileType === vscode.FileType.File && fileName.includes(id)) {
                            const fileUri = vscode.Uri.joinPath(folderUri, fileName);
                            const content = await vscode.workspace.fs.readFile(fileUri);
                            return JSON.parse(content.toString());
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error reading ghost file:', error);
        }

        // Fallback: check shared folder
        try {
            const sharedEntries = await vscode.workspace.fs.readDirectory(this.sharedUri);
            for (const [fileName, fileType] of sharedEntries) {
                if (fileType !== vscode.FileType.File || !fileName.endsWith(GHOST_FILE_EXTENSION)) continue;
                if (!fileName.includes(id)) continue;

                const fileUri = vscode.Uri.joinPath(this.sharedUri, fileName);
                const content = await vscode.workspace.fs.readFile(fileUri);
                return JSON.parse(content.toString());
            }
        } catch {
            // Ignore
        }

        return null;
    }

    async findLocalGhostFileUri(id: string): Promise<vscode.Uri | null> {
        await this.initialize();

        try {
            const dateFolders = await vscode.workspace.fs.readDirectory(this.ghostsUri);
            for (const [folderName, type] of dateFolders) {
                if (type !== vscode.FileType.Directory) continue;
                const folderUri = vscode.Uri.joinPath(this.ghostsUri, folderName);
                const files = await vscode.workspace.fs.readDirectory(folderUri);
                for (const [fileName, fileType] of files) {
                    if (fileType === vscode.FileType.File && fileName.endsWith(GHOST_FILE_EXTENSION) && fileName.includes(id)) {
                        return vscode.Uri.joinPath(folderUri, fileName);
                    }
                }
            }
        } catch {
            // Ignore
        }

        return null;
    }

    async getStoragePath(): Promise<string> {
        return this.storageUri.fsPath;
    }
}
