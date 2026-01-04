import React from 'react';
import { GhostFile } from '@shared/types/GhostFile';

interface EditorTabsProps {
    files: GhostFile[];
    activeIndex: number;
    onTabClick?: (index: number) => void;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({ files, activeIndex, onTabClick }) => {
    const getFileIcon = (filePath: string): string => {
        const ext = filePath.split('.').pop()?.toLowerCase();
        const iconMap: Record<string, string> = {
            'ts': '📘',
            'tsx': '⚛️',
            'js': '📄',
            'jsx': '⚛️',
            'py': '🐍',
            'rs': '🦀',
            'go': '🔵',
            'java': '☕',
            'cpp': '⚙️',
            'c': '⚙️',
            'cs': '💎',
            'rb': '💎',
            'php': '🐘',
            'swift': '🐦',
            'kt': '🟣',
            'md': '📝',
            'json': '📋',
            'yaml': '⚙️',
            'yml': '⚙️',
            'dockerfile': '🐳',
            'html': '🌐',
            'css': '🎨',
            'scss': '🎨'
        };
        return iconMap[ext || ''] || '📄';
    };

    const getFileName = (filePath: string): string => {
        return filePath.split('/').pop() || filePath;
    };

    return (
        <div
            className="flex items-center border-b overflow-x-auto scrollbar-thin"
            style={{
                background: 'var(--vscode-editorGroupHeader-tabsBackground)',
                borderColor: 'var(--vscode-editorGroupHeader-tabsBorder)',
                height: '35px',
                borderTop: '3px solid',
                borderImage: 'linear-gradient(90deg, var(--vscode-terminal-ansiCyan), var(--vscode-terminal-ansiMagenta)) 1'
            }}
        >
            {files.map((file, index) => {
                const isActive = index === activeIndex;
                const fileName = getFileName(file.filePath);
                const icon = getFileIcon(file.filePath);

                return (
                    <div
                        key={file.id || index}
                        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all relative group"
                        style={{
                            background: isActive
                                ? 'var(--vscode-tab-activeBackground)'
                                : 'var(--vscode-tab-inactiveBackground)',
                            color: isActive
                                ? 'var(--vscode-tab-activeForeground)'
                                : 'var(--vscode-tab-inactiveForeground)',
                            borderRight: '1px solid var(--vscode-tab-border)',
                            minWidth: '120px',
                            maxWidth: '200px'
                        }}
                        onClick={() => onTabClick?.(index)}
                    >
                        {/* Active tab top border accent */}
                        {isActive && (
                            <div
                                className="absolute top-0 left-0 right-0 h-[2px]"
                                style={{
                                    background: 'var(--vscode-tab-activeBorderTop, var(--vscode-focusBorder))'
                                }}
                            />
                        )}

                        {/* File icon */}
                        <span className="text-xs">{icon}</span>

                        {/* File name */}
                        <span className="text-xs truncate flex-1 font-medium">
                            {fileName}
                        </span>

                        {/* Modified dot indicator */}
                        {isActive && (
                            <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                    background: 'var(--vscode-tab-activeModifiedBorder, #4ec9b0)'
                                }}
                            />
                        )}

                        {/* Close button (visual only for now) */}
                        <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/10 rounded"
                            onClick={(e) => {
                                e.stopPropagation();
                                // Close functionality not needed for playback
                            }}
                        >
                            <svg
                                width="10"
                                height="10"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                            >
                                <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" />
                            </svg>
                        </button>
                    </div>
                );
            })}

            <div className="ml-auto pr-3 flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] px-2 py-0.5 rounded border opacity-70"
                    style={{
                        borderColor: 'var(--vscode-editorGroupHeader-tabsBorder)',
                        background: 'var(--vscode-tab-inactiveBackground)',
                        color: 'var(--vscode-descriptionForeground)'
                    }}
                    title="MimicFlow Player preview"
                >
                    MimicFlow Preview
                </span>
            </div>
        </div>
    );
};
