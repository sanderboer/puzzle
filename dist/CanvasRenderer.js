import { GAME_CONSTANTS, TimeUtils } from './utils.js';
import { ViewportManager } from './ViewportManager.js';
export class CanvasRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }
        const context = this.canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get 2D rendering context');
        }
        this.ctx = context;
        this.viewportManager = new ViewportManager(this.canvas);
    }
    getCanvas() {
        return this.canvas;
    }
    getContext() {
        return this.ctx;
    }
    getViewportManager() {
        return this.viewportManager;
    }
    resizeCanvas(containerElement, gridCols, gridRows, pieceSize) {
        const totalWidth = gridCols * pieceSize + 60;
        const totalHeight = gridRows * pieceSize + 60;
        this.canvas.width = Math.max(containerElement.clientWidth * GAME_CONSTANTS.CANVAS_WIDTH_RATIO, totalWidth);
        this.canvas.height = Math.max(containerElement.clientHeight * GAME_CONSTANTS.CANVAS_HEIGHT_RATIO, totalHeight);
    }
    clear() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }
    drawPieces(pieces, selectedPiece) {
        if (this.shouldThrottleRender()) {
            return;
        }
        this.clear();
        this.ctx.save();
        this.viewportManager.applyTransform(this.ctx);
        const placedPieces = pieces.filter(p => p.placed);
        const unplacedPieces = pieces.filter(p => !p.placed);
        [...placedPieces, ...unplacedPieces].forEach(piece => {
            piece.draw(this.ctx);
        });
        if (selectedPiece && !selectedPiece.placed) {
            this.drawSelectedPieceOutline(selectedPiece);
        }
        this.ctx.restore();
    }
    shouldThrottleRender() {
        const now = Date.now();
        if (this.lastDrawTime && now - this.lastDrawTime < GAME_CONSTANTS.DRAW_THROTTLE_MS) {
            return true;
        }
        this.lastDrawTime = now;
        return false;
    }
    drawSelectedPieceOutline(piece) {
        this.ctx.save();
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 3;
        piece.drawOutline(this.ctx);
        this.ctx.restore();
    }
    drawConnectionIndicators(selectedPiece, pieces, getGroup, canConnect) {
        if (selectedPiece.placed)
            return;
        this.ctx.save();
        this.viewportManager.applyTransform(this.ctx);
        for (const otherPiece of pieces) {
            if (otherPiece === selectedPiece)
                continue;
            if (getGroup(otherPiece) === getGroup(selectedPiece))
                continue;
            if (canConnect(selectedPiece, otherPiece)) {
                this.ctx.save();
                this.ctx.strokeStyle = '#e74c3c';
                this.ctx.setLineDash([5, 5]);
                this.ctx.strokeRect(otherPiece.x - 2, otherPiece.y - 2, otherPiece.width + 4, otherPiece.height + 4);
                this.ctx.restore();
            }
        }
        this.ctx.restore();
    }
    drawConnectionPreview(draggedPiece, pieces, getGroup) {
        this.ctx.save();
        this.viewportManager.applyTransform(this.ctx);
        for (const otherPiece of pieces) {
            if (otherPiece === draggedPiece)
                continue;
            if (getGroup(otherPiece) === getGroup(draggedPiece))
                continue;
            const connectionPoints = draggedPiece.getConnectionPoints();
            for (const point of connectionPoints) {
                if (draggedPiece.canConnect(otherPiece, point)) {
                    this.ctx.save();
                    this.ctx.strokeStyle = '#e74c3c';
                    this.ctx.setLineDash([5, 5]);
                    this.ctx.beginPath();
                    this.ctx.moveTo(point.x, point.y);
                    this.ctx.lineTo(draggedPiece.x + draggedPiece.width / 2, draggedPiece.y + draggedPiece.height / 2);
                    this.ctx.stroke();
                    this.ctx.restore();
                    break;
                }
            }
        }
        this.ctx.restore();
    }
    drawWinOverlay(timer) {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Completed!', this.canvas.width / 2, this.canvas.height / 2 - 20);
        this.ctx.font = '20px Arial';
        const timeString = TimeUtils.formatTime(timer.elapsed);
        this.ctx.fillText(`Time: ${timeString}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        this.ctx.restore();
    }
    draw(pieces, gameState, selectedPiece, draggedPiece, timer, getGroup, canConnect) {
        this.drawPieces(pieces, selectedPiece);
        if (draggedPiece && getGroup) {
            this.drawConnectionPreview(draggedPiece, pieces, getGroup);
        }
        if (selectedPiece && getGroup && canConnect) {
            this.drawConnectionIndicators(selectedPiece, pieces, getGroup, canConnect);
        }
        if (gameState === 'completed' && timer) {
            this.drawWinOverlay(timer);
        }
    }
    updateViewportBounds(pieces) {
        if (pieces.length === 0)
            return;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (const piece of pieces) {
            minX = Math.min(minX, piece.x);
            maxX = Math.max(maxX, piece.x + piece.width);
            minY = Math.min(minY, piece.y);
            maxY = Math.max(maxY, piece.y + piece.height);
        }
        const padding = 200;
        this.viewportManager.setPanBounds(minX - padding, maxX + padding, minY - padding, maxY + padding);
    }
    fitToContent(pieces) {
        if (pieces.length === 0)
            return;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (const piece of pieces) {
            minX = Math.min(minX, piece.x);
            maxX = Math.max(maxX, piece.x + piece.width);
            minY = Math.min(minY, piece.y);
            maxY = Math.max(maxY, piece.y + piece.height);
        }
        this.viewportManager.fitToContent({
            left: minX,
            right: maxX,
            top: minY,
            bottom: maxY
        });
    }
}
//# sourceMappingURL=CanvasRenderer.js.map