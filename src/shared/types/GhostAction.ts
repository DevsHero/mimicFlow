/**
 * Core action types for the cinematic playback
 */
export type GhostAction =
    | ScrollToAction
    | MoveCursorAction
    | SelectAction
    | BackspaceAction
    | TypeAction;

export interface ScrollToAction {
    type: 'scroll';
    line: number;
    delayMs?: number;
}

export interface MoveCursorAction {
    type: 'moveCursor';
    line: number;
    column: number;
    delayMs?: number;
}

export interface SelectAction {
    type: 'select';
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    delayMs?: number;
}

export interface BackspaceAction {
    type: 'backspace';
    count: number;
    delayMs?: number;
}

export interface TypeAction {
    type: 'type';
    text: string;
    delayMs?: number;
}
