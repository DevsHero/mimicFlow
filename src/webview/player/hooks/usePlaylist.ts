import { useState, useEffect, useRef, useMemo } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { GhostFile } from '@shared/types/GhostFile';

interface PlaylistState {
    queue: GhostFile[];
    activeIndex: number;
    models: Map<string, MonacoEditor.ITextModel>;
}

export const usePlaylist = (
    editor: MonacoEditor.IStandaloneCodeEditor | null,
    monaco: typeof import('monaco-editor') | null
) => {
    const [playlist, setPlaylist] = useState<PlaylistState>({
        queue: [],
        activeIndex: 0,
        models: new Map()
    });

    const modelsRef = useRef<Map<string, MonacoEditor.ITextModel>>(new Map());

    // Cleanup models on unmount
    useEffect(() => {
        return () => {
            modelsRef.current.forEach(model => {
                model.dispose();
            });
            modelsRef.current.clear();
        };
    }, []);

    /**
     * Load a playlist of ghost files
     */
    const loadPlaylist = (files: GhostFile[], startIndex: number = 0) => {
        if (!editor || !monaco) return;

        console.log('[usePlaylist] Loading playlist with', files.length, 'files');

        // Dispose old models
        modelsRef.current.forEach(model => {
            model.dispose();
        });
        modelsRef.current.clear();

        // Create models for each file
        const newModels = new Map<string, MonacoEditor.ITextModel>();
        files.forEach((file, index) => {
            const uri = monaco.Uri.parse(`inmemory://playlist/${index}/${file.filePath}`);
            const language = getLanguageFromPath(file.filePath);

            const model = monaco.editor.createModel(
                file.originalContent,
                language,
                uri
            );

            newModels.set(file.id, model);
            console.log(`[usePlaylist] Created model for ${file.filePath}`);
        });

        modelsRef.current = newModels;

        // Set initial model
        const firstFile = files[startIndex];
        const firstModel = newModels.get(firstFile.id);
        if (firstModel) {
            editor.setModel(firstModel);
            console.log('[usePlaylist] Set initial model to index', startIndex);
        }

        setPlaylist({
            queue: files,
            activeIndex: startIndex,
            models: newModels
        });
    };

    /**
     * Switch to a specific file in the playlist
     */
    const switchToFile = (index: number) => {
        if (!editor || index < 0 || index >= playlist.queue.length) return;

        const targetFile = playlist.queue[index];
        const targetModel = modelsRef.current.get(targetFile.id);

        if (targetModel) {
            console.log('[usePlaylist] Switching to file:', targetFile.filePath);
            editor.setModel(targetModel);

            // Reset to original content
            targetModel.setValue(targetFile.originalContent);

            // Reset cursor position
            editor.setPosition({ lineNumber: 1, column: 1 });
            editor.revealLineInCenter(1);

            setPlaylist(prev => ({
                ...prev,
                activeIndex: index
            }));
        }
    };

    /**
     * Advance to next file in playlist
     */
    const nextFile = () => {
        const nextIndex = playlist.activeIndex + 1;
        if (nextIndex < playlist.queue.length) {
            console.log('[usePlaylist] Advancing to next file, index:', nextIndex);
            switchToFile(nextIndex);
            return true;
        }
        console.log('[usePlaylist] Reached end of playlist');
        return false;
    };

    /**
     * Go to previous file in playlist
     */
    const previousFile = () => {
        const prevIndex = playlist.activeIndex - 1;
        if (prevIndex >= 0) {
            switchToFile(prevIndex);
            return true;
        }
        return false;
    };

    /**
     * Get current active ghost file
     */
    const getCurrentFile = (): GhostFile | null => {
        if (playlist.queue.length === 0) return null;
        return playlist.queue[playlist.activeIndex] || null;
    };

    /**
     * Check if there's a next file
     */
    const hasNext = (): boolean => {
        return playlist.activeIndex < playlist.queue.length - 1;
    };

    /**
     * Check if there's a previous file
     */
    const hasPrevious = (): boolean => {
        return playlist.activeIndex > 0;
    };

    // Memoize current file to ensure proper React updates
    const currentFile = useMemo(() => {
        if (playlist.queue.length === 0) return null;
        return playlist.queue[playlist.activeIndex] || null;
    }, [playlist.queue, playlist.activeIndex]);

    return {
        playlist: playlist.queue,
        activeIndex: playlist.activeIndex,
        currentFile,
        loadPlaylist,
        switchToFile,
        nextFile,
        previousFile,
        hasNext: hasNext(),
        hasPrevious: hasPrevious()
    };
};

/**
 * Helper function to determine language from file path
 */
function getLanguageFromPath(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
        'ts': 'typescript',
        'tsx': 'typescript',
        'js': 'javascript',
        'jsx': 'javascript',
        'py': 'python',
        'rs': 'rust',
        'go': 'go',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'cs': 'csharp',
        'rb': 'ruby',
        'php': 'php',
        'swift': 'swift',
        'kt': 'kotlin',
        'md': 'markdown',
        'json': 'json',
        'yaml': 'yaml',
        'yml': 'yaml',
        'xml': 'xml',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'sql': 'sql',
        'sh': 'shell',
        'bash': 'shell',
        'dockerfile': 'dockerfile'
    };
    return languageMap[ext || ''] || 'plaintext';
}
