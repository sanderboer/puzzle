export type EdgeType = 'flat' | 'tab';
export type EdgeDirection = 'in' | 'out';
export type PieceSide = 'top' | 'right' | 'bottom' | 'left';
export type GameState = 'menu' | 'playing' | 'completed';

export interface EdgeShape {
    type: EdgeType;
    direction?: EdgeDirection;
    seed: number;
}

export interface ConnectionPoint {
    x: number;
    y: number;
    side: PieceSide;
    type: EdgeDirection;
}

export interface PieceBounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

export interface Position {
    x: number;
    y: number;
}

export interface ScatterPosition extends Position {}

export interface Timer {
    start: number;
    elapsed: number;
}

export interface GroupDragEntry {
    piece: import('./PuzzlePiece.js').PuzzlePiece;
    x: number;
    y: number;
}

export interface GroupDragData {
    startMouseX: number;
    startMouseY: number;
    pieces: GroupDragEntry[];
}

export interface PieceShape {
    top: EdgeShape;
    right: EdgeShape;
    bottom: EdgeShape;
    left: EdgeShape;
}

export interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

export interface TouchData {
    identifier: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

export interface PinchData {
    startDistance: number;
    startZoom: number;
    centerX: number;
    centerY: number;
}