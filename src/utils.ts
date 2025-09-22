import { Position } from './types.js';

export const GAME_CONSTANTS = {
    DEFAULT_PIECE_COUNT: 100,
    MIN_GRID_SIZE: 3,
    MAX_PIECE_SIZE: 60,
    MIN_PIECE_SIZE: 24,
    TAB_SIZE_RATIO: 0.3,
    TAB_CURVE_RATIO: 0.6,
    SNAP_TOLERANCE_RATIO: 0.18,
    CONNECTION_TOLERANCE_RATIO: 0.25,
    CONNECTION_DISTANCE_RATIO: 1.2,
    DRAW_THROTTLE_MS: 16,
    TIMER_UPDATE_MS: 1000,
    CANVAS_WIDTH_RATIO: 0.7,
    CANVAS_HEIGHT_RATIO: 0.7,
    SCATTER_AREA_RATIO: 0.9,
    SCATTER_RANDOMNESS_RATIO: 0.3
} as const;

export class MathUtils {
    static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    static distance(a: Position, b: Position): number {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    static rotatePoint(point: Position, center: Position, angle: number): Position {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        return {
            x: center.x + (dx * cos - dy * sin),
            y: center.y + (dx * sin + dy * cos)
        };
    }

    static shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    static generateSeed(): number {
        return Math.floor(Math.random() * 100000);
    }
}

export class ImageUtils {
    static createDefaultImage(): string {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d')!;
        
        const gradient = ctx.createLinearGradient(0, 0, 800, 600);
        gradient.addColorStop(0, '#3498db');
        gradient.addColorStop(1, '#2ecc71');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#fff';
        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Puzzle', 400, 320);
        
        return canvas.toDataURL('image/png');
    }

    static createPieceImage(
        sourceImage: HTMLImageElement,
        gridX: number,
        gridY: number,
        gridCols: number,
        gridRows: number
    ): string {
        const pieceWidth = sourceImage.width / gridCols;
        const pieceHeight = sourceImage.height / gridRows;
        
        const tabSize = Math.min(pieceWidth, pieceHeight) * GAME_CONSTANTS.TAB_SIZE_RATIO;
        const tabExtension = tabSize * GAME_CONSTANTS.TAB_CURVE_RATIO;
        
        const canvas = document.createElement('canvas');
        canvas.width = pieceWidth + tabExtension * 2;
        canvas.height = pieceHeight + tabExtension * 2;
        const ctx = canvas.getContext('2d')!;
        
        const sourceX = gridX * pieceWidth - tabExtension;
        const sourceY = gridY * pieceHeight - tabExtension;
        const sourceWidth = pieceWidth + tabExtension * 2;
        const sourceHeight = pieceHeight + tabExtension * 2;
        
        ctx.drawImage(
            sourceImage,
            Math.max(0, sourceX),
            Math.max(0, sourceY),
            Math.min(sourceWidth, sourceImage.width - Math.max(0, sourceX)),
            Math.min(sourceHeight, sourceImage.height - Math.max(0, sourceY)),
            Math.max(0, -sourceX),
            Math.max(0, -sourceY),
            Math.min(sourceWidth, sourceImage.width - Math.max(0, sourceX)),
            Math.min(sourceHeight, sourceImage.height - Math.max(0, sourceY))
        );
        
        return canvas.toDataURL('image/jpeg', 0.85);
    }

    static revokeBlobUrl(url: string | null): void {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    }
}

export class TimeUtils {
    static formatTime(milliseconds: number): string {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

export class DOMUtils {
    static getCanvasCoordinates(
        event: MouseEvent,
        canvas: HTMLCanvasElement
    ): Position {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const rawX = event.clientX - rect.left;
        const rawY = event.clientY - rect.top;
        
        return {
            x: rawX * scaleX,
            y: rawY * scaleY
        };
    }

    static getElementById<T extends HTMLElement>(id: string): T {
        const element = document.getElementById(id) as T;
        if (!element) {
            throw new Error(`Element with id '${id}' not found`);
        }
        return element;
    }
}