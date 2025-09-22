import { EdgeType, EdgeDirection, EdgeShape, ConnectionPoint, PieceBounds, PieceSide, Position, PieceShape } from './types.js';
import { GAME_CONSTANTS, MathUtils } from './utils.js';

export class PuzzlePiece {
    originalX: number;
    originalY: number;
    x: number;
    y: number;
    width: number;
    height: number;
    image: HTMLImageElement | string;
    gridX: number;
    gridY: number;
    gridCols: number;
    gridRows: number;
    correctX: number;
    correctY: number;
    placed: boolean;
    rotation: number;
    shape: PieceShape;
    pieceImage: HTMLImageElement | null;
    private cachedPath: Path2D | null;

    constructor(
        x: number,
        y: number,
        width: number,
        height: number,
        image: HTMLImageElement | string,
        gridX: number,
        gridY: number,
        gridCols: number,
        gridRows: number,
        shapeSeedFn: (x: number, y: number) => number
    ) {
        this.originalX = x;
        this.originalY = y;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.image = image;
        this.gridX = gridX;
        this.gridY = gridY;
        this.gridCols = gridCols;
        this.gridRows = gridRows;
        this.correctX = x;
        this.correctY = y;
        this.placed = false;
        this.rotation = 0;
        this.pieceImage = null;
        this.cachedPath = null;

        this.shape = this.generateShape(shapeSeedFn);
        this.initializePieceImage(image);
    }

    private initializePieceImage(image: HTMLImageElement | string): void {
        if (typeof image === 'string' && image.startsWith('data:')) {
            const img = new Image();
            img.src = image;
            this.pieceImage = img;
        } else if (image instanceof HTMLImageElement) {
            this.pieceImage = image;
        }
    }

    private generateShape(seedFn: (x: number, y: number) => number): PieceShape {
        return {
            top: this.generateEdgeShape('top', seedFn),
            right: this.generateEdgeShape('right', seedFn),
            bottom: this.generateEdgeShape('bottom', seedFn),
            left: this.generateEdgeShape('left', seedFn)
        };
    }

    private generateEdgeShape(side: PieceSide, seedFn: (x: number, y: number) => number): EdgeShape {
        if (this.isEdgePiece(side)) {
            return { type: 'flat', seed: 0 };
        }

        const { seedX, seedY } = this.getSeedCoordinates(side);
        const seed = seedFn(seedX, seedY);
        const direction = this.getComplementaryDirection(side, seedFn);

        return {
            type: 'tab',
            direction,
            seed
        };
    }

    private isEdgePiece(side: PieceSide): boolean {
        switch (side) {
            case 'top': return this.gridY === 0;
            case 'right': return this.gridX === this.gridCols - 1;
            case 'bottom': return this.gridY === this.gridRows - 1;
            case 'left': return this.gridX === 0;
        }
    }

    private getSeedCoordinates(side: PieceSide): { seedX: number; seedY: number } {
        switch (side) {
            case 'top': return { seedX: this.gridX, seedY: this.gridY - 1 };
            case 'right': return { seedX: this.gridX, seedY: this.gridY };
            case 'bottom': return { seedX: this.gridX, seedY: this.gridY };
            case 'left': return { seedX: this.gridX - 1, seedY: this.gridY };
        }
    }

    private getComplementaryDirection(side: PieceSide, seedFn: (x: number, y: number) => number): EdgeDirection {
        const { seedX, seedY } = this.getSeedCoordinates(side);
        const seed = seedFn(seedX, seedY);
        const baseDirection = this.matchDirection(seed);

        if (side === 'top' || side === 'left') {
            return baseDirection === 'out' ? 'in' : 'out';
        }
        
        return baseDirection;
    }

    private matchDirection(seed: number): EdgeDirection {
        return seed % 2 === 0 ? 'in' : 'out';
    }

    private buildPath(): Path2D {
        if (this.cachedPath) {
            return this.cachedPath;
        }

        const path = new Path2D();
        const tabSize = Math.min(this.width, this.height) * GAME_CONSTANTS.TAB_SIZE_RATIO;
        const tabCurve = tabSize * GAME_CONSTANTS.TAB_CURVE_RATIO;

        path.moveTo(0, 0);
        
        this.addEdgeToPath(path, 'top', tabSize, tabCurve);
        this.addEdgeToPath(path, 'right', tabSize, tabCurve);
        this.addEdgeToPath(path, 'bottom', tabSize, tabCurve);
        this.addEdgeToPath(path, 'left', tabSize, tabCurve);

        this.cachedPath = path;
        return path;
    }

    private addEdgeToPath(path: Path2D, side: PieceSide, tabSize: number, tabCurve: number): void {
        const edge = this.shape[side];
        
        if (edge.type === 'tab' && edge.direction) {
            this.addTabEdge(path, side, tabSize, tabCurve, edge.direction);
        } else {
            this.addFlatEdge(path, side);
        }
    }

    private addFlatEdge(path: Path2D, side: PieceSide): void {
        switch (side) {
            case 'top': path.lineTo(this.width, 0); break;
            case 'right': path.lineTo(this.width, this.height); break;
            case 'bottom': path.lineTo(0, this.height); break;
            case 'left': path.closePath(); break;
        }
    }

