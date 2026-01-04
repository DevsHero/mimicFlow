import React from 'react';
import { GhostFileMetadata } from '../../../shared/types/GhostFile';
import { Avatar } from '@webview/shared/components/Avatar';
import { Badge } from '@webview/shared/components/Badge';

interface HistoryCardProps {
    file: GhostFileMetadata;
    isSelected?: boolean;
    onClick: () => void;
    onShare?: () => void;
    onToggleSelect?: () => void;
}

const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diffMs = Math.max(0, now - timestamp);
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

export const HistoryCard: React.FC<HistoryCardProps> = ({ file, isSelected = false, onClick, onShare, onToggleSelect }) => {
    const timeAgo = formatTimeAgo(file.timestamp);

    const getActionVariant = (action: string): 'default' | 'success' | 'danger' => {
        switch (action) {
            case 'create': return 'success';
            case 'delete': return 'danger';
            default: return 'default';
        }
    };

    const totalChanges = file.stats.linesAdded + file.stats.linesDeleted;
    const addedPercent = totalChanges > 0 ? (file.stats.linesAdded / totalChanges) * 100 : 50;

    // Determine border tint based on change type (macOS visual feedback)
    const isAdditionHeavy = file.stats.linesAdded > file.stats.linesDeleted;
    const isDeletionHeavy = file.stats.linesDeleted > file.stats.linesAdded * 1.5;
    const borderClass = isAdditionHeavy
        ? 'border-green-700/30 hover:border-green-600/50'
        : isDeletionHeavy
            ? 'border-red-700/30 hover:border-red-600/50'
            : 'border-gray-700 hover:border-gray-500';

    const normalizedPath = (file.filePath || '').replace(/\\/g, '/');
    const fileName = normalizedPath.split('/').pop() || file.filePath;

    const branchLabel = file.branch || 'unknown';
    const isMainBranch = branchLabel === 'main' || branchLabel === 'master';

    const sourceIcon = file.source === 'git' ? '🔀' : '💾';
    const sourceTitle = file.source === 'git'
        ? (file.commitMessage ? file.commitMessage : 'Git commit')
        : 'Auto-Saved';

    const authorName = (file.author || '').trim();

    return (
        <div
            className={`group p-2 rounded-lg border ${borderClass} cursor-pointer transition-all duration-200 bg-vscode-sidebar-bg hover:shadow-lg hover:scale-[1.01]`}
            onClick={onClick}
            style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale'
            }}
        >
            <div className="flex items-start gap-2">
                {onToggleSelect ? (
                    <div className="mt-1">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                                e.stopPropagation();
                                onToggleSelect();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 accent-blue-600 cursor-pointer"
                        />
                    </div>
                ) : (
                    <div className="mt-0.5">
                        <span
                            className="codicon codicon-file opacity-70"
                            style={{ fontSize: '14px' }}
                            aria-hidden="true"
                        />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    {/* Top row */}
                    <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs truncate" style={{ letterSpacing: '-0.01em' }}>
                            {fileName}
                        </span>

                        <span
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] leading-none ${isMainBranch
                                ? 'border-blue-500/40 text-blue-300'
                                : 'border-gray-600/60 text-gray-300'
                                }`}
                            title={branchLabel}
                        >
                            <span style={{ fontSize: '12px' }}>⑂</span>
                            <span className="truncate max-w-[120px]">{branchLabel}</span>
                        </span>

                        {file.isShared && (
                            <Badge variant="warning" className="text-[10px] px-1.5 py-0.5">
                                SHARED
                            </Badge>
                        )}

                        <div className="flex-1" />

                        {onShare && (
                            <button
                                type="button"
                                className="opacity-30 group-hover:opacity-100 transition-opacity px-1.5 py-1 rounded hover:bg-gray-700/50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onShare();
                                }}
                                title="Share to team folder"
                                aria-label="Share to team folder"
                            >
                                <span style={{ fontSize: '14px' }}>📤</span>
                            </button>
                        )}
                    </div>

                    {/* Bottom row */}
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] opacity-70">
                        <span
                            style={{ fontSize: '12px' }}
                            title={sourceTitle}
                            aria-label={sourceTitle}
                        >{sourceIcon}</span>

                        {authorName ? (
                            <div className="flex items-center gap-1 min-w-0">
                                <Avatar name={authorName} size="xs" className="opacity-90" />
                                <span className="truncate max-w-[180px]">{authorName}</span>
                            </div>
                        ) : (
                            <span className="truncate">{file.agentName}</span>
                        )}

                        <span className="opacity-60">•</span>
                        <span className="tabular-nums">{timeAgo}</span>

                        <div className="flex-1" />
                        <Badge variant={getActionVariant(file.actionType)} className="text-[10px] px-1.5 py-0.5">
                            {file.actionType}
                        </Badge>
                    </div>

                    {/* Compact stats bar */}
                    <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 rounded-full overflow-hidden bg-gray-700">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                                style={{ width: `${addedPercent}%` }}
                            />
                        </div>
                        <span className="text-green-500 font-medium tabular-nums text-[10px]">+{file.stats.linesAdded}</span>
                        <span className="text-red-500 font-medium tabular-nums text-[10px]">-{file.stats.linesDeleted}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
