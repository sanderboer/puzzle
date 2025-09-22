import { GAME_CONSTANTS, MathUtils } from './utils.js';
export class PuzzlePiece {
    constructor(x, y, width, height, image, gridX, gridY, gridCols, gridRows, shapeSeedFn) {
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
    initializePieceImage(image) {
        if (typeof image === 'string' && image.startsWith('data:')) {
            const img = new Image();
            img.src = image;
            this.pieceImage = img;
        }
        else if (image instanceof HTMLImageElement) {
            this.pieceImage = image;
        }
    }
    generateShape(seedFn) {
        return {
            top: this.generateEdgeShape('top', seedFn),
            right: this.generateEdgeShape('right', seedFn),
            bottom: this.generateEdgeShape('bottom', seedFn),
            left: this.generateEdgeShape('left', seedFn)
        };
    }
    generateEdgeShape(side, seedFn) {
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
    isEdgePiece(side) {
        switch (side) {
            case 'top': return this.gridY === 0;
            case 'right': return this.gridX === this.gridCols - 1;
            case 'bottom': return this.gridY === this.gridRows - 1;
            case 'left': return this.gridX === 0;
        }
    }
    getSeedCoordinates(side) {
        switch (side) {
            case 'top': return { seedX: this.gridX, seedY: this.gridY - 1 };
            case 'right': return { seedX: this.gridX, seedY: this.gridY };
            case 'bottom': return { seedX: this.gridX, seedY: this.gridY };
            case 'left': return { seedX: this.gridX - 1, seedY: this.gridY };
        }
    }
    getComplementaryDirection(side, seedFn) {
        const { seedX, seedY } = this.getSeedCoordinates(side);
        const seed = seedFn(seedX, seedY);
        const baseDirection = this.matchDirection(seed);
        if (side === 'top' || side === 'left') {
            return baseDirection === 'out' ? 'in' : 'out';
        }
        return baseDirection;
    }
    matchDirection(seed) {
        return seed % 2 === 0 ? 'in' : 'out';
    }
    buildPath() {
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
    addEdgeToPath(path, side, tabSize, tabCurve) {
        const edge = this.shape[side];
        if (edge.type === 'tab' && edge.direction) {
            this.addTabEdge(path, side, tabSize, tabCurve, edge.direction);
        }
        else {
            this.addFlatEdge(path, side);
        }
    }
    addFlatEdge(path, side) {
        switch (side) {
            case 'top':
                path.lineTo(this.width, 0);
                break;
            case 'right':
                path.lineTo(this.width, this.height);
                break;
            case 'bottom':
                path.lineTo(0, this.height);
                break;
            case 'left':
                path.closePath();
                break;
        }
    }
    addTabEdge(path, side, tabSize, tabCurve, direction) {
        const sign = direction === 'out' ? 1 : -1;
        switch (side) {
            case 'top': {
                const mid = this.width / 2;
                path.lineTo(mid - tabSize / 2, 0);
                path.bezierCurveTo(mid - tabSize / 2, -sign * tabCurve, mid + tabSize / 2, -sign * tabCurve, mid + tabSize / 2, 0);
                path.lineTo(this.width, 0);
                break;
            }
            case 'right': {
                const mid = this.height / 2;
                path.lineTo(this.width, mid - tabSize / 2);
                path.bezierCurveTo(this.width + sign * tabCurve, mid - tabSize / 2, this.width + sign * tabCurve, mid + tabSize / 2, this.width, mid + tabSize / 2);
                path.lineTo(this.width, this.height);
                break;
            }
            case 'bottom': {
                const mid = this.width / 2;
                path.lineTo(mid + tabSize / 2, this.height);
                path.bezierCurveTo(mid + tabSize / 2, this.height + sign * tabCurve, mid - tabSize / 2, this.height + sign * tabCurve, mid - tabSize / 2, this.height);
                path.lineTo(0, this.height);
                break;
            }
            case 'left': {
                const mid = this.height / 2;
                path.lineTo(0, mid + tabSize / 2);
                path.bezierCurveTo(-sign * tabCurve, mid + tabSize / 2, -sign * tabCurve, mid - tabSize / 2, 0, mid - tabSize / 2);
                path.closePath();
                break;
            }
        }
    }
    isPointInside(px, py) {
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
        if (!ctx)
            return false;
        return ctx.isPointInPath(path, localPoint.x, localPoint.y);
    }
    transformToLocal(point, center) {
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        return {
            x: dx * cos + dy * sin + this.width / 2,
            y: -dx * sin + dy * cos + this.height / 2
        };
    }
    draw(ctx) {
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
            ctx.drawImage(this.pieceImage, -tabExtension, -tabExtension, this.width + tabExtension * 2, this.height + tabExtension * 2);
            ctx.restore();
        }
        else {
            ctx.fillStyle = '#f0f0f0';
            ctx.fill(path);
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#555';
        ctx.stroke(path);
        ctx.restore();
    }
    drawOutline(ctx) {
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
    getConnectionPoints() {
        const points = [];
        const center = { x: this.x + this.width / 2, y: this.y + this.height / 2 };
        const sides = ['top', 'right', 'bottom', 'left'];
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
    getLocalConnectionPoint(side) {
        switch (side) {
            case 'top': return { x: this.width / 2, y: 0 };
            case 'right': return { x: this.width, y: this.height / 2 };
            case 'bottom': return { x: this.width / 2, y: this.height };
            case 'left': return { x: 0, y: this.height / 2 };
        }
    }
    transformToWorld(localPoint, center) {
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        const dx = localPoint.x - this.width / 2;
        const dy = localPoint.y - this.height / 2;
        return {
            x: center.x + (dx * cos - dy * sin),
            y: center.y + (dx * sin + dy * cos)
        };
    }
    canConnect(other, point) {
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
    getBounds() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }
    collidesWith(other) {
        const a = this.getBounds();
        const b = other.getBounds();
        return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    }
    invalidateCache() {
        this.cachedPath = null;
    }
}
//# sourceMappingURL=PuzzlePiece.js.map