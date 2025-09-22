import { PuzzlePiece } from './PuzzlePiece.js';
import { UIManager } from './UIManager.js';
import { CanvasRenderer } from './CanvasRenderer.js';
import { GAME_CONSTANTS, MathUtils, ImageUtils, DOMUtils } from './utils.js';
import { SaveManager } from './persistence.js';
export class Game {
    constructor() {
        this.pieces = [];
        this.selectedPiece = null;
        this.draggedPiece = null;
        this.puzzleImage = null;
        this.pieceCount = GAME_CONSTANTS.DEFAULT_PIECE_COUNT;
        this.gridCols = 10;
        this.gridRows = 10;
        this.gameState = 'menu';
        this.timer = { start: 0, elapsed: 0 };
        this.timerInterval = null;
        this.pieceGroups = new Map();
        this.groupDragData = null;
        this.seedCache = new Map();
        try {
            this.uiManager = new UIManager();
            this.renderer = new CanvasRenderer('puzzle-canvas');
            this.saveManager = new SaveManager();
            this.setupCallbacks();
            this.setupCanvasEvents();
            this.setupWindowEvents();
            this.tryAutoLoad();
        }
        catch (error) {
            console.error('Failed to initialize game:', error);
            throw error;
        }
    }
    setupCallbacks() {
        this.uiManager.setCallbacks({
            onStartGame: () => this.startGame(),
            onNewGame: () => this.startNewGame(),
            onPieceCountChanged: (count) => this.updatePieceCount(count)
        });
    }
    setupWindowEvents() {
        window.addEventListener('beforeunload', () => {
            if (this.gameState === 'playing') {
                this.saveManager.requestSave('window_unload', this.getGameData());
            }
        });
    }
    tryAutoLoad() {
        console.log('tryAutoLoad: Checking for saved state...');
        const result = this.saveManager.loadSave();
        if (result && result.success) {
            console.log('tryAutoLoad: Found valid saved state, attempting to restore:', {
                pieces: result.state.pieces.length,
                imageSrc: result.state.image.src.substring(0, 50) + '...',
                created: new Date(result.state.meta.created).toISOString()
            });
            this.loadGameFromState(result.state);
        }
        else {
            if (result) {
                console.log('tryAutoLoad: Saved state invalid:', result.error);
            }
            else {
                console.log('tryAutoLoad: No saved state found');
            }
            this.uiManager.showMenu();
        }
    }
    getGameData() {
        return {
            pieces: this.pieces,
            pieceGroups: this.pieceGroups,
            image: this.puzzleImage,
            gridCols: this.gridCols,
            gridRows: this.gridRows,
            timer: this.timer
        };
    }
    setupCanvasEvents() {
        const canvas = this.renderer.getCanvas();
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        window.addEventListener('resize', () => {
            if (this.gameState === 'playing') {
                this.resizeCanvas();
                this.draw();
            }
        });
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }
    updatePieceCount(count) {
        this.pieceCount = count;
    }
    startGame() {
        if (this.gameState === 'playing')
            return;
        try {
            const baseImg = new Image();
            const useUploaded = this.uiManager.hasSelectedImage();
            if (useUploaded && this.uiManager.getSelectedImageUrl()) {
                baseImg.src = this.uiManager.getSelectedImageUrl();
            }
            else {
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
        }
        catch (error) {
            console.error('Error starting game:', error);
            this.handleGameError('Failed to start game');
        }
    }
    initializeGame(baseImage) {
        try {
            this.puzzleImage = baseImage;
            this.timer = { start: Date.now(), elapsed: 0 };
            this.calculateGridDimensions();
            this.generatePieces();
            this.resizeCanvas();
            this.shufflePieces();
            this.gameState = 'playing';
            this.seedCache.clear();
            this.startTimer();
            this.draw();
            // Save initial game state so it can be restored on page reload
            this.saveManager.requestSave('game_start', this.getGameData());
        }
        catch (error) {
            console.error('Error initializing game:', error);
            this.handleGameError('Failed to initialize puzzle. Please try again.');
        }
    }
    calculateGridDimensions() {
        if (!this.puzzleImage)
            return;
        const aspect = this.puzzleImage.width / this.puzzleImage.height;
        let cols = Math.round(Math.sqrt(this.pieceCount * aspect));
        let rows = Math.round(this.pieceCount / cols);
        this.gridCols = Math.max(GAME_CONSTANTS.MIN_GRID_SIZE, cols);
        this.gridRows = Math.max(GAME_CONSTANTS.MIN_GRID_SIZE, rows);
        this.pieceCount = this.gridCols * this.gridRows;
    }
    generatePieces() {
        if (!this.puzzleImage)
            return;
        this.pieces = [];
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.gridCols; col++) {
                const pieceImageData = ImageUtils.createPieceImage(this.puzzleImage, col, row, this.gridCols, this.gridRows);
                const pieceWidth = this.puzzleImage.width / this.gridCols;
                const pieceHeight = this.puzzleImage.height / this.gridRows;
                const piece = new PuzzlePiece(col * pieceWidth, row * pieceHeight, pieceWidth, pieceHeight, pieceImageData, col, row, this.gridCols, this.gridRows, (x, y) => this.getEdgeSeed(x, y));
                this.pieces.push(piece);
            }
        }
    }
    getEdgeSeed(x, y) {
        const key = `${x},${y}`;
        if (!this.seedCache.has(key)) {
            this.seedCache.set(key, MathUtils.generateSeed());
        }
        return this.seedCache.get(key);
    }
    resizeCanvas() {
        const canvas = this.renderer.getCanvas();
        const container = canvas.parentElement;
        const pieceSize = this.getPieceSize();
        this.renderer.resizeCanvas(container, this.gridCols, this.gridRows, pieceSize);
    }
    getPieceSize() {
        if (!this.puzzleImage)
            return 40;
        const maxDisplayWidth = window.innerWidth * 0.5;
        const maxDisplayHeight = window.innerHeight * 0.6;
        const pieceW = maxDisplayWidth / this.gridCols;
        const pieceH = maxDisplayHeight / this.gridRows;
        return MathUtils.clamp(Math.min(pieceW, pieceH), GAME_CONSTANTS.MIN_PIECE_SIZE, GAME_CONSTANTS.MAX_PIECE_SIZE);
    }
    shufflePieces() {
        const canvas = this.renderer.getCanvas();
        const targetAreaW = canvas.width * GAME_CONSTANTS.SCATTER_AREA_RATIO;
        const targetAreaH = canvas.height * GAME_CONSTANTS.SCATTER_AREA_RATIO;
        const pieceRenderSize = this.getPieceSize();
        const positions = [];
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
    startTimer() {
        if (this.timerInterval)
            clearInterval(this.timerInterval);
        this.timerInterval = window.setInterval(() => {
            if (this.gameState !== 'playing')
                return;
            this.timer.elapsed = Date.now() - this.timer.start;
        }, GAME_CONSTANTS.TIMER_UPDATE_MS);
    }
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    startNewGame() {
        this.saveManager.clearSave();
        this.showMenu();
    }
    loadGameFromState(state) {
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
                }
                catch (error) {
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
        }
        catch (error) {
            console.error('Error loading saved game:', error);
            this.saveManager.clearSave();
            this.uiManager.showMenu();
        }
    }
    reconstructPiecesFromState(state) {
        this.pieces = [];
        this.pieceGroups.clear();
        const pieceMap = new Map();
        for (const pieceData of state.pieces) {
            const pieceImageData = ImageUtils.createPieceImage(this.puzzleImage, pieceData.gridX, pieceData.gridY, this.gridCols, this.gridRows);
            const pieceWidth = this.puzzleImage.width / this.gridCols;
            const pieceHeight = this.puzzleImage.height / this.gridRows;
            const piece = new PuzzlePiece(pieceData.gridX * pieceWidth, pieceData.gridY * pieceHeight, pieceWidth, pieceHeight, pieceImageData, pieceData.gridX, pieceData.gridY, this.gridCols, this.gridRows, (x, y) => this.getEdgeSeed(x, y));
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
            const groupPieces = [];
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
    showMenu() {
        this.gameState = 'menu';
        this.uiManager.showMenu();
        this.stopTimer();
    }
    handleMouseDown(event) {
        if (this.gameState !== 'playing')
            return;
        try {
            const coords = DOMUtils.getCanvasCoordinates(event, this.renderer.getCanvas());
            for (let i = this.pieces.length - 1; i >= 0; i--) {
                const piece = this.pieces[i];
                if (piece.isPointInside(coords.x, coords.y)) {
                    this.draggedPiece = piece;
                    this.selectedPiece = piece;
                    const group = this.getGroup(piece);
                    this.groupDragData = {
                        startMouseX: coords.x,
                        startMouseY: coords.y,
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
        catch (error) {
            console.error('Error handling mouse down:', error);
        }
    }
    handleMouseMove(event) {
        if (this.gameState !== 'playing' || !this.draggedPiece || !this.groupDragData)
            return;
        try {
            const coords = DOMUtils.getCanvasCoordinates(event, this.renderer.getCanvas());
            const dx = coords.x - this.groupDragData.startMouseX;
            const dy = coords.y - this.groupDragData.startMouseY;
            for (const entry of this.groupDragData.pieces) {
                entry.piece.x = entry.x + dx;
                entry.piece.y = entry.y + dy;
            }
            this.draw();
        }
        catch (error) {
            console.error('Error handling mouse move:', error);
        }
    }
    handleMouseUp(_) {
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
        }
        catch (error) {
            console.error('Error handling mouse up:', error);
        }
    }
    handleKeyDown(event) {
        if (this.gameState !== 'playing')
            return;
        if (event.key === 'r' || event.key === 'R') {
            if (!this.selectedPiece)
                return;
            event.preventDefault();
            this.rotateGroup(this.getGroup(this.selectedPiece));
        }
    }
    rotateGroup(group) {
        if (!group.length)
            return;
        const angle = Math.PI / 2;
        const bounds = this.calculateGroupBounds(group);
        const centerX = (bounds.left + bounds.right) / 2;
        const centerY = (bounds.top + bounds.bottom) / 2;
        for (const piece of group) {
            const pieceCenterX = piece.x + piece.width / 2;
            const pieceCenterY = piece.y + piece.height / 2;
            const rotated = MathUtils.rotatePoint({ x: pieceCenterX, y: pieceCenterY }, { x: centerX, y: centerY }, angle);
            piece.rotation = (piece.rotation + angle) % (Math.PI * 2);
            piece.x = rotated.x - piece.width / 2;
            piece.y = rotated.y - piece.height / 2;
            piece.invalidateCache();
        }
        this.draw();
    }
    calculateGroupBounds(group) {
        const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
        for (const piece of group) {
            bounds.left = Math.min(bounds.left, piece.x);
            bounds.top = Math.min(bounds.top, piece.y);
            bounds.right = Math.max(bounds.right, piece.x + piece.width);
            bounds.bottom = Math.max(bounds.bottom, piece.y + piece.height);
        }
        return bounds;
    }
    getGroup(piece) {
        return this.pieceGroups.get(piece) || [piece];
    }
    mergeGroups(pieceA, pieceB) {
        const groupA = this.getGroup(pieceA);
        const groupB = this.getGroup(pieceB);
        if (groupA === groupB)
            return;
        const mergedGroup = [...groupA, ...groupB];
        mergedGroup.forEach(piece => this.pieceGroups.set(piece, mergedGroup));
        this.saveManager.requestSave('group_merge', this.getGameData());
    }
    checkConnections() {
        const piece = this.selectedPiece;
        if (!piece)
            return;
        for (const otherPiece of this.pieces) {
            if (otherPiece === piece)
                continue;
            if (this.getGroup(otherPiece) === this.getGroup(piece))
                continue;
            if (this.canPiecesConnect(piece, otherPiece)) {
                this.snapGroupsTogether(piece, otherPiece);
                this.checkWin();
                return;
            }
        }
    }
    canPiecesConnect(pieceA, pieceB) {
        const rowDiff = Math.abs(pieceA.gridY - pieceB.gridY);
        const colDiff = Math.abs(pieceA.gridX - pieceB.gridX);
        if (rowDiff + colDiff !== 1)
            return false;
        const distance = MathUtils.distance({ x: pieceA.x, y: pieceA.y }, { x: pieceB.x, y: pieceB.y });
        return distance < Math.min(pieceA.width, pieceA.height) * GAME_CONSTANTS.CONNECTION_DISTANCE_RATIO;
    }
    snapGroupsTogether(pieceA, pieceB) {
        const rowDiff = pieceA.gridY - pieceB.gridY;
        const colDiff = pieceA.gridX - pieceB.gridX;
        let targetX = pieceA.x;
        let targetY = pieceA.y;
        if (rowDiff === 1) {
            targetY = pieceB.y + pieceB.height;
            targetX = pieceB.x;
        }
        else if (rowDiff === -1) {
            targetY = pieceB.y - pieceA.height;
            targetX = pieceB.x;
        }
        else if (colDiff === 1) {
            targetX = pieceB.x + pieceB.width;
            targetY = pieceB.y;
        }
        else if (colDiff === -1) {
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
    checkWin() {
        if (this.pieces.length === 0)
            return;
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
    handleGameError(message) {
        console.error('Game error:', message);
        this.uiManager.showError(message);
        this.showMenu();
    }
    draw() {
        try {
            this.renderer.draw(this.pieces, this.gameState, this.selectedPiece, this.draggedPiece, this.timer, (piece) => this.getGroup(piece), (a, b) => this.canPiecesConnect(a, b));
        }
        catch (error) {
            console.error('Error rendering game:', error);
            this.handleGameError('Rendering error occurred. Please refresh the page.');
        }
    }
    cleanup() {
        this.stopTimer();
        this.uiManager.cleanup();
    }
}
//# sourceMappingURL=Game.js.map