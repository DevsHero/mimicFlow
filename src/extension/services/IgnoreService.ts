import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import ignore from 'ignore';

/**
 * Service to handle .mimicignore file support
 * Uses the same syntax as .gitignore to exclude files from history capture
 */
export class IgnoreService {
    private ig: ReturnType<typeof ignore>;
    private workspaceRoot: string | undefined;

    constructor(workspaceRoot?: string) {
        this.ig = ignore();
        this.workspaceRoot = workspaceRoot;
        this.loadIgnoreRules();
    }

    /**
     * Load ignore rules from .mimicignore and apply defaults
     */
    private loadIgnoreRules(): void {
        // Default ignore patterns (always applied)
        const defaultIgnores = [
            '.git/**',
            '.mimicflow/**',
            '.mimicignore',
            'node_modules/**',
            'dist/**',
            'out/**',
            'build/**',
            '.next/**',
            '.vscode/**',
            '*.lock',
            'package-lock.json',
            'yarn.lock',
            'pnpm-lock.yaml',
            '*.png',
            '*.jpg',
            '*.jpeg',
            '*.gif',
            '*.svg',
            '*.ico',
            '*.woff',
            '*.woff2',
            '*.ttf',
            '*.eot',
            '*.mp4',
            '*.mp3',
            '*.mov',
            '*.avi',
            '*.zip',
            '*.tar',
            '*.gz',
            '*.pdf',
            '*.exe',
            '*.dll',
            '*.so',
            '*.dylib'
        ];

        // Add default ignores
        this.ig.add(defaultIgnores);

        // Try to load .mimicignore from workspace root
        if (!this.workspaceRoot) {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return;
            }
            this.workspaceRoot = workspaceFolders[0].uri.fsPath;
        }

        const mimicignorePath = path.join(this.workspaceRoot, '.mimicignore');

        if (fs.existsSync(mimicignorePath)) {
            try {
                const content = fs.readFileSync(mimicignorePath, 'utf-8');
                this.ig.add(content);
                console.log('[IgnoreService] Loaded .mimicignore from workspace');
            } catch (error) {
                console.error('[IgnoreService] Failed to read .mimicignore:', error);
            }
        }
    }

    /**
     * Check if a file path should be ignored
     * @param relativePath Relative path from workspace root
     * @returns true if the file should be ignored
     */
    shouldIgnore(relativePath: string): boolean {
        if (!this.workspaceRoot) {
            return false;
        }

        // Reject paths outside workspace (starting with ..) as ignore package doesn't support them
        if (relativePath.startsWith('..')) {
            console.warn(`[IgnoreService] Invalid path outside workspace: ${relativePath}`);
            return false; // Don't ignore, let caller handle it
        }

        // Normalize path separators to forward slashes (ignore package uses forward slashes)
        const normalizedPath = relativePath.replace(/\\/g, '/');

        // Check if ignored
        const isIgnored = this.ig.ignores(normalizedPath);

        if (isIgnored) {
            console.log(`[IgnoreService] ✅ Ignoring file: ${normalizedPath}`);
        } else {
            console.log(`[IgnoreService] ❌ NOT ignoring: ${normalizedPath}`);
        }

        return isIgnored;
    }

    /**
     * Reload ignore rules (useful when .mimicignore changes)
     */
    reload(): void {
        this.ig = ignore();
        this.loadIgnoreRules();
        console.log('[IgnoreService] Reloaded ignore rules');
    }
}
