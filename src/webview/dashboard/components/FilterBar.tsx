import React from 'react';
import { GroupingMode } from '@shared/types/GroupingMode';

interface FilterBarProps {
    groupingMode: GroupingMode;
    onGroupingChange: (mode: GroupingMode) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ groupingMode, onGroupingChange }) => {
    return (
        <div className="flex flex-wrap gap-2 mb-4">
            <button
                className={`px-2.5 py-1 rounded text-xs ${groupingMode === 'date'
                    ? 'bg-vscode-button-bg text-vscode-button-fg'
                    : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                onClick={() => onGroupingChange('date')}
            >
                📅 Date
            </button>
            <button
                className={`px-2.5 py-1 rounded text-xs ${groupingMode === 'folder'
                    ? 'bg-vscode-button-bg text-vscode-button-fg'
                    : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                onClick={() => onGroupingChange('folder')}
            >
                📁 Folder
            </button>
            <button
                className={`px-2.5 py-1 rounded text-xs ${groupingMode === 'fileType'
                    ? 'bg-vscode-button-bg text-vscode-button-fg'
                    : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                onClick={() => onGroupingChange('fileType')}
            >
                📄 Type
            </button>
            <button
                className={`px-2.5 py-1 rounded text-xs ${groupingMode === 'commit'
                    ? 'bg-vscode-button-bg text-vscode-button-fg'
                    : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                onClick={() => onGroupingChange('commit')}
            >
                🔖 Commit
            </button>
        </div>
    );
};
