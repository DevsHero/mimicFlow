import React, { useState } from 'react';

export interface FilterState {
    searchQuery: string;
    dateFrom: string;
    dateTo: string;
    fileTypes: Set<string>;
    actionTypes: Set<string>;
    showAllBranches: boolean;
}

interface FilterPanelProps {
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    availableFileTypes: Map<string, number>; // extension -> count
    availableActionTypes: Map<string, number>; // action -> count
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
    filters,
    onFilterChange,
    availableFileTypes,
    availableActionTypes
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleFileType = (ext: string) => {
        const newTypes = new Set(filters.fileTypes);
        if (newTypes.has(ext)) {
            newTypes.delete(ext);
        } else {
            newTypes.add(ext);
        }
        onFilterChange({ ...filters, fileTypes: newTypes });
    };

    const toggleActionType = (action: string) => {
        const newTypes = new Set(filters.actionTypes);
        if (newTypes.has(action)) {
            newTypes.delete(action);
        } else {
            newTypes.add(action);
        }
        onFilterChange({ ...filters, actionTypes: newTypes });
    };

    const clearAllFilters = () => {
        onFilterChange({
            searchQuery: '',
            dateFrom: '',
            dateTo: '',
            fileTypes: new Set(),
            actionTypes: new Set(),
            showAllBranches: false
        });
    };

    const hasActiveFilters = filters.dateFrom || filters.dateTo ||
        filters.fileTypes.size > 0 ||
        filters.actionTypes.size > 0 ||
        filters.showAllBranches;

    return (
        <div className="mb-4">
            <div className="flex gap-2 mb-2">
                <input
                    type="text"
                    placeholder="Search files..."
                    value={filters.searchQuery}
                    onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-sm bg-vscode-input-bg border border-vscode-input-border rounded focus:outline-none focus:border-vscode-focus-border"
                />
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`px-3 py-1.5 rounded text-sm transition-colors ${hasActiveFilters
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                >
                    {isExpanded ? '▲' : '▼'} Filters {hasActiveFilters && `(${(filters.fileTypes.size || 0) +
                        (filters.actionTypes.size || 0) +
                        (filters.dateFrom ? 1 : 0) +
                        (filters.dateTo ? 1 : 0)
                        })`}
                </button>
            </div>

            {isExpanded && (
                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3">
                    {/* Branch */}
                    <div>
                        <label className="text-xs font-semibold opacity-70 mb-1.5 block">Branch</label>
                        <label className="flex items-center gap-2 text-xs opacity-80">
                            <input
                                type="checkbox"
                                checked={filters.showAllBranches}
                                onChange={(e) => onFilterChange({ ...filters, showAllBranches: e.target.checked })}
                                className="h-4 w-4 accent-blue-600 cursor-pointer"
                            />
                            Show history from all branches
                        </label>
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="text-xs font-semibold opacity-70 mb-1.5 block">Date Range</label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
                                className="flex-1 px-2 py-1 text-xs bg-vscode-input-bg border border-vscode-input-border rounded"
                            />
                            <span className="text-xs opacity-50 self-center">to</span>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
                                className="flex-1 px-2 py-1 text-xs bg-vscode-input-bg border border-vscode-input-border rounded"
                            />
                        </div>
                    </div>

                    {/* File Types */}
                    {availableFileTypes.size > 0 && (
                        <div>
                            <label className="text-xs font-semibold opacity-70 mb-1.5 block">File Types</label>
                            <div className="flex flex-wrap gap-1.5">
                                {Array.from(availableFileTypes.entries()).map(([ext, count]) => (
                                    <button
                                        key={ext}
                                        onClick={() => toggleFileType(ext)}
                                        className={`px-2 py-1 text-xs rounded transition-colors ${filters.fileTypes.has(ext)
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-700 hover:bg-gray-600'
                                            }`}
                                    >
                                        {ext || 'Unknown'} ({count})
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Types */}
                    {availableActionTypes.size > 0 && (
                        <div>
                            <label className="text-xs font-semibold opacity-70 mb-1.5 block">Action Types</label>
                            <div className="flex flex-wrap gap-1.5">
                                {Array.from(availableActionTypes.entries()).map(([action, count]) => (
                                    <button
                                        key={action}
                                        onClick={() => toggleActionType(action)}
                                        className={`px-2 py-1 text-xs rounded transition-colors capitalize ${filters.actionTypes.has(action)
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-700 hover:bg-gray-600'
                                            }`}
                                    >
                                        {action} ({count})
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Clear Button */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearAllFilters}
                            className="w-full px-3 py-1.5 text-xs bg-red-900/30 hover:bg-red-900/50 rounded transition-colors"
                        >
                            Clear All Filters
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
