import React, { useState, useEffect, useRef } from 'react';
import Editor, { OnMount, useMonaco } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { vscodeApi } from '@webview/shared/utils/vscodeApi';
import { GhostFile } from '@shared/types/GhostFile';
import { useAnimationEngine } from './hooks/useAnimationEngine';
import { usePlaylist } from './hooks/usePlaylist';
import { GhostCursor } from './components/GhostCursor';
import { EditorTabs } from './components/EditorTabs';
import { ControlPanel } from './components/ControlPanel';

export const PlayerApp: React.FC = () => {
    const [editor, setEditor] = useState<MonacoEditor.IStandaloneCodeEditor | null>(null);
    const [speed, setSpeed] = useState(0.5);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const monaco = useMonaco();

    // Used for the "restart current file if > 2s played" behavior
    const playedMsRef = useRef(0);
    const playStartedAtRef = useRef<number | null>(null);

    // When true, automatically start next file after switching
    const autoPlayRef = useRef(false);
    const autoAdvanceTimerRef = useRef<number | null>(null);
    const lastCompletedFileIdRef = useRef<string | null>(null);

    // Queue for pending playlist data before editor is ready
    const pendingPlaylistRef = useRef<{ files: GhostFile[], startIndex: number } | null>(null);

    // Playlist management
    const playlistManager = usePlaylist(editor, monaco);

    // Animation engine uses current file from playlist
    const animation = useAnimationEngine(editor, playlistManager.currentFile, speed);

    useEffect(() => {
        console.log('[PlayerApp] Component mounted');

        const handleMessage = (event: MessageEvent) => {
            const message = event.data;

            // Validate message structure
            if (!message || typeof message !== 'object' || !message.type) {
                console.log('[PlayerApp] Received invalid message, ignoring');
                return;
            }

            console.log('[PlayerApp] Received message:', message.type);

            if (message.type === 'playGhostFile') {
                // Single file playback (backward compatibility)
                console.log('[PlayerApp] Loading single ghost file:', message.data.filePath);
                if (editor && monaco) {
                    playlistManager.loadPlaylist([message.data], 0);
                } else {
                    console.log('[PlayerApp] Editor not ready, queuing single file');
                    pendingPlaylistRef.current = { files: [message.data], startIndex: 0 };
                }
            } else if (message.type === 'LOAD_PLAYLIST') {
                // Playlist playback
                console.log('[PlayerApp] Loading playlist:', message.payload.queue.length, 'files');
                if (editor && monaco) {
                    playlistManager.loadPlaylist(message.payload.queue, message.payload.activeIndex || 0);
                } else {
                    console.log('[PlayerApp] Editor not ready, queuing playlist');
                    pendingPlaylistRef.current = {
                        files: message.payload.queue,
                        startIndex: message.payload.activeIndex || 0
                    };
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [editor, monaco]);

    // Load pending playlist when editor becomes ready
    useEffect(() => {
        if (editor && monaco && pendingPlaylistRef.current) {
            console.log('[PlayerApp] Editor ready, loading pending playlist');
            const pending = pendingPlaylistRef.current;
            playlistManager.loadPlaylist(pending.files, pending.startIndex);
            pendingPlaylistRef.current = null;
        }
    }, [editor, monaco]);

    // Note: VS Code webviews disallow the browser Fullscreen API via permissions policy.
    // We implement "fullscreen" by toggling VS Code window fullscreen (extension command)
    // while also enabling a local "cinema mode" that hides tabs/timeline.

    // Reset animation when file changes in playlist
    useEffect(() => {
        if (playlistManager.currentFile && editor) {
            console.log('[PlayerApp] Current file changed, resetting animation');
            animation.reset();

            playedMsRef.current = 0;
            playStartedAtRef.current = null;
            lastCompletedFileIdRef.current = null;

            // If autoplay is enabled, start playing the new file automatically
            if (autoPlayRef.current) {
                window.setTimeout(() => {
                    animation.play();
                }, 150);
            }
        }
    }, [playlistManager.currentFile, editor]);

    // Track time spent playing for prev/next behavior
    useEffect(() => {
        if (animation.isPlaying) {
            if (playStartedAtRef.current == null) {
                playStartedAtRef.current = Date.now();
            }
            return;
        }

        if (playStartedAtRef.current != null) {
            playedMsRef.current += Date.now() - playStartedAtRef.current;
            playStartedAtRef.current = null;
        }
    }, [animation.isPlaying]);

    // Auto-advance to next file when animation completes
    useEffect(() => {
        if (animation.totalSteps <= 0) return;
        if (animation.isPlaying) return;
        if (animation.currentStep !== animation.totalSteps) return;
        if (!autoPlayRef.current) return;

        const currentId = playlistManager.currentFile?.id;
        if (!currentId) return;
        if (lastCompletedFileIdRef.current === currentId) return;
        lastCompletedFileIdRef.current = currentId;

        if (!playlistManager.hasNext) {
            console.log('[PlayerApp] Playlist complete');
            autoPlayRef.current = false;
            return;
        }

        if (autoAdvanceTimerRef.current != null) {
            window.clearTimeout(autoAdvanceTimerRef.current);
        }

        console.log('[PlayerApp] Animation complete, advancing to next file in 0.5s');
        autoAdvanceTimerRef.current = window.setTimeout(() => {
            playlistManager.nextFile();
            autoAdvanceTimerRef.current = null;
        }, 500);
    }, [animation.isPlaying, animation.currentStep, animation.totalSteps, playlistManager.hasNext, playlistManager.currentFile?.id]);

    const handleEditorMount: OnMount = (mountedEditor) => {
        console.log('[PlayerApp] Monaco Editor mounted');
        setEditor(mountedEditor);

        // Configure editor
        mountedEditor.updateOptions({
            readOnly: true,
            minimap: { enabled: false },
            scrollbar: {
                vertical: 'visible',
                horizontal: 'visible'
            },
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            fontSize: 14,
            fontFamily: 'SF Mono, Monaco, Menlo, Consolas, monospace',
            cursorStyle: 'line',
            cursorBlinking: 'blink'
        });

        // Check if there's a pending playlist to load
        if (monaco && pendingPlaylistRef.current) {
            console.log('[PlayerApp] Editor just mounted, loading pending playlist immediately');
            const pending = pendingPlaylistRef.current;
            // Use a small delay to ensure Monaco is fully ready
            setTimeout(() => {
                playlistManager.loadPlaylist(pending.files, pending.startIndex);
                pendingPlaylistRef.current = null;
            }, 100);
        }
    };

    const showLoading = !playlistManager.currentFile;
    const currentFile = playlistManager.currentFile;
    const showTabs = playlistManager.playlist.length > 1;
    const showTimeline = !isFullScreen;

    const handlePrevious = () => {
        const playedMs = playedMsRef.current + (playStartedAtRef.current ? (Date.now() - playStartedAtRef.current) : 0);

        if (playedMs > 2000) {
            animation.reset();
            playedMsRef.current = 0;
            playStartedAtRef.current = animation.isPlaying ? Date.now() : null;
            return;
        }

        if (playlistManager.hasPrevious) {
            playlistManager.previousFile();
        } else {
            animation.reset();
            playedMsRef.current = 0;
        }
    };

    const handleNext = () => {
        if (animation.totalSteps > 0 && animation.currentStep < animation.totalSteps) {
            animation.skipToEnd();
            playedMsRef.current = 0;
            playStartedAtRef.current = null;
            return;
        }

        if (playlistManager.hasNext) {
            playlistManager.nextFile();
        }
    };

    const handlePlayPause = () => {
        if (animation.isPlaying) {
            autoPlayRef.current = false;
            animation.pause();
            return;
        }

        autoPlayRef.current = true;
        animation.play();
    };

    const handleToggleFullScreen = () => {
        // Toggle local cinema mode
        setIsFullScreen(prev => !prev);

        // Request VS Code to toggle real window fullscreen
        try {
            vscodeApi.postMessage({ type: 'toggleVscodeFullscreen' });
        } catch (e) {
            console.warn('[PlayerApp] Failed to request VS Code fullscreen:', e);
        }
    };

    return (
        <div className="h-screen flex flex-col relative min-h-0">
            {/* Show loading overlay but keep editor mounted */}
            {showLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-vscode-editor-bg z-50">
                    <div className="text-center text-gray-500">
                        <div className="text-4xl mb-4">🎬</div>
                        <div className="text-xl">Loading...</div>
                    </div>
                </div>
            )}

            {/* Editor Tabs - Only show when multiple files and loaded */}
            {!showLoading && showTabs && !isFullScreen && (
                <EditorTabs
                    files={playlistManager.playlist}
                    activeIndex={playlistManager.activeIndex}
                    onTabClick={playlistManager.switchToFile}
                />
            )}

            {/* Header - Compact when tabs visible */}
            {!showLoading && currentFile && (
                <div
                    className="bg-vscode-titlebar-bg border-b border-gray-700 px-4 flex-shrink-0"
                    style={{ paddingTop: showTabs ? '8px' : '12px', paddingBottom: showTabs ? '8px' : '12px' }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium">
                                {currentFile.filePath.split('/').pop()}
                            </div>
                            <div className="text-xs text-gray-400">
                                {currentFile.author} • {new Date(currentFile.timestamp).toLocaleString()}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-xs text-gray-400">
                                +{currentFile.stats.linesAdded} -{currentFile.stats.linesDeleted}
                            </div>
                            {showTabs && (
                                <div className="text-xs text-gray-500">
                                    {playlistManager.activeIndex + 1} / {playlistManager.playlist.length}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Editor Container */}
            <div className="flex-1 relative min-h-0">
                <Editor
                    height="100%"
                    theme="vs-dark"
                    onMount={handleEditorMount}
                    options={{
                        automaticLayout: true
                    }}
                />

                {/* Ghost Cursor Overlay - only when file is loaded */}
                {!showLoading && (
                    <GhostCursor
                        editor={editor}
                        position={animation.currentPosition}
                        isVisible={animation.isPlaying}
                    />
                )}
            </div>

            {/* Progress Bar */}
            {!showLoading && showTimeline && (
                <div className="bg-vscode-editor-bg border-t border-gray-700 px-4 py-1 flex-shrink-0">
                    <div className="relative w-full h-1 bg-gray-700 rounded overflow-hidden">
                        <div
                            className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-100"
                            style={{
                                width: `${animation.totalSteps > 0 ? (animation.currentStep / animation.totalSteps) * 100 : 0}%`
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Control Panel */}
            {!showLoading && (
                <ControlPanel
                    isPlaying={animation.isPlaying}
                    canGoPrevious={!!editor && (playlistManager.hasPrevious || (playedMsRef.current > 0))}
                    canGoNext={!!editor && (playlistManager.hasNext || (animation.totalSteps > 0 && animation.currentStep < animation.totalSteps))}
                    speed={speed}
                    isFullScreen={isFullScreen}
                    onPrevious={handlePrevious}
                    onPlayPause={handlePlayPause}
                    onNext={handleNext}
                    onSpeedChange={setSpeed}
                    onToggleFullScreen={handleToggleFullScreen}
                />
            )}

            {/* Blink Animation CSS */}
            <style>{`
                @keyframes blink {
                    0%, 49% { opacity: 1; }
                    50%, 100% { opacity: 0; }
                }
            `}</style>
        </div>
    );
};
