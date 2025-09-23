import { PuzzlePiece } from './PuzzlePiece.js';
import { UIManager } from './UIManager.js';
import { CanvasRenderer } from './CanvasRenderer.js';
import { TouchManager } from './TouchManager.js';
import { GameState, Timer, ScatterPosition, GroupDragData, Position } from './types.js';
import { 
    GAME_CONSTANTS, 
    MathUtils, 
    ImageUtils, 
    DOMUtils 
} from './utils.js';
import { SaveManager, PersistedStateV1 } from './persistence.js';

export class Game {
    private pieces: PuzzlePiece[] = [];
    private selectedPiece: PuzzlePiece | null = null;
    private draggedPiece: PuzzlePiece | null = null;
    private puzzleImage: HTMLImageElement | null = null;
    private pieceCount: number = GAME_CONSTANTS.DEFAULT_PIECE_COUNT;
    private gridCols = 10;
    private gridRows = 10;
    private gameState: GameState = 'menu';
    private timer: Timer = { start: 0, elapsed: 0 };
    private timerInterval: number | null = null;

    private pieceGroups = new Map<PuzzlePiece, PuzzlePiece[]>();
    private groupDragData: GroupDragData | null = null;
    private seedCache = new Map<string, number>();

    private uiManager: UIManager;
    private renderer: CanvasRenderer;
    private saveManager: SaveManager;
    private touchManager: TouchManager | null = null;

    constructor() {
        try {
            this.uiManager = new UIManager();
            this.renderer = new CanvasRenderer('puzzle-canvas');
            this.saveManager = new SaveManager();
            this.setupCallbacks();
            this.setupCanvasEvents();
            this.setupWindowEvents();
            this.tryAutoLoad();
        } catch (error) {
            console.error('Failed to initialize game:', error);
            throw error;
        }
    }

    private setupCallbacks(): void {
        this.uiManager.setCallbacks({
            onStartGame: () => this.startGame(),
            onNewGame: () => this.startNewGame(),
            onPieceCountChanged: (count) => this.updatePieceCount(count),
            onZoomIn: () => {
                const viewportManager = this.renderer.getViewportManager();
                viewportManager.zoom(1.2);
                this.draw();
            },
            onZoomOut: () => {
                const viewportManager = this.renderer.getViewportManager();
                viewportManager.zoom(0.8);
                this.draw();
            },
            onResetZoom: () => {
                const viewportManager = this.renderer.getViewportManager();
                viewportManager.resetViewport();
                this.draw();
            },
            onFitContent: () => {
                this.renderer.fitToContent(this.pieces);
                this.draw();
            }
        });
    }

    private setupWindowEvents(): void {
        window.addEventListener('beforeunload', () => {
            if (this.gameState === 'playing') {
                this.saveManager.requestSave('window_unload', this.getGameData());
            }
        });
    }

    private tryAutoLoad(): void {
        console.log('tryAutoLoad: Checking for saved state...');
        const result = this.saveManager.loadSave();
        if (result && result.success) {
            console.log('tryAutoLoad: Found valid saved state, attempting to restore:', {
                pieces: result.state.pieces.length,
                imageSrc: result.state.image.src.substring(0, 50) + '...',
                created: new Date(result.state.meta.created).toISOString()
            });
            this.loadGameFromState(result.state);
        } else {
            if (result) {
                console.log('tryAutoLoad: Saved state invalid:', result.error);
            } else {
                console.log('tryAutoLoad: No saved state found');
            }
            this.uiManager.showMenu();
        }
    }

    private getGameData(): any {
        return {
            pieces: this.pieces,
            pieceGroups: this.pieceGroups,
            image: this.puzzleImage,
            gridCols: this.gridCols,
            gridRows: this.gridRows,
            timer: this.timer
        };
    }

