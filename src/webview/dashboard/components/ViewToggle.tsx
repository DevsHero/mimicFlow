import React from 'react';
import { ViewMode } from '@shared/types/GroupingMode';

interface ViewToggleProps {
    mode: ViewMode;
    onChange: (mode: ViewMode) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ mode, onChange }) => {
    return (
        <div className="flex gap-1 bg-gray-700 rounded p-1">
            <button
                className={`px-2 py-1 rounded text-xs ${mode === 'grid' ? 'bg-vscode-button-bg' : 'hover:bg-gray-600'
                    }`}
                onClick={() => onChange('grid')}
                title="Grid view"
            >
                ⊞
            </button>
            <button
                className={`px-2 py-1 rounded text-xs ${mode === 'list' ? 'bg-vscode-button-bg' : 'hover:bg-gray-600'
                    }`}
                onClick={() => onChange('list')}
                title="List view"
            >
                ☰
            </button>
        </div>
    );
};
