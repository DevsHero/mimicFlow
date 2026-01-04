import React, { useEffect, useState } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';

interface GhostCursorProps {
    editor: MonacoEditor.IStandaloneCodeEditor | null;
    position: { line: number; column: number };
    isVisible: boolean;
}

export const GhostCursor: React.FC<GhostCursorProps> = ({ editor, position, isVisible }) => {
    const [coordinates, setCoordinates] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        if (!editor || !isVisible) {
            setCoordinates(null);
            return;
        }

        const updateCoordinates = async () => {
            try {
                console.log(`[GhostCursor] Calculating position for ${position.line}:${position.column}`);

                // Ensure line is visible first (use simpler method)
                try {
                    editor.revealLine(position.line);
                } catch (e) {
                    // Ignore reveal errors
                }

                // Wait for scroll to complete
                await new Promise(resolve => setTimeout(resolve, 100));

                const model = editor.getModel();
                if (!model) {
                    setCoordinates(null);
                    return;
                }

                // Validate position
                const lineCount = model.getLineCount();
                if (position.line < 1 || position.line > lineCount) {
                    console.warn(`[GhostCursor] Line ${position.line} out of range (1-${lineCount})`);
                    setCoordinates(null);
                    return;
                }

                const lineMaxColumn = model.getLineMaxColumn(position.line);
                const safeColumn = Math.min(Math.max(1, position.column), lineMaxColumn);

                // Get coordinates
                const top = editor.getTopForLineNumber(position.line) - editor.getScrollTop();
                const left = editor.getOffsetForColumn(position.line, safeColumn);

                console.log(`[GhostCursor] Coordinates: top=${top}, left=${left}`);

                // Validate coordinates
                if (top < 0 || left < 0 || !isFinite(top) || !isFinite(left)) {
                    console.warn('[GhostCursor] Invalid coordinates, hiding cursor');
                    setCoordinates(null);
                    return;
                }

                setCoordinates({ top, left });
            } catch (error) {
                console.error('[GhostCursor] Error calculating coordinates:', error);
                setCoordinates(null);
            }
        };

        updateCoordinates();

        // Listen to editor changes
        const disposable = editor.onDidScrollChange(() => {
            updateCoordinates();
        });

        return () => disposable.dispose();
    }, [editor, position, isVisible]);

    if (!coordinates || !isVisible) {
        return null;
    }

    return (
        <div
            className="ghost-cursor"
            style={{
                position: 'absolute',
                top: `${coordinates.top}px`,
                left: `${coordinates.left}px`,
                width: '2px',
                height: '20px',
                backgroundColor: '#00ff00',
                animation: 'blink 1s infinite',
                pointerEvents: 'none',
                zIndex: 9999,
                boxShadow: '0 0 8px #00ff00'
            }}
        />
    );
};
