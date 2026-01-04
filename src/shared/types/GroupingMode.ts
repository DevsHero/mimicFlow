export type GroupingMode = 'date' | 'fileType' | 'folder' | 'commit';

export type ViewMode = 'grid' | 'list';

export interface GroupedGhostFiles {
    groupKey: string;
    groupLabel: string;
    files: any[]; // GhostFileMetadata[]
}
