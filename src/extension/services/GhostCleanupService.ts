import * as path from 'path';
import * as fs from 'fs/promises';
import type { Dirent } from 'fs';
import { GhostFileManager } from '../storage/GhostFileManager';
import { GHOSTS_FOLDER, GHOST_FILE_EXTENSION } from '../../shared/constants/config';

interface GhostFileEntry {
    filePath: string;
    timestamp: number;
}

export class GhostCleanupService {
    constructor(private readonly ghostFileManager: GhostFileManager) { }

    /**
     * Cleanup policy:
     * - Delete ghost files older than 7 days
     * - Keep only the latest 100 ghost files per workspace
     */
    public async run(): Promise<void> {
        const storagePath = await this.ghostFileManager.getStoragePath();
        const ghostsRoot = path.join(storagePath, GHOSTS_FOLDER);

        const now = Date.now();
        const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
        const minTimestamp = now - maxAgeMs;
        const maxCount = 100;

        let entries: GhostFileEntry[] = [];

        try {
            entries = await this.scanGhostFiles(ghostsRoot);
        } catch {
            return;
        }

        if (entries.length === 0) return;

        // 1) Delete by age
        const toDeleteByAge = entries.filter(e => e.timestamp < minTimestamp);
        await Promise.allSettled(toDeleteByAge.map(e => fs.unlink(e.filePath)));

        // Refresh list after age deletion
        entries = await this.scanGhostFiles(ghostsRoot).catch(() => []);
        if (entries.length === 0) return;

        // 2) Delete by count (keep most recent)
        entries.sort((a, b) => b.timestamp - a.timestamp);
        const toDeleteByCount = entries.slice(maxCount);
        await Promise.allSettled(toDeleteByCount.map(e => fs.unlink(e.filePath)));

        // Optional: remove empty date folders
        await this.removeEmptyDirs(ghostsRoot).catch(() => undefined);
    }

    private async scanGhostFiles(rootDir: string): Promise<GhostFileEntry[]> {
        const results: GhostFileEntry[] = [];

        const dirents = await fs.readdir(rootDir, { withFileTypes: true });
        for (const dirent of dirents) {
            if (!dirent.isDirectory()) continue;

            const dateDir = path.join(rootDir, dirent.name);
            let files: Dirent[];
            try {
                files = await fs.readdir(dateDir, { withFileTypes: true });
            } catch {
                continue;
            }

            for (const file of files) {
                if (!file.isFile()) continue;
                if (!file.name.endsWith(GHOST_FILE_EXTENSION)) continue;

                const fullPath = path.join(dateDir, file.name);
                const timestamp = await this.readTimestamp(fullPath);
                results.push({ filePath: fullPath, timestamp });
            }
        }

        return results;
    }

    private async readTimestamp(filePath: string): Promise<number> {
        try {
            const raw = await fs.readFile(filePath, 'utf8');
            const parsed = JSON.parse(raw);
            const ts = typeof parsed?.timestamp === 'number' ? parsed.timestamp : undefined;
            if (typeof ts === 'number' && Number.isFinite(ts)) return ts;
        } catch {
            // fall back
        }

        try {
            const stat = await fs.stat(filePath);
            return stat.mtimeMs;
        } catch {
            return 0;
        }
    }

    private async removeEmptyDirs(rootDir: string): Promise<void> {
        const dirents = await fs.readdir(rootDir, { withFileTypes: true });
        await Promise.allSettled(
            dirents
                .filter(d => d.isDirectory())
                .map(async d => {
                    const full = path.join(rootDir, d.name);
                    const children = await fs.readdir(full);
                    if (children.length === 0) {
                        await fs.rmdir(full);
                    }
                })
        );
    }
}
