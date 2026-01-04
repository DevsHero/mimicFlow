import { useMemo } from 'react';
import { GhostFileMetadata } from '@shared/types/GhostFile';
import { GroupingMode } from '@shared/types/GroupingMode';

export const useGrouping = (
    files: GhostFileMetadata[],
    groupingMode: GroupingMode
): Record<string, GhostFileMetadata[]> => {
    return useMemo(() => {
        const grouped: Record<string, GhostFileMetadata[]> = {};

        files.forEach(file => {
            let key = '';

            switch (groupingMode) {
                case 'date': {
                    const date = new Date(file.timestamp);
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);

                    if (date.toDateString() === today.toDateString()) {
                        key = 'Today';
                    } else if (date.toDateString() === yesterday.toDateString()) {
                        key = 'Yesterday';
                    } else {
                        key = date.toLocaleDateString();
                    }
                    break;
                }

                case 'fileType': {
                    const ext = file.fileExtension || 'Unknown';
                    // Create friendly labels
                    const typeLabels: Record<string, string> = {
                        'ts': 'TypeScript',
                        'tsx': 'TypeScript React',
                        'js': 'JavaScript',
                        'jsx': 'JavaScript React',
                        'py': 'Python',
                        'rs': 'Rust',
                        'go': 'Go',
                        'java': 'Java',
                        'cpp': 'C++',
                        'c': 'C',
                        'cs': 'C#',
                        'rb': 'Ruby',
                        'php': 'PHP',
                        'swift': 'Swift',
                        'kt': 'Kotlin',
                        'md': 'Markdown',
                        'json': 'JSON',
                        'yaml': 'YAML',
                        'yml': 'YAML',
                    };
                    key = typeLabels[ext] || ext.toUpperCase();
                    break;
                }

                case 'folder': {
                    // Extract parent folder from file path
                    const pathParts = file.filePath.split('/');
                    if (pathParts.length > 1) {
                        // Get parent folder (everything except filename)
                        key = pathParts.slice(0, -1).join('/') || '/';
                    } else {
                        key = 'Root';
                    }
                    break;
                }

                case 'commit': {
                    key = file.commitHash
                        ? `${file.commitHash.slice(0, 7)} - ${file.commitMessage}`
                        : 'Uncommitted';
                    break;
                }

                default:
                    key = 'Other';
            }

            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(file);
        });

        // Sort groups by key (most recent first for dates)
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            if (groupingMode === 'date') {
                // Special sort for date groups
                const order = ['Today', 'Yesterday'];
                const aIndex = order.indexOf(a);
                const bIndex = order.indexOf(b);

                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                if (aIndex !== -1) return -1;
                if (bIndex !== -1) return 1;

                // For other dates, sort by date
                return new Date(b).getTime() - new Date(a).getTime();
            }
            return a.localeCompare(b);
        });

        const sortedGrouped: Record<string, GhostFileMetadata[]> = {};
        sortedKeys.forEach(key => {
            sortedGrouped[key] = grouped[key];
        });

        return sortedGrouped;
    }, [files, groupingMode]);
};
