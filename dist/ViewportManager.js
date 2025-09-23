import { MathUtils } from './utils.js';
export class ViewportManager {
    constructor(canvas) {
        this.viewport = { x: 0, y: 0, zoom: 1 };
        this.minZoom = 0.5;
        this.maxZoom = 3;
        this.panBounds = {
            left: -1000, right: 1000, top: -1000, bottom: 1000
        };
        this.canvas = canvas;
    }
    getViewport() {
        return { ...this.viewport };
    }
    setViewport(viewport) {
        this.viewport = {
            x: viewport.x !== undefined ? viewport.x : this.viewport.x,
            y: viewport.y !== undefined ? viewport.y : this.viewport.y,
            zoom: viewport.zoom !== undefined ? MathUtils.clamp(viewport.zoom, this.minZoom, this.maxZoom) : this.viewport.zoom
        };
        this.constrainViewport();
    }
    resetViewport() {
        this.viewport = { x: 0, y: 0, zoom: 1 };
    }
    pan(deltaX, deltaY) {
        this.viewport.x -= deltaX / this.viewport.zoom;
        this.viewport.y -= deltaY / this.viewport.zoom;
        this.constrainViewport();
    }
    zoom(factor, centerX, centerY) {
        const oldZoom = this.viewport.zoom;
        const newZoom = MathUtils.clamp(oldZoom * factor, this.minZoom, this.maxZoom);
        if (newZoom === oldZoom)
            return;
        if (centerX !== undefined && centerY !== undefined) {
            // Calculate where the center point is in world coordinates before zoom
            const worldX = (centerX / oldZoom) + this.viewport.x;
            const worldY = (centerY / oldZoom) + this.viewport.y;
            // Update zoom
            this.viewport.zoom = newZoom;
            // Adjust viewport so the same world point appears at the center screen position
            this.viewport.x = worldX - (centerX / newZoom);
            this.viewport.y = worldY - (centerY / newZoom);
        }
        else {
            this.viewport.zoom = newZoom;
        }
        this.constrainViewport();
    }
    screenToWorld(screenPoint) {
        return {
            x: (screenPoint.x / this.viewport.zoom) + this.viewport.x,
            y: (screenPoint.y / this.viewport.zoom) + this.viewport.y
        };
    }
    worldToScreen(worldPoint) {
        return {
            x: (worldPoint.x - this.viewport.x) * this.viewport.zoom,
            y: (worldPoint.y - this.viewport.y) * this.viewport.zoom
        };
    }
    applyTransform(ctx) {
        ctx.setTransform(this.viewport.zoom, 0, 0, this.viewport.zoom, -this.viewport.x * this.viewport.zoom, -this.viewport.y * this.viewport.zoom);
    }
    setPanBounds(left, right, top, bottom) {
        this.panBounds = { left, right, top, bottom };
        this.constrainViewport();
    }
    setZoomLimits(min, max) {
        this.minZoom = min;
        this.maxZoom = max;
        this.viewport.zoom = MathUtils.clamp(this.viewport.zoom, this.minZoom, this.maxZoom);
    }
    constrainViewport() {
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const viewWidth = canvasWidth / this.viewport.zoom;
        const viewHeight = canvasHeight / this.viewport.zoom;
        // Allow more freedom when zoomed out (smaller zoom values)
        // When zoomed out, allow panning beyond content bounds for better UX
        const panMargin = Math.max(viewWidth, viewHeight) * 0.5; // Extra margin when zoomed out
        this.viewport.x = MathUtils.clamp(this.viewport.x, this.panBounds.left - panMargin, Math.max(this.panBounds.right - viewWidth + panMargin, this.panBounds.left));
        this.viewport.y = MathUtils.clamp(this.viewport.y, this.panBounds.top - panMargin, Math.max(this.panBounds.bottom - viewHeight + panMargin, this.panBounds.top));
    }
    fitToContent(contentBounds, padding = 50) {
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const contentWidth = contentBounds.right - contentBounds.left;
        const contentHeight = contentBounds.bottom - contentBounds.top;
        const zoomX = (canvasWidth - padding * 2) / contentWidth;
        const zoomY = (canvasHeight - padding * 2) / contentHeight;
        const zoom = Math.min(zoomX, zoomY, this.maxZoom);
        this.viewport.zoom = Math.max(zoom, this.minZoom);
        this.viewport.x = contentBounds.left - (canvasWidth / this.viewport.zoom - contentWidth) / 2;
        this.viewport.y = contentBounds.top - (canvasHeight / this.viewport.zoom - contentHeight) / 2;
        this.constrainViewport();
    }
}
//# sourceMappingURL=ViewportManager.js.map