    private addTabEdge(path: Path2D, side: PieceSide, tabSize: number, tabCurve: number, direction: EdgeDirection): void {
        const sign = direction === 'out' ? 1 : -1;

        switch (side) {
            case 'top': {
                const mid = this.width / 2;
                path.lineTo(mid - tabSize / 2, 0);
                path.bezierCurveTo(
                    mid - tabSize / 2, -sign * tabCurve,
                    mid + tabSize / 2, -sign * tabCurve,
                    mid + tabSize / 2, 0
                );
                path.lineTo(this.width, 0);
                break;
            }
            case 'right': {
                const mid = this.height / 2;
                path.lineTo(this.width, mid - tabSize / 2);
                path.bezierCurveTo(
                    this.width + sign * tabCurve, mid - tabSize / 2,
                    this.width + sign * tabCurve, mid + tabSize / 2,
                    this.width, mid + tabSize / 2
                );
                path.lineTo(this.width, this.height);
                break;
            }
            case 'bottom': {
                const mid = this.width / 2;
                path.lineTo(mid + tabSize / 2, this.height);
                path.bezierCurveTo(
                    mid + tabSize / 2, this.height + sign * tabCurve,
                    mid - tabSize / 2, this.height + sign * tabCurve,
                    mid - tabSize / 2, this.height
                );
                path.lineTo(0, this.height);
                break;
            }
            case 'left': {
                const mid = this.height / 2;
                path.lineTo(0, mid + tabSize / 2);
                path.bezierCurveTo(
                    -sign * tabCurve, mid + tabSize / 2,
                    -sign * tabCurve, mid - tabSize / 2,
                    0, mid - tabSize / 2
                );
                path.closePath();
                break;
            }
        }
    }

    isPointInside(px: number, py: number): boolean {
        const center = { x: this.x + this.width / 2, y: this.y + this.height / 2 };
        const point = { x: px, y: py };
        
        const localPoint = this.transformToLocal(point, center);
        
        if (localPoint.x < 0 || localPoint.y < 0 || 
            localPoint.x > this.width || localPoint.y > this.height) {
            return false;
        }

        const path = this.buildPath();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;

        return ctx.isPointInPath(path, localPoint.x, localPoint.y);
    }

    private transformToLocal(point: Position, center: Position): Position {
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        const dx = point.x - center.x;
        const dy = point.y - center.y;

        return {
            x: dx * cos + dy * sin + this.width / 2,
            y: -dx * sin + dy * cos + this.height / 2
        };
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        
        if (this.rotation !== 0) {
            ctx.rotate(this.rotation);
        }
        
        ctx.translate(-this.width / 2, -this.height / 2);

        const path = this.buildPath();
        
        if (this.pieceImage && this.pieceImage.complete) {
            ctx.save();
            ctx.clip(path);
            
            const tabSize = Math.min(this.width, this.height) * GAME_CONSTANTS.TAB_SIZE_RATIO;
            const tabExtension = tabSize * GAME_CONSTANTS.TAB_CURVE_RATIO;
            
            ctx.drawImage(
                this.pieceImage,
                -tabExtension, -tabExtension,
                this.width + tabExtension * 2, this.height + tabExtension * 2
            );
            ctx.restore();
        } else {
            ctx.fillStyle = '#f0f0f0';
            ctx.fill(path);
        }

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#555';
        ctx.stroke(path);
        
        ctx.restore();
    }

    drawOutline(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        
        if (this.rotation !== 0) {
            ctx.rotate(this.rotation);
        }
        
        ctx.translate(-this.width / 2, -this.height / 2);

        const path = this.buildPath();
        ctx.stroke(path);
        
        ctx.restore();
    }

    getConnectionPoints(): ConnectionPoint[] {
        const points: ConnectionPoint[] = [];
        const center = { x: this.x + this.width / 2, y: this.y + this.height / 2 };

        const sides: PieceSide[] = ['top', 'right', 'bottom', 'left'];
        
        for (const side of sides) {
            const edge = this.shape[side];
            if (edge.type === 'tab' && edge.direction) {
                const localPoint = this.getLocalConnectionPoint(side);
                const worldPoint = this.transformToWorld(localPoint, center);
                
                points.push({
                    x: worldPoint.x,
                    y: worldPoint.y,
                    side,
                    type: edge.direction
                });
            }
        }

        return points;
    }

    private getLocalConnectionPoint(side: PieceSide): Position {
        switch (side) {
            case 'top': return { x: this.width / 2, y: 0 };
            case 'right': return { x: this.width, y: this.height / 2 };
            case 'bottom': return { x: this.width / 2, y: this.height };
            case 'left': return { x: 0, y: this.height / 2 };
        }
    }

    private transformToWorld(localPoint: Position, center: Position): Position {
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        const dx = localPoint.x - this.width / 2;
        const dy = localPoint.y - this.height / 2;

        return {
            x: center.x + (dx * cos - dy * sin),
            y: center.y + (dx * sin + dy * cos)
        };
    }

    canConnect(other: PuzzlePiece, point: ConnectionPoint): boolean {
        const otherPoints = other.getConnectionPoints();
        const tolerance = Math.min(this.width, this.height) * GAME_CONSTANTS.CONNECTION_TOLERANCE_RATIO;
        
        for (const otherPoint of otherPoints) {
            const distance = MathUtils.distance(point, otherPoint);
            
            if (distance < tolerance && point.type !== otherPoint.type) {
                return true;
            }
        }
        
        return false;
    }

    getBounds(): PieceBounds {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }

    collidesWith(other: PuzzlePiece): boolean {
        const a = this.getBounds();
        const b = other.getBounds();
        
        return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    }

    invalidateCache(): void {
        this.cachedPath = null;
    }

}
