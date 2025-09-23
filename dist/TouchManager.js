export class TouchManager {
    constructor(element, onTouchStart, // Returns true if piece was selected
    onTouchMove, onTouchEnd, onPan, onPinch, onTap, onDoubleTap) {
        this.element = element;
        this.onTouchStart = onTouchStart;
        this.onTouchMove = onTouchMove;
        this.onTouchEnd = onTouchEnd;
        this.onPan = onPan;
        this.onPinch = onPinch;
        this.onTap = onTap;
        this.onDoubleTap = onDoubleTap;
        this.activeTouches = new Map();
        this.pinchData = null;
        this.lastTapTime = 0;
        this.lastTapPosition = { x: 0, y: 0 };
        this.DOUBLE_TAP_THRESHOLD = 300;
        this.DOUBLE_TAP_DISTANCE = 30;
        this.isDraggingPiece = false;
        this.setupTouchEvents();
    }
    setupTouchEvents() {
        this.element.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.element.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.element.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        this.element.addEventListener('touchcancel', (e) => this.handleTouchCancel(e), { passive: false });
    }
    getScaledCoordinates(clientX, clientY) {
        const rect = this.element.getBoundingClientRect();
        const canvas = this.element;
        // Get coordinates relative to canvas CSS bounds
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        // Scale coordinates to match canvas resolution
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        console.log('COORDINATE SCALING DEBUG:');
        console.log('  Raw touch:', clientX, clientY);
        console.log('  Canvas rect:', rect.left, rect.top, rect.width, rect.height);
        console.log('  Canvas resolution:', canvas.width, canvas.height);
        console.log('  CSS coordinates:', x, y);
        console.log('  Scale factors:', scaleX, scaleY);
        console.log('  Final scaled coordinates:', x * scaleX, y * scaleY);
        return {
            x: x * scaleX,
            y: y * scaleY
        };
    }
    handleTouchStart(event) {
        event.preventDefault();
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const coords = this.getScaledCoordinates(touch.clientX, touch.clientY);
            this.activeTouches.set(touch.identifier, {
                identifier: touch.identifier,
                startX: coords.x,
                startY: coords.y,
                currentX: coords.x,
                currentY: coords.y
            });
            if (this.activeTouches.size === 1) {
                // Check if a piece was selected for dragging
                console.log('Single finger touch, checking for piece selection...');
                this.isDraggingPiece = this.onTouchStart(coords.x, coords.y);
                console.log('Piece selection result:', this.isDraggingPiece);
            }
            else if (this.activeTouches.size === 2) {
                // Two fingers - start pinch/pan gesture
                this.isDraggingPiece = false;
                this.initializePinch();
            }
        }
    }
    handleTouchMove(event) {
        event.preventDefault();
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchData = this.activeTouches.get(touch.identifier);
            if (!touchData)
                continue;
            const coords = this.getScaledCoordinates(touch.clientX, touch.clientY);
            touchData.currentX = coords.x;
            touchData.currentY = coords.y;
        }
        if (this.activeTouches.size === 1) {
            this.handleSingleTouchMove();
        }
        else if (this.activeTouches.size === 2) {
            this.handleTwoFingerMove();
        }
    }
    handleTouchEnd(event) {
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
        }
        else if (this.activeTouches.size === 1) {
            this.initializeSingleTouchAfterPinch();
        }
        if (this.activeTouches.size === 0) {
            this.isDraggingPiece = false;
        }
    }
    handleTouchCancel(event) {
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            this.activeTouches.delete(touch.identifier);
        }
        this.pinchData = null;
        this.isDraggingPiece = false;
    }
    handleSingleTouchMove() {
        const touchArray = Array.from(this.activeTouches.values());
        if (touchArray.length !== 1)
            return;
        const touch = touchArray[0];
        const deltaX = touch.currentX - touch.startX;
        const deltaY = touch.currentY - touch.startY;
        if (this.isDraggingPiece) {
            // If dragging a piece, send move events to the game
            console.log('Moving piece:', touch.currentX, touch.currentY);
            this.onTouchMove(touch.currentX, touch.currentY, deltaX, deltaY);
        }
        else {
            // If not dragging a piece, pan the viewport (but only after some movement threshold)
            if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                console.log('Panning viewport:', deltaX, deltaY);
                this.onPan(deltaX, deltaY);
                touch.startX = touch.currentX;
                touch.startY = touch.currentY;
            }
        }
    }
    handleTwoFingerMove() {
        const touchArray = Array.from(this.activeTouches.values());
        if (touchArray.length !== 2)
            return;
        const touch1 = touchArray[0];
        const touch2 = touchArray[1];
        if (this.pinchData) {
            // Handle pinch zoom
            const currentDistance = Math.sqrt(Math.pow(touch2.currentX - touch1.currentX, 2) +
                Math.pow(touch2.currentY - touch1.currentY, 2));
            const rawScale = currentDistance / this.pinchData.startDistance;
            // Dampen the zoom to make it less sensitive
            const dampedScale = 1 + (rawScale - 1) * 0.5;
            console.log('PINCH ZOOM DEBUG:');
            console.log('  Pinch center (scaled):', this.pinchData.centerX, this.pinchData.centerY);
            console.log('  Scale factor:', dampedScale);
            this.onPinch(dampedScale, this.pinchData.centerX, this.pinchData.centerY);
            this.pinchData.startDistance = currentDistance;
        }
        else {
            // Handle two-finger pan
            const centerX = (touch1.currentX + touch2.currentX) / 2;
            const centerY = (touch1.currentY + touch2.currentY) / 2;
            const prevCenterX = (touch1.startX + touch2.startX) / 2;
            const prevCenterY = (touch1.startY + touch2.startY) / 2;
            const deltaX = centerX - prevCenterX;
            const deltaY = centerY - prevCenterY;
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                this.onPan(deltaX, deltaY);
                // Update start positions for continuous panning
                touch1.startX = touch1.currentX;
                touch1.startY = touch1.currentY;
                touch2.startX = touch2.currentX;
                touch2.startY = touch2.currentY;
            }
        }
    }
    handleSingleTouchEnd(touchData) {
        const deltaX = Math.abs(touchData.currentX - touchData.startX);
        const deltaY = Math.abs(touchData.currentY - touchData.startY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        // Only register tap if there was minimal movement and no piece dragging
        if (distance < 10 && !this.isDraggingPiece) {
            const now = Date.now();
            const timeSinceLastTap = now - this.lastTapTime;
            const distanceFromLastTap = Math.sqrt(Math.pow(touchData.currentX - this.lastTapPosition.x, 2) +
                Math.pow(touchData.currentY - this.lastTapPosition.y, 2));
            if (timeSinceLastTap < this.DOUBLE_TAP_THRESHOLD &&
                distanceFromLastTap < this.DOUBLE_TAP_DISTANCE) {
                this.onDoubleTap(touchData.currentX, touchData.currentY);
                this.lastTapTime = 0;
            }
            else {
                this.onTap(touchData.currentX, touchData.currentY);
                this.lastTapTime = now;
                this.lastTapPosition = { x: touchData.currentX, y: touchData.currentY };
            }
        }
    }
    initializePinch() {
        const touchArray = Array.from(this.activeTouches.values());
        if (touchArray.length !== 2)
            return;
        const touch1 = touchArray[0];
        const touch2 = touchArray[1];
        const distance = Math.sqrt(Math.pow(touch2.currentX - touch1.currentX, 2) +
            Math.pow(touch2.currentY - touch1.currentY, 2));
        const centerX = (touch1.currentX + touch2.currentX) / 2;
        const centerY = (touch1.currentY + touch2.currentY) / 2;
        this.pinchData = {
            startDistance: distance,
            startZoom: 1,
            centerX,
            centerY
        };
    }
    initializeSingleTouchAfterPinch() {
        const touchArray = Array.from(this.activeTouches.values());
        if (touchArray.length !== 1)
            return;
        const touch = touchArray[0];
        touch.startX = touch.currentX;
        touch.startY = touch.currentY;
        this.isDraggingPiece = false;
    }
    destroy() {
        this.element.removeEventListener('touchstart', this.handleTouchStart);
        this.element.removeEventListener('touchmove', this.handleTouchMove);
        this.element.removeEventListener('touchend', this.handleTouchEnd);
        this.element.removeEventListener('touchcancel', this.handleTouchCancel);
    }
}
//# sourceMappingURL=TouchManager.js.map