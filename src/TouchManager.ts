import { TouchData, PinchData, Position } from './types.js';

export class TouchManager {
    private activeTouches: Map<number, TouchData> = new Map();
    private pinchData: PinchData | null = null;
    private lastTapTime = 0;
    private lastTapPosition: Position = { x: 0, y: 0 };
    private readonly DOUBLE_TAP_THRESHOLD = 300;
    private readonly DOUBLE_TAP_DISTANCE = 30;

    constructor(
        private element: HTMLElement,
        private onPan: (deltaX: number, deltaY: number) => void,
        private onPinch: (scale: number, centerX: number, centerY: number) => void,
        private onTap: (x: number, y: number) => void,
        private onDoubleTap: (x: number, y: number) => void,
        private onTouchStart: (x: number, y: number) => void,
        private onTouchEnd: (x: number, y: number) => void
    ) {
        this.setupTouchEvents();
    }

    private setupTouchEvents(): void {
        this.element.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.element.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.element.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        this.element.addEventListener('touchcancel', (e) => this.handleTouchCancel(e), { passive: false });
    }

    private handleTouchStart(event: TouchEvent): void {
        event.preventDefault();

        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const rect = this.element.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            this.activeTouches.set(touch.identifier, {
                identifier: touch.identifier,
                startX: x,
                startY: y,
                currentX: x,
                currentY: y
            });

            if (this.activeTouches.size === 1) {
                this.onTouchStart(x, y);
            } else if (this.activeTouches.size === 2) {
                this.initializePinch();
            }
        }
    }

    private handleTouchMove(event: TouchEvent): void {
        event.preventDefault();

        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchData = this.activeTouches.get(touch.identifier);
            if (!touchData) continue;

            const rect = this.element.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            touchData.currentX = x;
            touchData.currentY = y;
        }

        if (this.activeTouches.size === 1) {
            this.handleSingleTouchMove();
        } else if (this.activeTouches.size === 2) {
            this.handlePinchMove();
        }
    }

    private handleTouchEnd(event: TouchEvent): void {
        event.preventDefault();

        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchData = this.activeTouches.get(touch.identifier);
            
            if (touchData) {
                if (this.activeTouches.size === 1) {
                    this.handleSingleTouchEnd(touchData);
                }
                
                this.onTouchEnd(touchData.currentX, touchData.currentY);
                this.activeTouches.delete(touch.identifier);
            }
        }

        if (this.activeTouches.size < 2) {
            this.pinchData = null;
        } else if (this.activeTouches.size === 1) {
            this.initializeSingleTouchAfterPinch();
        }
    }

    private handleTouchCancel(event: TouchEvent): void {
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            this.activeTouches.delete(touch.identifier);
        }
        this.pinchData = null;
    }

    private handleSingleTouchMove(): void {
        const touchArray = Array.from(this.activeTouches.values());
        if (touchArray.length !== 1) return;

        const touch = touchArray[0];
        const deltaX = touch.currentX - touch.startX;
        const deltaY = touch.currentY - touch.startY;

        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            this.onPan(-deltaX, -deltaY);
            touch.startX = touch.currentX;
            touch.startY = touch.currentY;
        }
    }

    private handlePinchMove(): void {
        if (!this.pinchData) return;

        const touchArray = Array.from(this.activeTouches.values());
        if (touchArray.length !== 2) return;

        const touch1 = touchArray[0];
        const touch2 = touchArray[1];

        const currentDistance = Math.sqrt(
            Math.pow(touch2.currentX - touch1.currentX, 2) +
            Math.pow(touch2.currentY - touch1.currentY, 2)
        );

        const scale = currentDistance / this.pinchData.startDistance;
        this.onPinch(scale, this.pinchData.centerX, this.pinchData.centerY);

        this.pinchData.startDistance = currentDistance;
    }

    private handleSingleTouchEnd(touchData: TouchData): void {
        const deltaX = Math.abs(touchData.currentX - touchData.startX);
        const deltaY = Math.abs(touchData.currentY - touchData.startY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance < 10) {
            const now = Date.now();
            const timeSinceLastTap = now - this.lastTapTime;
            const distanceFromLastTap = Math.sqrt(
                Math.pow(touchData.currentX - this.lastTapPosition.x, 2) +
                Math.pow(touchData.currentY - this.lastTapPosition.y, 2)
            );

            if (timeSinceLastTap < this.DOUBLE_TAP_THRESHOLD && 
                distanceFromLastTap < this.DOUBLE_TAP_DISTANCE) {
                this.onDoubleTap(touchData.currentX, touchData.currentY);
                this.lastTapTime = 0;
            } else {
                this.onTap(touchData.currentX, touchData.currentY);
                this.lastTapTime = now;
                this.lastTapPosition = { x: touchData.currentX, y: touchData.currentY };
            }
        }
    }

    private initializePinch(): void {
        const touchArray = Array.from(this.activeTouches.values());
        if (touchArray.length !== 2) return;

        const touch1 = touchArray[0];
        const touch2 = touchArray[1];

        const distance = Math.sqrt(
            Math.pow(touch2.currentX - touch1.currentX, 2) +
            Math.pow(touch2.currentY - touch1.currentY, 2)
        );

        const centerX = (touch1.currentX + touch2.currentX) / 2;
        const centerY = (touch1.currentY + touch2.currentY) / 2;

        this.pinchData = {
            startDistance: distance,
            startZoom: 1,
            centerX,
            centerY
        };
    }

    private initializeSingleTouchAfterPinch(): void {
        const touchArray = Array.from(this.activeTouches.values());
        if (touchArray.length !== 1) return;

        const touch = touchArray[0];
        touch.startX = touch.currentX;
        touch.startY = touch.currentY;
    }

    destroy(): void {
        this.element.removeEventListener('touchstart', this.handleTouchStart);
        this.element.removeEventListener('touchmove', this.handleTouchMove);
        this.element.removeEventListener('touchend', this.handleTouchEnd);
        this.element.removeEventListener('touchcancel', this.handleTouchCancel);
    }
}