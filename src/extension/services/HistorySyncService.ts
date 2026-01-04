import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { GhostFileManager } from '../storage/GhostFileManager';
import { GhostFile, GhostFileMetadata } from '../../shared/types/GhostFile';

interface SyncState {
    lastSyncTimestamp: number;
    contentHashes: Map<string, string>; // filePath -> hash of latest content
}

export class HistorySyncService {
    private static readonly SYNC_STATE_KEY = 'mimicflow.syncState';
    private syncState: SyncState;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly ghostFileManager: GhostFileManager
    ) {
        // Load sync state from global storage
        const savedState = this.context.globalState.get<{ lastSyncTimestamp: number; contentHashes: [string, string][] }>(
            HistorySyncService.SYNC_STATE_KEY
        );

        this.syncState = {
            lastSyncTimestamp: savedState?.lastSyncTimestamp || 0,
            contentHashes: new Map(savedState?.contentHashes || [])
        };
    }

    /**
     * Main sync entry point - called on extension activation
     * Scans workspace for .ghost files and processes them efficiently
     */
    async syncWorkspace(): Promise<void> {
        try {
            const startTime = Date.now();
            console.log('[MimicFlow] Starting workspace sync...');

            // Get all ghost files
            const allFiles = await this.ghostFileManager.getAllGhostFiles();

            if (allFiles.length === 0) {
                console.log('[MimicFlow] No ghost files found. Sync complete.');
                return;
            }

            // Filter files modified after last sync
            const newFiles = allFiles.filter(file =>
                file.timestamp > this.syncState.lastSyncTimestamp
            );

            console.log(`[MimicFlow] Found ${newFiles.length} new/modified files out of ${allFiles.length} total`);

            // Process files in parallel (optimized for M4)
            const batchSize = 10; // Process 10 files at a time
            for (let i = 0; i < newFiles.length; i += batchSize) {
                const batch = newFiles.slice(i, i + batchSize);
                await Promise.all(batch.map(metadata => this.processGhostFile(metadata)));
            }

            // Update sync timestamp
            this.syncState.lastSyncTimestamp = Date.now();
            await this.saveSyncState();

            const duration = Date.now() - startTime;
            console.log(`[MimicFlow] Workspace sync complete in ${duration}ms`);

        } catch (error) {
            console.error('[MimicFlow] Sync failed:', error);
            vscode.window.showErrorMessage(`MimicFlow sync failed: ${error}`);
        }
    }

    /**
     * Process a single ghost file - check for duplicates using content hashing
     */
    private async processGhostFile(metadata: GhostFileMetadata): Promise<void> {
        try {
            // Load full ghost file
            const ghostFile = await this.ghostFileManager.getGhostFile(metadata.id);
            if (!ghostFile) {
                return;
            }

            // Calculate content hash
            const contentHash = this.calculateContentHash(ghostFile.newContent);

            // Check if we already have this exact content for this file
            const existingHash = this.syncState.contentHashes.get(ghostFile.filePath);

            if (existingHash === contentHash) {
                console.log(`[MimicFlow] Skipping duplicate: ${ghostFile.filePath} (hash: ${contentHash.slice(0, 8)})`);
                return; // Skip - this is a duplicate
            }

            // Update hash map with new content
            this.syncState.contentHashes.set(ghostFile.filePath, contentHash);

            console.log(`[MimicFlow] Processed: ${ghostFile.filePath} (hash: ${contentHash.slice(0, 8)})`);

        } catch (error) {
            console.error(`[MimicFlow] Error processing ghost file ${metadata.id}:`, error);
        }
    }

    /**
     * Calculate MD5 hash of content for deduplication
     */
    private calculateContentHash(content: string): string {
        return crypto.createHash('md5').update(content).digest('hex');
    }

    /**
     * Check if content would be a duplicate before creating a new ghost file
     * Returns true if this content is new, false if it's a duplicate
     */
    async shouldCreateGhostFile(filePath: string, newContent: string): Promise<boolean> {
        const contentHash = this.calculateContentHash(newContent);
        const existingHash = this.syncState.contentHashes.get(filePath);

        if (existingHash === contentHash) {
            console.log(`[MimicFlow] Content unchanged for ${filePath}, skipping ghost file creation`);
            return false;
        }

        return true;
    }

    /**
     * Register a new ghost file in the sync system
     * Call this after successfully creating a new ghost file
     */
    async registerGhostFile(ghostFile: GhostFile): Promise<void> {
        const contentHash = this.calculateContentHash(ghostFile.newContent);
        this.syncState.contentHashes.set(ghostFile.filePath, contentHash);
        await this.saveSyncState();
    }

    /**
     * Persist sync state to VS Code global storage
     */
    private async saveSyncState(): Promise<void> {
        await this.context.globalState.update(HistorySyncService.SYNC_STATE_KEY, {
            lastSyncTimestamp: this.syncState.lastSyncTimestamp,
            contentHashes: Array.from(this.syncState.contentHashes.entries())
        });
    }

    /**
     * Clear all sync state (useful for debugging/testing)
     */
    async clearSyncState(): Promise<void> {
        this.syncState = {
            lastSyncTimestamp: 0,
            contentHashes: new Map()
        };
        await this.saveSyncState();
        console.log('[MimicFlow] Sync state cleared');
    }
}
