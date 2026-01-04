export interface PlayerState {
    isPlaying: boolean;
    currentActionIndex: number;
    speed: number; // 1x, 2x, 4x
    progress: number; // 0-100
}

export interface CursorPosition {
    line: number;
    column: number;
    x: number;
    y: number;
}
