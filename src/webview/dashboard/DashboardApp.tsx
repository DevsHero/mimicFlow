import React, { useState, useMemo } from 'react';
import { vscodeApi } from '@webview/shared/utils/vscodeApi';
import { HistoryCard } from './components/HistoryCard';
import { FilterBar } from './components/FilterBar';
import { FilterPanel, FilterState } from './components/FilterPanel';
import { GroupHeader } from './components/GroupHeader';
import { ViewToggle } from './components/ViewToggle';
import { ViewMode, GroupingMode } from '@shared/types/GroupingMode';
import { useGrouping } from './hooks/useGrouping';
import { useDebounce } from './hooks/useDebounce';
import { useGhostFiles } from './hooks/useGhostFiles';

export const DashboardApp: React.FC = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [groupingMode, setGroupingMode] = useState<GroupingMode>('date');
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

    const { ghostFiles, loading, miningStatus, currentBranch } = useGhostFiles();

    // Filter state
    const [filters, setFilters] = useState<FilterState>({
        searchQuery: '',
        dateFrom: '',
        dateTo: '',
        fileTypes: new Set(),
        actionTypes: new Set(),
        showAllBranches: false
    });

    // Debounce search query for performance
    const debouncedSearch = useDebounce(filters.searchQuery, 300);

    const handleCardClick = (ghostFileId: string) => {
        vscodeApi.postMessage({
            type: 'openPlayer',
            ghostFileId
        });
    };

    const handlePlayGroup = (fileIds: string[]) => {
        vscodeApi.postMessage({
            type: 'openPlaylist',
            ghostFileIds: fileIds
        });
    };

    const handleShare = (ghostFileId: string) => {
        vscodeApi.postMessage({
            type: 'shareGhostFile',
            ghostFileId
        });
    };

    const handleShareSelected = () => {
        if (selectedFiles.size === 0) return;
        selectedFiles.forEach(id => {
            vscodeApi.postMessage({
                type: 'shareGhostFile',
                ghostFileId: id
            });
        });
        setSelectedFiles(new Set());
    };

    const toggleSelection = (fileId: string) => {
        const newSelection = new Set(selectedFiles);
        if (newSelection.has(fileId)) {
            newSelection.delete(fileId);
        } else {
            newSelection.add(fileId);
        }
        setSelectedFiles(newSelection);
    };

    // Filter files based on all filter criteria
    const filteredFiles = useMemo(() => {
        return ghostFiles.filter(file => {
            // Branch filter (default: current branch only)
            if (!filters.showAllBranches && currentBranch && currentBranch !== 'unknown') {
                if ((file.branch || 'unknown') !== currentBranch) return false;
            }

            // Search filter (fileName, filePath, commitMessage)
            if (debouncedSearch) {
                const query = debouncedSearch.toLowerCase();
                const matchesSearch =
                    file.filePath.toLowerCase().includes(query) ||
                    (file.commitMessage || '').toLowerCase().includes(query);

                if (!matchesSearch) return false;
            }

            // Date range filter
            if (filters.dateFrom) {
                const fileDate = new Date(file.timestamp);
                const fromDate = new Date(filters.dateFrom);
                if (fileDate < fromDate) return false;
            }
            if (filters.dateTo) {
                const fileDate = new Date(file.timestamp);
                const toDate = new Date(filters.dateTo);
                toDate.setHours(23, 59, 59, 999); // Include entire day
                if (fileDate > toDate) return false;
            }

            // File type filter
            if (filters.fileTypes.size > 0) {
                if (!filters.fileTypes.has(file.fileExtension || '')) return false;
            }

            // Action type filter
            if (filters.actionTypes.size > 0) {
                if (!filters.actionTypes.has(file.actionType)) return false;
            }

            return true;
        });
    }, [ghostFiles, debouncedSearch, filters.dateFrom, filters.dateTo, filters.fileTypes, filters.actionTypes, filters.showAllBranches, currentBranch]);

    // Calculate available filter options
    const availableFileTypes = useMemo(() => {
        const types = new Map<string, number>();
        ghostFiles.forEach(file => {
            const ext = file.fileExtension || '';
            types.set(ext, (types.get(ext) || 0) + 1);
        });
        return types;
    }, [ghostFiles]);

    const availableActionTypes = useMemo(() => {
        const actions = new Map<string, number>();
        ghostFiles.forEach(file => {
            actions.set(file.actionType, (actions.get(file.actionType) || 0) + 1);
        });
        return actions;
    }, [ghostFiles]);

    // Group filtered files
    const groupedFiles = useGrouping(filteredFiles, groupingMode);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="text-xl">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3">
            <div className="flex justify-between items-center mb-3">
                <h1 className="text-lg font-bold">Code History</h1>
                <div className="flex items-center gap-2">
                    {selectedFiles.size > 0 && (
                        <button
                            onClick={handleShareSelected}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded bg-green-600 hover:bg-green-700 transition-colors"
                        >
                            <span className="codicon codicon-share" />
                            Share Selected ({selectedFiles.size})
                        </button>
                    )}
                    <ViewToggle mode={viewMode} onChange={setViewMode} />
                </div>
            </div>

            <FilterBar
                groupingMode={groupingMode}
                onGroupingChange={setGroupingMode}
            />

            <FilterPanel
                filters={filters}
                onFilterChange={setFilters}
                availableFileTypes={availableFileTypes}
                availableActionTypes={availableActionTypes}
            />

            {miningStatus ? (
                <div className="text-center py-16">
                    <div className="text-2xl mb-3">⏳</div>
                    <div className="text-lg font-medium mb-2">{miningStatus}</div>
                    <div className="text-sm opacity-60">This may take a moment...</div>
                </div>
            ) : Object.keys(groupedFiles).length === 0 ? (
                <div className="text-center py-12 opacity-50">
                    <div className="text-lg mb-2">
                        {filteredFiles.length === 0 && ghostFiles.length > 0
                            ? 'No matches found'
                            : 'No history yet'}
                    </div>
                    <div className="text-sm">
                        {filteredFiles.length === 0 && ghostFiles.length > 0
                            ? 'Try adjusting your filters'
                            : 'Start making changes to see them here!'}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(groupedFiles).map(([groupKey, files]) => (
                        <div key={groupKey}>
                            <div className="flex items-center justify-between mb-2">
                                <GroupHeader
                                    label={groupKey}
                                    count={files.length}
                                />
                                {files.length > 1 && (
                                    <button
                                        className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 transition-colors"
                                        onClick={() => handlePlayGroup(files.map(f => f.id))}
                                        title="Play all files in this group as a playlist"
                                    >
                                        ▶ Play All ({files.length})
                                    </button>
                                )}
                            </div>
                            <div className={
                                viewMode === 'grid'
                                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2'
                                    : 'space-y-2 mt-2'
                            }>
                                {files.map(file => (
                                    <HistoryCard
                                        key={file.id}
                                        file={file}
                                        isSelected={selectedFiles.has(file.id)}
                                        onClick={() => handleCardClick(file.id)}
                                        onShare={() => handleShare(file.id)}
                                        onToggleSelect={() => toggleSelection(file.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
