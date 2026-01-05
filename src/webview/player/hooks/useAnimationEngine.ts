import { useEffect, useRef, useState } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { GhostAction, GhostFile } from '@shared/types/GhostFile';

interface Position {
    line: number;
    column: number;
}

interface AnimationState {
    isPlaying: boolean;
    isPaused: boolean;
    currentStep: number;
    currentPosition: Position;
}

export const useAnimationEngine = (
    editor: MonacoEditor.IStandaloneCodeEditor | null,
    ghostFile: GhostFile | null,
    playbackSpeed: number
) => {
    const [state, setState] = useState<AnimationState>({
        isPlaying: false,
        isPaused: false,
        currentStep: 0,
        currentPosition: { line: 1, column: 1 }
    });

    const animationRef = useRef<NodeJS.Timeout | null>(null);
    const stateRef = useRef(state);

    // Keep ref in sync with state
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                clearTimeout(animationRef.current);
            }
        };
    }, []);

    // Reset and restart animation when speed changes during playback
    useEffect(() => {
        if (state.isPlaying) {
            console.log('[AnimationEngine] Speed changed to', playbackSpeed, 'x - restarting playback');
            // Clear current animation
            if (animationRef.current) {
                clearTimeout(animationRef.current);
                animationRef.current = null;
            }
            // Continue from current step with new speed
            playNextStep();
        }
    }, [playbackSpeed]);

    const reset = () => {
        console.log('[AnimationEngine] Resetting to original content');

        if (animationRef.current) {
            clearTimeout(animationRef.current);
            animationRef.current = null;
        }

        if (!editor || !ghostFile) return;

        // Reset editor to original content
        const model = editor.getModel();
        if (model) {
            model.setValue(ghostFile.originalContent);
        }

        // Reset cursor to start
        editor.setPosition({ lineNumber: 1, column: 1 });
        editor.revealLineInCenter(1);

        setState({
            isPlaying: false,
            isPaused: false,
            currentStep: 0,
            currentPosition: { line: 1, column: 1 }
        });
    };

    const play = () => {
        console.log('[AnimationEngine] Starting playback');

        if (!editor || !ghostFile) {
            console.error('[AnimationEngine] Missing editor or ghostFile');
            return;
        }

        // If at the end, reset first
        if (stateRef.current.currentStep >= ghostFile.actions.length) {
            reset();
            // Wait for reset to complete
            setTimeout(() => {
                setState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
                playNextStep();
            }, 100);
        } else {
            setState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
            playNextStep();
        }
    };

    const pause = () => {
        console.log('[AnimationEngine] Pausing playback');

        if (animationRef.current) {
            clearTimeout(animationRef.current);
            animationRef.current = null;
        }

        setState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
    };

    const skipToEnd = () => {
        console.log('[AnimationEngine] Skipping to end');

        if (animationRef.current) {
            clearTimeout(animationRef.current);
            animationRef.current = null;
        }

        if (!editor || !ghostFile) return;

        const model = editor.getModel();
        if (model) {
            model.setValue(ghostFile.newContent);
        }

        // Position at end of document
        const lineCount = editor.getModel()?.getLineCount() || 1;
        const lastLineLength = editor.getModel()?.getLineMaxColumn(lineCount) || 1;

        editor.setPosition({ lineNumber: lineCount, column: lastLineLength });
        editor.revealLineInCenter(lineCount);

        setState({
            isPlaying: false,
            isPaused: false,
            currentStep: ghostFile.actions.length,
            currentPosition: { line: lineCount, column: lastLineLength }
        });
    };

    const playNextStep = () => {
        if (!editor || !ghostFile) return;

        const { currentStep } = stateRef.current;

        if (currentStep >= ghostFile.actions.length) {
            console.log('[AnimationEngine] Playback complete');
            setState(prev => ({ ...prev, isPlaying: false }));
            return;
        }

        const action = ghostFile.actions[currentStep];
        console.log(`[AnimationEngine] Executing step ${currentStep}:`, action.type);

        executeAction(action, () => {

            const delay = (action.delayMs || 100) / (playbackSpeed * 0.7);

            setState(prev => ({
                ...prev,
                currentStep: prev.currentStep + 1
            }));

            if (stateRef.current.isPlaying) {
                animationRef.current = setTimeout(playNextStep, delay);
            }
        });
    };

    const executeAction = (action: GhostAction, onComplete: () => void) => {
        if (!editor) {
            onComplete();
            return;
        }

        const model = editor.getModel();
        if (!model) {
            onComplete();
            return;
        }

        try {
            switch (action.type) {
                case 'scroll': {
                    const targetLine = action.line || 1;
                    console.log(`[AnimationEngine] Scrolling to line ${targetLine}`);
                    try {
                        // Use revealLineInCenter with scroll type for smooth scrolling
                        editor.revealLineInCenter(targetLine, 0);
                    } catch (e) {
                        console.warn('[AnimationEngine] Scroll failed, continuing:', e);
                    }
                    setTimeout(onComplete, 200);
                    break;
                }

                case 'moveCursor': {
                    const line = action.line || 1;
                    const column = action.column || 1;
                    console.log(`[AnimationEngine] Moving cursor to ${line}:${column}`);

                    try {
                        editor.setPosition({ lineNumber: line, column });
                        editor.revealLine(line);
                    } catch (e) {
                        console.warn('[AnimationEngine] Move cursor failed, continuing:', e);
                    }

                    setState(prev => ({
                        ...prev,
                        currentPosition: { line, column }
                    }));

                    setTimeout(onComplete, 50);
                    break;
                }

                case 'select': {
                    const startLine = action.startLine || 1;
                    const startColumn = action.startColumn || 1;
                    const endLine = action.endLine || 1;
                    const endColumn = action.endColumn || 1;
                    console.log(`[AnimationEngine] Selecting ${startLine}:${startColumn} to ${endLine}:${endColumn}`);

                    editor.setSelection({
                        startLineNumber: startLine,
                        startColumn: startColumn,
                        endLineNumber: endLine,
                        endColumn: endColumn
                    });

                    setTimeout(onComplete, 50);
                    break;
                }

                case 'backspace': {
                    const selection = editor.getSelection();
                    if (!selection) {
                        onComplete();
                        return;
                    }

                    const count = action.count || 1;
                    console.log(`[AnimationEngine] Backspace ${count} characters from selection`);

                    // If there's a selection, delete it character by character
                    // Otherwise, delete backwards from cursor
                    let deleteRange;
                    if (!selection.isEmpty()) {
                        // Delete the current selection
                        deleteRange = {
                            startLineNumber: selection.startLineNumber,
                            startColumn: selection.startColumn,
                            endLineNumber: selection.endLineNumber,
                            endColumn: selection.endColumn
                        };
                    } else {
                        // Delete backwards from cursor
                        const position = editor.getPosition()!;
                        const startColumn = Math.max(1, position.column - count);
                        deleteRange = {
                            startLineNumber: position.lineNumber,
                            startColumn: startColumn,
                            endLineNumber: position.lineNumber,
                            endColumn: position.column
                        };
                    }

                    // Animate deletion character by character
                    let remainingChars = count;
                    const deleteNextChar = () => {
                        if (remainingChars <= 0) {
                            onComplete();
                            return;
                        }

                        const currentSelection = editor.getSelection();
                        if (!currentSelection) {
                            onComplete();
                            return;
                        }

                        // Delete one character from the selection
                        const deleteOne = {
                            startLineNumber: currentSelection.startLineNumber,
                            startColumn: currentSelection.startColumn,
                            endLineNumber: currentSelection.startLineNumber,
                            endColumn: Math.min(
                                currentSelection.startColumn + 1,
                                currentSelection.endColumn
                            )
                        };

                        model.applyEdits([{
                            range: deleteOne,
                            text: ''
                        }]);

                        // Update selection to next character
                        const newEndColumn = Math.max(
                            currentSelection.startColumn,
                            currentSelection.endColumn - 1
                        );

                        if (newEndColumn > currentSelection.startColumn) {
                            editor.setSelection({
                                startLineNumber: currentSelection.startLineNumber,
                                startColumn: currentSelection.startColumn,
                                endLineNumber: currentSelection.endLineNumber,
                                endColumn: newEndColumn
                            });
                        } else {
                            // Selection empty, move cursor to start
                            editor.setPosition({
                                lineNumber: currentSelection.startLineNumber,
                                column: currentSelection.startColumn
                            });
                        }

                        setState(prev => ({
                            ...prev,
                            currentPosition: {
                                line: currentSelection.startLineNumber,
                                column: currentSelection.startColumn
                            }
                        }));

                        remainingChars--;
                        // Slow playback by 30% for more comfortable pacing
                        setTimeout(deleteNextChar, 20 / (playbackSpeed * 0.7));
                    };

                    deleteNextChar();
                    break;
                }

                case 'type': {
                    const text = action.text || '';
                    const position = editor.getPosition();
                    if (!position) {
                        onComplete();
                        return;
                    }

                    console.log(`[AnimationEngine] Typing: "${text.substring(0, 20)}..." (${text.length} chars)`);

                    // Type character by character for human-like effect
                    let charIndex = 0;
                    const typeNextChar = () => {
                        if (charIndex >= text.length) {
                            onComplete();
                            return;
                        }

                        const currentPosition = editor.getPosition();
                        if (!currentPosition) {
                            onComplete();
                            return;
                        }

                        const char = text[charIndex];

                        // Insert single character
                        model.applyEdits([{
                            range: {
                                startLineNumber: currentPosition.lineNumber,
                                startColumn: currentPosition.column,
                                endLineNumber: currentPosition.lineNumber,
                                endColumn: currentPosition.column
                            },
                            text: char
                        }]);

                        // Update position
                        const newLine = char === '\n'
                            ? currentPosition.lineNumber + 1
                            : currentPosition.lineNumber;
                        const newColumn = char === '\n'
                            ? 1
                            : currentPosition.column + 1;

                        try {
                            editor.setPosition({ lineNumber: newLine, column: newColumn });
                            editor.revealLine(newLine);
                        } catch (e) {
                            // Ignore positioning errors during typing
                        }

                        setState(prev => ({
                            ...prev,
                            currentPosition: { line: newLine, column: newColumn }
                        }));

                        charIndex++;

                        // Delay between characters (faster for whitespace)
                        const charDelay = char === ' ' || char === '\n' ? 10 : 30;
                        // Slow playback by 30% for more comfortable pacing
                        setTimeout(typeNextChar, charDelay / (playbackSpeed * 0.7));
                    };

                    typeNextChar();
                    break;
                }

                default:
                    console.warn('[AnimationEngine] Unknown action type:', action);
                    onComplete();
            }
        } catch (error) {
            console.error('[AnimationEngine] Error executing action:', error);
            onComplete();
        }
    };

    return {
        ...state,
        play,
        pause,
        reset,
        skipToEnd,
        totalSteps: ghostFile?.actions.length || 0
    };
};
