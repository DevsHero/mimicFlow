import DiffMatchPatch from 'diff-match-patch';
import { GhostAction } from '../../shared/types/GhostAction';
import {
    DEFAULT_TYPING_SPEED,
    DEFAULT_CURSOR_MOVE_SPEED,
    DEFAULT_BACKSPACE_SPEED,
    DEFAULT_SELECT_SPEED
} from '../../shared/constants/config';

/**
 * Position tracker for cursor during diff processing
 */
interface Position {
    line: number;
    column: number;
}

export class DiffEngine {
    private dmp: any;

    constructor() {
        // @ts-ignore - diff-match-patch has typing issues
        this.dmp = new DiffMatchPatch();
    }

    /**
     * Main entry point: Convert text content differences into a sequence of GhostActions
     * CRITICAL: Maintains cursor position tracking through ALL diff segments
     */
    public computeChanges(oldContent: string, newContent: string): GhostAction[] {
        const diffs = this.dmp.diff_main(oldContent, newContent);
        this.dmp.diff_cleanupSemantic(diffs);

        const actions: GhostAction[] = [];

        // State tracking: Current cursor position in the document
        let currentLine = 1;
        let currentColumn = 1;

        // Track if we need to scroll/move before the next action
        let needsScrollAndMove = true;

        for (const [operation, text] of diffs) {
            if (operation === 0) { // DIFF_EQUAL - Unchanged text
                // CRITICAL: Advance cursor position through unchanged segments
                // This is where the bug was - we MUST track position through equal segments
                const positionUpdate = this.calculatePositionAfterText(currentLine, currentColumn, text);
                currentLine = positionUpdate.line;
                currentColumn = positionUpdate.column;

                // Mark that we need to scroll/move when we hit the next change
                needsScrollAndMove = true;

            } else if (operation === -1) { // DIFF_DELETE
                // Before deleting, scroll to the location if needed
                if (needsScrollAndMove) {
                    actions.push({
                        type: 'scroll',
                        line: currentLine,
                        delayMs: 100
                    });

                    actions.push({
                        type: 'moveCursor',
                        line: currentLine,
                        column: currentColumn,
                        delayMs: DEFAULT_CURSOR_MOVE_SPEED
                    });

                    needsScrollAndMove = false;
                }

                // Calculate the end position of the deletion
                const endPos = this.calculatePositionAfterText(currentLine, currentColumn, text);

                // Select the text to be deleted
                actions.push({
                    type: 'select',
                    startLine: currentLine,
                    startColumn: currentColumn,
                    endLine: endPos.line,
                    endColumn: endPos.column,
                    delayMs: DEFAULT_SELECT_SPEED
                });

                // Delete the selected text
                actions.push({
                    type: 'backspace',
                    count: text.length,
                    delayMs: DEFAULT_BACKSPACE_SPEED
                });

                // CRITICAL: After deletion, cursor stays at the START position
                // (currentLine, currentColumn remain unchanged)

            } else if (operation === 1) { // DIFF_INSERT
                // Before inserting, scroll to the location if needed
                if (needsScrollAndMove) {
                    actions.push({
                        type: 'scroll',
                        line: currentLine,
                        delayMs: 100
                    });

                    actions.push({
                        type: 'moveCursor',
                        line: currentLine,
                        column: currentColumn,
                        delayMs: DEFAULT_CURSOR_MOVE_SPEED
                    });

                    needsScrollAndMove = false;
                }

                // Type the text (chunked for natural animation)
                const chunks = this.chunkText(text);
                for (const chunk of chunks) {
                    actions.push({
                        type: 'type',
                        text: chunk,
                        delayMs: DEFAULT_TYPING_SPEED * chunk.length
                    });
                }

                // CRITICAL: After typing, advance cursor position
                const newPos = this.calculatePositionAfterText(currentLine, currentColumn, text);
                currentLine = newPos.line;
                currentColumn = newPos.column;
            }
        }

        return actions;
    }

    /**
     * Calculate new cursor position after processing text
     * This function handles both single-line and multi-line text correctly
     */
    private calculatePositionAfterText(startLine: number, startColumn: number, text: string): Position {
        const lines = text.split('\n');

        if (lines.length === 1) {
            // Single line: just advance column
            return {
                line: startLine,
                column: startColumn + text.length
            };
        } else {
            // Multi-line: advance to last line and set column to length of last segment
            return {
                line: startLine + lines.length - 1,
                column: lines[lines.length - 1].length + 1
            };
        }
    }

    /**
     * Break text into natural chunks for typing animation
     * This makes the animation more human-like
     */
    private chunkText(text: string): string[] {
        const chunks: string[] = [];
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // If not the last line, include the newline
            if (i < lines.length - 1) {
                chunks.push(line + '\n');
            } else {
                chunks.push(line);
            }
        }

        return chunks;
    }

    /**
     * Calculate statistics from diff
     */
    public calculateStats(originalContent: string, newContent: string) {
        const diffs = this.dmp.diff_main(originalContent, newContent);
        this.dmp.diff_cleanupSemantic(diffs);

        let linesAdded = 0;
        let linesDeleted = 0;
        let charsAdded = 0;
        let charsDeleted = 0;

        for (const [operation, text] of diffs) {
            const newlineCount = (text.match(/\n/g) || []).length;

            if (operation === 1) { // DIFF_INSERT
                linesAdded += newlineCount;
                if (newlineCount === 0 && text.length > 0) {
                    linesAdded += 1; // Count at least one line for non-empty text
                }
                charsAdded += text.length;
            } else if (operation === -1) { // DIFF_DELETE
                linesDeleted += newlineCount;
                if (newlineCount === 0 && text.length > 0) {
                    linesDeleted += 1;
                }
                charsDeleted += text.length;
            }
        }

        return { linesAdded, linesDeleted, charsAdded, charsDeleted };
    }
}