    private setupCanvasEvents(): void {
        const canvas = this.renderer.getCanvas();
        const viewportManager = this.renderer.getViewportManager();
        
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        
        this.touchManager = new TouchManager(
            canvas,
            (deltaX, deltaY) => {
                viewportManager.pan(deltaX, deltaY);
                this.draw();
            },
            (scale, centerX, centerY) => {
                viewportManager.zoom(scale, centerX, centerY);
                this.draw();
            },
            (x, y) => this.handleTouch(x, y),
            (x, y) => {
                this.renderer.fitToContent(this.pieces);
                this.draw();
            },
            (x, y) => this.handleTouchStart(x, y),
            (x, y) => this.handleTouchEnd(x, y)
        );
        
        window.addEventListener('resize', () => {
            if (this.gameState === 'playing') {
                this.resizeCanvas();
                this.renderer.updateViewportBounds(this.pieces);
                this.draw();
            }
        });
        
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    private updatePieceCount(count: number): void {
        this.pieceCount = count;
    }

    private startGame(): void {
        if (this.gameState === 'playing') return;

        try {
            const baseImg = new Image();
            const useUploaded = this.uiManager.hasSelectedImage();
            
            if (useUploaded && this.uiManager.getSelectedImageUrl()) {
                baseImg.src = this.uiManager.getSelectedImageUrl()!;
            } else {
                baseImg.src = ImageUtils.createDefaultImage();
            }

            baseImg.onload = () => {
                this.initializeGame(baseImg);
            };
            
            baseImg.onerror = (err) => {
                console.error('Base image error:', err);
                this.handleGameError('Failed to load image');
            };

            this.uiManager.hideMenu();
        } catch (error) {
            console.error('Error starting game:', error);
            this.handleGameError('Failed to start game');
        }
    }

    private initializeGame(baseImage: HTMLImageElement): void {
        try {
            this.puzzleImage = baseImage;
            this.timer = { start: Date.now(), elapsed: 0 };
            
            this.calculateGridDimensions();
            this.generatePieces();
            this.resizeCanvas();
            this.shufflePieces();
            
            this.renderer.updateViewportBounds(this.pieces);
            this.renderer.getViewportManager().resetViewport();
            
        this.gameState = 'playing';
        this.seedCache.clear();
        this.startTimer();
        this.draw();
        
        // Save initial game state so it can be restored on page reload
        this.saveManager.requestSave('game_start', this.getGameData());
        } catch (error) {
            console.error('Error initializing game:', error);
            this.handleGameError('Failed to initialize puzzle. Please try again.');
        }
    }

    private calculateGridDimensions(): void {
        if (!this.puzzleImage) return;

        const aspect = this.puzzleImage.width / this.puzzleImage.height;
        let cols = Math.round(Math.sqrt(this.pieceCount * aspect));
        let rows = Math.round(this.pieceCount / cols);
        
        this.gridCols = Math.max(GAME_CONSTANTS.MIN_GRID_SIZE, cols);
        this.gridRows = Math.max(GAME_CONSTANTS.MIN_GRID_SIZE, rows);
        this.pieceCount = this.gridCols * this.gridRows;
    }

    private generatePieces(): void {
        if (!this.puzzleImage) return;

        this.pieces = [];
        
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.gridCols; col++) {
                const pieceImageData = ImageUtils.createPieceImage(
                    this.puzzleImage,
                    col,
                    row,
                    this.gridCols,
                    this.gridRows
                );

                const pieceWidth = this.puzzleImage.width / this.gridCols;
                const pieceHeight = this.puzzleImage.height / this.gridRows;

                const piece = new PuzzlePiece(
                    col * pieceWidth,
                    row * pieceHeight,
                    pieceWidth,
                    pieceHeight,
                    pieceImageData,
                    col,
                    row,
                    this.gridCols,
                    this.gridRows,
                    (x, y) => this.getEdgeSeed(x, y)
                );

                this.pieces.push(piece);
            }
        }
    }

    private getEdgeSeed(x: number, y: number): number {
        const key = `${x},${y}`;
        if (!this.seedCache.has(key)) {
            this.seedCache.set(key, MathUtils.generateSeed());
        }
        return this.seedCache.get(key)!;
    }

    private resizeCanvas(): void {
        const canvas = this.renderer.getCanvas();
        const container = canvas.parentElement!;
        const pieceSize = this.getPieceSize();
        
        this.renderer.resizeCanvas(container, this.gridCols, this.gridRows, pieceSize);
    }

    private getPieceSize(): number {
        if (!this.puzzleImage) return 40;

        const maxDisplayWidth = window.innerWidth * 0.5;
        const maxDisplayHeight = window.innerHeight * 0.6;
        const pieceW = maxDisplayWidth / this.gridCols;
        const pieceH = maxDisplayHeight / this.gridRows;

        return MathUtils.clamp(
            Math.min(pieceW, pieceH),
            GAME_CONSTANTS.MIN_PIECE_SIZE,
            GAME_CONSTANTS.MAX_PIECE_SIZE
        );
    }

    private shufflePieces(): void {
        const canvas = this.renderer.getCanvas();
        const targetAreaW = canvas.width * GAME_CONSTANTS.SCATTER_AREA_RATIO;
        const targetAreaH = canvas.height * GAME_CONSTANTS.SCATTER_AREA_RATIO;
        const pieceRenderSize = this.getPieceSize();

        const positions: ScatterPosition[] = [];
        const cols = Math.floor(targetAreaW / pieceRenderSize);
        const rows = Math.floor(targetAreaH / pieceRenderSize);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                positions.push({
                    x: 30 + c * pieceRenderSize,
                    y: 30 + r * pieceRenderSize
                });
            }
        }

        MathUtils.shuffleArray(positions);

        this.pieces.forEach((piece, index) => {
            const position = positions[index % positions.length];
            const randomness = pieceRenderSize * GAME_CONSTANTS.SCATTER_RANDOMNESS_RATIO;
            
            piece.x = position.x + (Math.random() - 0.5) * randomness;
            piece.y = position.y + (Math.random() - 0.5) * randomness;
            piece.correctX = 30 + (piece.gridX * pieceRenderSize);
            piece.correctY = 30 + (piece.gridY * pieceRenderSize);
            piece.width = pieceRenderSize;
            piece.height = pieceRenderSize;
        });
    }

    private startTimer(): void {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = window.setInterval(
            () => {
                if (this.gameState !== 'playing') return;
                this.timer.elapsed = Date.now() - this.timer.start;
            },
            GAME_CONSTANTS.TIMER_UPDATE_MS
        );
    }

    private stopTimer(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }





    private startNewGame(): void {
        this.saveManager.clearSave();
        this.showMenu();
    }

    private loadGameFromState(state: PersistedStateV1): void {
        console.log('loadGameFromState: Starting image load...');
        try {
            const baseImg = new Image();
            baseImg.src = state.image.src;
            
            baseImg.onload = () => {
                console.log('loadGameFromState: Image loaded successfully, reconstructing game...');
                try {
                    this.puzzleImage = baseImg;
                    this.gridCols = state.board.cols;
                    this.gridRows = state.board.rows;
                    this.pieceCount = state.board.pieceCount;
                    
                    this.timer = {
                        start: Date.now() - state.timer.elapsedMs,
                        elapsed: state.timer.elapsedMs
                    };
                    
                    this.reconstructPiecesFromState(state);
                    this.resizeCanvas();
                    this.gameState = 'playing';
                    this.startTimer();
                    this.draw();
                    console.log('loadGameFromState: Game state restored successfully');
                } catch (error) {
                    console.error('Error reconstructing game state:', error);
                    this.saveManager.clearSave();
                    this.uiManager.showMenu();
                }
            };
            
            baseImg.onerror = () => {
                console.error('Failed to load saved image, falling back to menu');
                this.saveManager.clearSave();
                this.uiManager.showMenu();
            };
        } catch (error) {
            console.error('Error loading saved game:', error);
            this.saveManager.clearSave();
            this.uiManager.showMenu();
        }
    }

    private reconstructPiecesFromState(state: PersistedStateV1): void {
        this.pieces = [];
        this.pieceGroups.clear();
        
        const pieceMap = new Map<number, PuzzlePiece>();
        
        for (const pieceData of state.pieces) {
            const pieceImageData = ImageUtils.createPieceImage(
                this.puzzleImage!,
                pieceData.gridX,
                pieceData.gridY,
                this.gridCols,
                this.gridRows
            );

            const pieceWidth = this.puzzleImage!.width / this.gridCols;
            const pieceHeight = this.puzzleImage!.height / this.gridRows;

            const piece = new PuzzlePiece(
                pieceData.gridX * pieceWidth,
                pieceData.gridY * pieceHeight,
                pieceWidth,
                pieceHeight,
                pieceImageData,
                pieceData.gridX,
                pieceData.gridY,
                this.gridCols,
                this.gridRows,
                (x, y) => this.getEdgeSeed(x, y)
            );

            piece.x = pieceData.x;
            piece.y = pieceData.y;
            piece.rotation = pieceData.rotation;
            piece.correctX = 30 + (piece.gridX * this.getPieceSize());
            piece.correctY = 30 + (piece.gridY * this.getPieceSize());
            piece.width = this.getPieceSize();
            piece.height = this.getPieceSize();

            pieceMap.set(pieceData.id, piece);
            this.pieces.push(piece);
        }
        
        for (const groupData of state.groups) {
            const groupPieces: PuzzlePiece[] = [];
            for (const pieceId of groupData.pieceIds) {
                const piece = pieceMap.get(pieceId);
                if (piece) {
                    groupPieces.push(piece);
                }
            }
            
            for (const piece of groupPieces) {
                this.pieceGroups.set(piece, groupPieces);
            }
        }
    }

    private showMenu(): void {
        this.gameState = 'menu';
        this.uiManager.showMenu();
        this.stopTimer();
    }

    private handleMouseDown(event: MouseEvent): void {
        if (this.gameState !== 'playing') return;

        try {
            const viewportManager = this.renderer.getViewportManager();
            const screenCoords = DOMUtils.getCanvasCoordinates(event, this.renderer.getCanvas());
            const worldCoords = viewportManager.screenToWorld(screenCoords);
            
            for (let i = this.pieces.length - 1; i >= 0; i--) {
                const piece = this.pieces[i];
                if (piece.isPointInside(worldCoords.x, worldCoords.y)) {
                    this.draggedPiece = piece;
                    this.selectedPiece = piece;
                    const group = this.getGroup(piece);
                    
                    this.groupDragData = {
                        startMouseX: worldCoords.x,
                        startMouseY: worldCoords.y,
                        pieces: group.map(groupPiece => ({
                            piece: groupPiece,
                            x: groupPiece.x,
                            y: groupPiece.y
                        }))
                    };
                    break;
                }
            }
            
            this.draw();
        } catch (error) {
            console.error('Error handling mouse down:', error);
        }
    }

    private handleMouseMove(event: MouseEvent): void {
        if (this.gameState !== 'playing' || !this.draggedPiece || !this.groupDragData) return;

        try {
            const viewportManager = this.renderer.getViewportManager();
            const screenCoords = DOMUtils.getCanvasCoordinates(event, this.renderer.getCanvas());
            const worldCoords = viewportManager.screenToWorld(screenCoords);
            const dx = worldCoords.x - this.groupDragData.startMouseX;
            const dy = worldCoords.y - this.groupDragData.startMouseY;

            for (const entry of this.groupDragData.pieces) {
                entry.piece.x = entry.x + dx;
                entry.piece.y = entry.y + dy;
            }

            this.draw();
        } catch (error) {
            console.error('Error handling mouse move:', error);
        }
    }

    private handleMouseUp(_: MouseEvent): void {
        if (this.gameState !== 'playing' || !this.draggedPiece) {
            this.groupDragData = null;
            return;
        }

        try {
            this.checkConnections();
            this.draggedPiece = null;
            this.groupDragData = null;
            this.saveManager.requestSave('piece_drop', this.getGameData());
            this.draw();
        } catch (error) {
            console.error('Error handling mouse up:', error);
        }
    }

    private handleKeyDown(event: KeyboardEvent): void {
        if (this.gameState !== 'playing') return;

        if (event.key === 'r' || event.key === 'R') {
            if (!this.selectedPiece) return;
            
            event.preventDefault();
            this.rotateGroup(this.getGroup(this.selectedPiece));
        }
    }

    private handleWheel(event: WheelEvent): void {
        if (this.gameState !== 'playing') return;
        
        event.preventDefault();
        const viewportManager = this.renderer.getViewportManager();
        const rect = this.renderer.getCanvas().getBoundingClientRect();
        const centerX = event.clientX - rect.left;
        const centerY = event.clientY - rect.top;
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        
        viewportManager.zoom(zoomFactor, centerX, centerY);
        this.draw();
    }

    private handleTouch(x: number, y: number): void {
        if (this.gameState !== 'playing') return;
        
        const viewportManager = this.renderer.getViewportManager();
        const worldCoords = viewportManager.screenToWorld({ x, y });
        
        for (let i = this.pieces.length - 1; i >= 0; i--) {
            const piece = this.pieces[i];
            if (piece.isPointInside(worldCoords.x, worldCoords.y)) {
                this.selectedPiece = piece;
                this.draw();
                break;
            }
        }
    }

    private handleTouchStart(x: number, y: number): void {
        if (this.gameState !== 'playing') return;
        
        const viewportManager = this.renderer.getViewportManager();
        const worldCoords = viewportManager.screenToWorld({ x, y });
        
        for (let i = this.pieces.length - 1; i >= 0; i--) {
            const piece = this.pieces[i];
            if (piece.isPointInside(worldCoords.x, worldCoords.y)) {
                this.draggedPiece = piece;
                this.selectedPiece = piece;
                const group = this.getGroup(piece);
                
                this.groupDragData = {
                    startMouseX: worldCoords.x,
                    startMouseY: worldCoords.y,
                    pieces: group.map(groupPiece => ({
                        piece: groupPiece,
                        x: groupPiece.x,
                        y: groupPiece.y
                    }))
                };
                break;
            }
        }
        
        this.draw();
    }

    private handleTouchEnd(_: number, __: number): void {
        if (this.gameState !== 'playing' || !this.draggedPiece) {
            this.groupDragData = null;
            return;
        }

        this.checkConnections();
        this.draggedPiece = null;
        this.groupDragData = null;
        this.saveManager.requestSave('piece_drop', this.getGameData());
        this.draw();
    }

    private rotateGroup(group: PuzzlePiece[]): void {
        if (!group.length) return;

        const angle = Math.PI / 2;
        const bounds = this.calculateGroupBounds(group);
        const centerX = (bounds.left + bounds.right) / 2;
        const centerY = (bounds.top + bounds.bottom) / 2;

        for (const piece of group) {
            const pieceCenterX = piece.x + piece.width / 2;
            const pieceCenterY = piece.y + piece.height / 2;
            const rotated = MathUtils.rotatePoint(
                { x: pieceCenterX, y: pieceCenterY },
                { x: centerX, y: centerY },
                angle
            );
            
            piece.rotation = (piece.rotation + angle) % (Math.PI * 2);
            piece.x = rotated.x - piece.width / 2;
            piece.y = rotated.y - piece.height / 2;
            piece.invalidateCache();
        }

        this.draw();
    }

    private calculateGroupBounds(group: PuzzlePiece[]) {
        const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
        
        for (const piece of group) {
            bounds.left = Math.min(bounds.left, piece.x);
            bounds.top = Math.min(bounds.top, piece.y);
            bounds.right = Math.max(bounds.right, piece.x + piece.width);
            bounds.bottom = Math.max(bounds.bottom, piece.y + piece.height);
        }
        
        return bounds;
    }

    private getGroup(piece: PuzzlePiece): PuzzlePiece[] {
        return this.pieceGroups.get(piece) || [piece];
    }

    private mergeGroups(pieceA: PuzzlePiece, pieceB: PuzzlePiece): void {
        const groupA = this.getGroup(pieceA);
        const groupB = this.getGroup(pieceB);
        
        if (groupA === groupB) return;

        const mergedGroup = [...groupA, ...groupB];
        mergedGroup.forEach(piece => this.pieceGroups.set(piece, mergedGroup));
        
        this.saveManager.requestSave('group_merge', this.getGameData());
    }

    private checkConnections(): void {
        const piece = this.selectedPiece;
        if (!piece) return;

        for (const otherPiece of this.pieces) {
            if (otherPiece === piece) continue;
            if (this.getGroup(otherPiece) === this.getGroup(piece)) continue;
            
            if (this.canPiecesConnect(piece, otherPiece)) {
                this.snapGroupsTogether(piece, otherPiece);
                this.checkWin();
                return;
            }
        }
    }

    private canPiecesConnect(pieceA: PuzzlePiece, pieceB: PuzzlePiece): boolean {
        const rowDiff = Math.abs(pieceA.gridY - pieceB.gridY);
        const colDiff = Math.abs(pieceA.gridX - pieceB.gridX);
        
        if (rowDiff + colDiff !== 1) return false;

        const distance = MathUtils.distance(
            { x: pieceA.x, y: pieceA.y },
            { x: pieceB.x, y: pieceB.y }
        );
        
        return distance < Math.min(pieceA.width, pieceA.height) * GAME_CONSTANTS.CONNECTION_DISTANCE_RATIO;
    }

    private snapGroupsTogether(pieceA: PuzzlePiece, pieceB: PuzzlePiece): void {
        const rowDiff = pieceA.gridY - pieceB.gridY;
        const colDiff = pieceA.gridX - pieceB.gridX;
        
        let targetX = pieceA.x;
        let targetY = pieceA.y;

        if (rowDiff === 1) {
            targetY = pieceB.y + pieceB.height;
            targetX = pieceB.x;
        } else if (rowDiff === -1) {
            targetY = pieceB.y - pieceA.height;
            targetX = pieceB.x;
        } else if (colDiff === 1) {
            targetX = pieceB.x + pieceB.width;
            targetY = pieceB.y;
        } else if (colDiff === -1) {
            targetX = pieceB.x - pieceA.width;
            targetY = pieceB.y;
        }

        const dx = targetX - pieceA.x;
        const dy = targetY - pieceA.y;
        const groupA = this.getGroup(pieceA);
        
        for (const groupPiece of groupA) {
            groupPiece.x += dx;
            groupPiece.y += dy;
        }

        this.mergeGroups(pieceA, pieceB);
    }



    private checkWin(): void {
        if (this.pieces.length === 0) return;
        
        const totalGroups = new Set();
        for (const piece of this.pieces) {
            totalGroups.add(this.getGroup(piece));
        }
        
        if (totalGroups.size === 1) {
            this.gameState = 'completed';
            this.stopTimer();
            this.saveManager.clearSave();
            this.draw();
        }
    }

    private handleGameError(message: string): void {
        console.error('Game error:', message);
        this.uiManager.showError(message);
        this.showMenu();
    }

    private draw(): void {
        try {
            this.renderer.draw(
                this.pieces,
                this.gameState,
                this.selectedPiece,
                this.draggedPiece,
                this.timer,
                (piece) => this.getGroup(piece),
                (a, b) => this.canPiecesConnect(a, b)
            );
        } catch (error) {
            console.error('Error rendering game:', error);
            this.handleGameError('Rendering error occurred. Please refresh the page.');
        }
    }

    cleanup(): void {
        this.stopTimer();
        this.uiManager.cleanup();
    }
}
