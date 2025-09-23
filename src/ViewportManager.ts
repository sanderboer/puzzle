import { Viewport, Position } from './types.js';
import { MathUtils } from './utils.js';

export class ViewportManager {
    private viewport: Viewport = { x: 0, y: 0, zoom: 1 };
    private canvas: HTMLCanvasElement;
    private minZoom = 0.5;
    private maxZoom = 3;
    private panBounds: { left: number; right: number; top: number; bottom: number } = {
        left: -1000, right: 1000, top: -1000, bottom: 1000
    };

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    getViewport(): Viewport {
        return { ...this.viewport };
    }

    setViewport(viewport: Partial<Viewport>): void {
        this.viewport = {
            x: viewport.x !== undefined ? viewport.x : this.viewport.x,
            y: viewport.y !== undefined ? viewport.y : this.viewport.y,
            zoom: viewport.zoom !== undefined ? MathUtils.clamp(viewport.zoom, this.minZoom, this.maxZoom) : this.viewport.zoom
        };
        this.constrainViewport();
    }

    resetViewport(): void {
        this.viewport = { x: 0, y: 0, zoom: 1 };
    }

    pan(deltaX: number, deltaY: number): void {
        this.viewport.x += deltaX / this.viewport.zoom;
        this.viewport.y += deltaY / this.viewport.zoom;
        this.constrainViewport();
    }

    zoom(factor: number, centerX?: number, centerY?: number): void {
        const oldZoom = this.viewport.zoom;
        const newZoom = MathUtils.clamp(oldZoom * factor, this.minZoom, this.maxZoom);
        
        if (newZoom === oldZoom) return;

        if (centerX !== undefined && centerY !== undefined) {
            console.log('VIEWPORT ZOOM DEBUG:');
            console.log('  Center coordinates:', centerX, centerY);
            console.log('  Canvas dimensions:', this.canvas.width, this.canvas.height);
            
            const worldPoint = this.screenToWorld({ x: centerX, y: centerY });
            console.log('  World point:', worldPoint);
            
            this.viewport.zoom = newZoom;
            const newScreenPoint = this.worldToScreen(worldPoint);
            console.log('  New screen point:', newScreenPoint);
            
            this.viewport.x += (centerX - newScreenPoint.x) / this.viewport.zoom;
            this.viewport.y += (centerY - newScreenPoint.y) / this.viewport.zoom;
        } else {
            this.viewport.zoom = newZoom;
        }
        
        this.constrainViewport();
    }

    screenToWorld(screenPoint: Position): Position {
        return {
            x: (screenPoint.x / this.viewport.zoom) + this.viewport.x,
            y: (screenPoint.y / this.viewport.zoom) + this.viewport.y
        };
    }

    worldToScreen(worldPoint: Position): Position {
        return {
            x: (worldPoint.x - this.viewport.x) * this.viewport.zoom,
            y: (worldPoint.y - this.viewport.y) * this.viewport.zoom
        };
    }

    applyTransform(ctx: CanvasRenderingContext2D): void {
        ctx.setTransform(
            this.viewport.zoom, 0, 0, this.viewport.zoom,
            -this.viewport.x * this.viewport.zoom,
            -this.viewport.y * this.viewport.zoom
        );
    }

    setPanBounds(left: number, right: number, top: number, bottom: number): void {
        this.panBounds = { left, right, top, bottom };
        this.constrainViewport();
    }

    setZoomLimits(min: number, max: number): void {
        this.minZoom = min;
        this.maxZoom = max;
        this.viewport.zoom = MathUtils.clamp(this.viewport.zoom, this.minZoom, this.maxZoom);
    }

    private constrainViewport(): void {
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        const viewWidth = canvasWidth / this.viewport.zoom;
        const viewHeight = canvasHeight / this.viewport.zoom;
        
        // Allow more freedom when zoomed out (smaller zoom values)
        // When zoomed out, allow panning beyond content bounds for better UX
        const panMargin = Math.max(viewWidth, viewHeight) * 0.5; // Extra margin when zoomed out
        
        this.viewport.x = MathUtils.clamp(
            this.viewport.x,
            this.panBounds.left - panMargin,
            Math.max(this.panBounds.right - viewWidth + panMargin, this.panBounds.left)
        );
        
        this.viewport.y = MathUtils.clamp(
            this.viewport.y,
            this.panBounds.top - panMargin,
            Math.max(this.panBounds.bottom - viewHeight + panMargin, this.panBounds.top)
        );
    }

    fitToContent(contentBounds: { left: number; right: number; top: number; bottom: number }, padding: number = 50): void {
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