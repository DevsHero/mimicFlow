import React from 'react';

interface ControlPanelProps {
    isPlaying: boolean;
    canGoPrevious: boolean;
    canGoNext: boolean;
    speed: number;
    isFullScreen: boolean;
    onPrevious: () => void;
    onPlayPause: () => void;
    onNext: () => void;
    onSpeedChange: (speed: number) => void;
    onToggleFullScreen: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
    isPlaying,
    canGoPrevious,
    canGoNext,
    speed,
    isFullScreen,
    onPrevious,
    onPlayPause,
    onNext,
    onSpeedChange,
    onToggleFullScreen
}) => {
    return (
        <div
            className="bg-vscode-sidebar-bg border-t border-gray-700 px-4 py-3 flex items-center justify-between"
            style={{
                // In fullscreen we overlay controls so Monaco can be 100% height
                position: isFullScreen ? 'absolute' : 'relative',
                left: isFullScreen ? 0 : undefined,
                right: isFullScreen ? 0 : undefined,
                bottom: isFullScreen ? 0 : undefined,
                zIndex: isFullScreen ? 60 : undefined
            }}
        >
            <div className="flex items-center gap-2">
                <button
                    className="w-9 h-9 rounded flex items-center justify-center hover:bg-white/10 disabled:opacity-30"
                    onClick={onPrevious}
                    disabled={!canGoPrevious}
                    title="Previous"
                    aria-label="Previous"
                >
                    <span className="codicon codicon-debug-step-back" />
                </button>

                <button
                    className="w-10 h-10 rounded flex items-center justify-center hover:bg-white/10"
                    onClick={onPlayPause}
                    title={isPlaying ? 'Pause' : 'Play'}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                    <span className={`codicon ${isPlaying ? 'codicon-debug-pause' : 'codicon-debug-start'}`} />
                </button>

                <button
                    className="w-9 h-9 rounded flex items-center justify-center hover:bg-white/10 disabled:opacity-30"
                    onClick={onNext}
                    disabled={!canGoNext}
                    title="Next"
                    aria-label="Next"
                >
                    <span className="codicon codicon-debug-step-over" />
                </button>
            </div>

            <div className="flex items-center gap-3">
                <select
                    className="px-2 py-1.5 rounded bg-gray-700 border-none text-sm"
                    value={speed}
                    onChange={(e) => onSpeedChange(Number(e.target.value))}
                    title="Speed"
                    aria-label="Speed"
                >
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={4}>4x</option>
                    <option value={8}>8x</option>
                </select>

                <button
                    className="w-9 h-9 rounded flex items-center justify-center hover:bg-white/10"
                    onClick={onToggleFullScreen}
                    title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                    aria-label={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                >
                    <span className={`codicon ${isFullScreen ? 'codicon-screen-normal' : 'codicon-screen-full'}`} />
                </button>
            </div>
        </div>
    );
};
