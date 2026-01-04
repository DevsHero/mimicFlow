import { GhostAction } from './GhostAction';

export interface GhostFile {
    id: string;                    // UUID
    timestamp: number;             // Unix timestamp
    filePath: string;              // Relative to workspace
    fileExtension: string;         // .ts, .rs, etc.
    author?: string;               // From git config
    agentName: string;             // 'MimicFlow' for now
    source: 'watch' | 'git';        // How this record was created
    branch: string;                 // Git branch name at capture time
    commitHash?: string;           // Tagged retrospectively
    commitMessage?: string;
    actionType: 'edit' | 'create' | 'delete';
    stats: {
        linesAdded: number;
        linesDeleted: number;
        charsAdded: number;
        charsDeleted: number;
    };
    originalContent: string;       // Before state
    newContent: string;            // After state
    actions: GhostAction[];        // Playback sequence
}

export interface GhostFileMetadata {
    id: string;
    timestamp: number;
    filePath: string;
    fileExtension: string;
    author?: string;
    agentName: string;
    source: 'watch' | 'git';
    branch: string;
    commitHash?: string;
    commitMessage?: string;
    isShared?: boolean;
    actionType: 'edit' | 'create' | 'delete';
    stats: {
        linesAdded: number;
        linesDeleted: number;
        charsAdded: number;
        charsDeleted: number;
    };
}
