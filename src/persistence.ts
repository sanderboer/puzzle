export interface PersistedPieceV1 {
    id: number;
    x: number;
    y: number;
    rotation: number;
    gridX: number;
    gridY: number;
    groupId: number;
}

export interface PersistedGroupV1 {
    id: number;
    pieceIds: number[];
}

export interface PersistedStateV1 {
    version: 1;
    image: {
        src: string;
        width: number;
        height: number;
    };
    board: {
        cols: number;
        rows: number;
        pieceCount: number;
    };
    pieces: PersistedPieceV1[];
    groups: PersistedGroupV1[];
    timer: {
        startEpoch: number;
        elapsedMs: number;
    };
    meta: {
        created: number;
        lastSave: number;
    };
}

export type PersistedStateAny = PersistedStateV1;

export interface HydratedGameResult {
    success: true;
    state: PersistedStateV1;
}

export interface HydrationError {
    success: false;
    error: string;
    shouldDiscard: boolean;
}

export type HydrationResult = HydratedGameResult | HydrationError;

export const CURRENT_SAVE_VERSION = 1;
export const STORAGE_KEY = 'puzzle.active.v1';

export class PersistenceError extends Error {
    constructor(message: string, public shouldDiscard: boolean = false) {
        super(message);
        this.name = 'PersistenceError';
    }
}

export class StorageAdapter {
    static get(key: string): string | null {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }

    static set(key: string, value: string): boolean {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                console.warn('localStorage quota exceeded. Attempting to clear old data and retry...');
                // Try to clear old saves and retry once
                try {
                    localStorage.removeItem(key);
                    localStorage.setItem(key, value);
                    return true;
                } catch (retryError) {
                    console.error('localStorage quota still exceeded after cleanup:', Math.round(value.length / 1024) + 'KB attempted');
                    return false;
                }
            }
            console.error('Error writing to localStorage:', error);
            return false;
        }
    }

    static remove(key: string): boolean {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }
}

export type SaveReason = 'piece_drop' | 'group_merge' | 'completion' | 'window_unload' | 'game_start';

export class SaveManager {
    private debounceTimer: number | null = null;
    private readonly debounceMs = 500;

    requestSave(reason: SaveReason, gameData: any): void {
        console.log('SaveManager: requestSave called with reason:', reason);
        // Make initial game saves immediate to ensure they persist
        if (reason === 'game_start') {
            this.performSave(reason, gameData);
            return;
        }
        
        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = window.setTimeout(() => {
            this.performSave(reason, gameData);
            this.debounceTimer = null;
        }, this.debounceMs);
    }

    private performSave(reason: SaveReason, gameData: any): void {
        try {
            const serialized = serializeGameState(
                gameData.pieces,
                gameData.pieceGroups,
                gameData.image,
                gameData.gridCols,
                gameData.gridRows,
                gameData.timer
            );

            const json = JSON.stringify(serialized);
            const sizeKB = Math.round(json.length / 1024);
            
            // Check if the data size is reasonable for localStorage (max ~5MB)
            if (sizeKB > 4000) {  // 4MB limit
                console.warn('Save data too large for localStorage:', sizeKB + 'KB. Skipping save.');
                return;
            }
            
            const success = StorageAdapter.set(STORAGE_KEY, json);
            
            if (success) {
                console.log('SaveManager: Game state saved successfully for reason:', reason, {
                    pieces: serialized.pieces.length,
                    imageSrc: serialized.image.src.substring(0, 50) + '...',
                    sizeKB: sizeKB
                });
            } else {
                console.error('Failed to save game state:', reason);
            }
        } catch (error) {
            console.error('Error serializing game state:', error);
        }
    }

    clearSave(): void {
        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        StorageAdapter.remove(STORAGE_KEY);
    }

    loadSave(): HydrationResult | null {
        console.log('SaveManager: loadSave called');
        const data = StorageAdapter.get(STORAGE_KEY);
        if (!data) {
            console.log('SaveManager: No saved data found in localStorage');
            return null;
        }

        console.log('SaveManager: Found saved data, deserializing...');
        const result = deserializeGameState(data);
        if (!result.success && result.shouldDiscard) {
            console.log('SaveManager: Invalid save data, clearing:', result.error);
            this.clearSave();
        }

        return result;
    }
}

export function serializeGameState(
    pieces: any[],
    pieceGroups: Map<any, any[]>,
    image: HTMLImageElement,
    gridCols: number,
    gridRows: number,
    timer: { start: number; elapsed: number }
): PersistedStateV1 {
    const now = Date.now();
    const groupMap = new Map<any[], number>();
    const groupsData: PersistedGroupV1[] = [];
    let groupIdCounter = 1;

    // First pass: collect all unique groups and assign IDs
    const processedGroups = new Set<any[]>();
    for (const piece of pieces) {
        const group = pieceGroups.get(piece);
        if (group && !processedGroups.has(group)) {
            processedGroups.add(group);
            const groupId = groupIdCounter++;
            groupMap.set(group, groupId);
            groupsData.push({
                id: groupId,
                pieceIds: group.map((p) => pieces.indexOf(p) + 1)
            });
        }
    }

    const piecesData: PersistedPieceV1[] = pieces.map((piece, index) => {
        const group = pieceGroups.get(piece);
        let groupId: number;
        
        if (group) {
            groupId = groupMap.get(group)!;
        } else {
            // Single piece group - create on demand
            groupId = groupIdCounter++;
            groupsData.push({
                id: groupId,
                pieceIds: [index + 1]
            });
        }
        
        return {
            id: index + 1,
            x: piece.x,
            y: piece.y,
            rotation: piece.rotation,
            gridX: piece.gridX,
            gridY: piece.gridY,
            groupId
        };
    });

    // Convert image to data URL if it's a blob URL to ensure persistence across page reloads
    let imageSrc = image.src;
    if (imageSrc.startsWith('blob:')) {
        console.log('serializeGameState: Converting blob URL to compressed data URL for persistence');
        // Create a canvas to convert blob to compressed data URL
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Limit image size to reduce storage usage - more aggressive compression
        const maxDimension = 600;  // Reduced from 800
        const scale = Math.min(maxDimension / image.width, maxDimension / image.height, 1);
        
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        
        // Use JPEG with higher compression for smaller file size
        imageSrc = canvas.toDataURL('image/jpeg', 0.5);  // Reduced quality from 0.7 to 0.5
        console.log('serializeGameState: Blob URL converted to compressed data URL, size:', Math.round(imageSrc.length / 1024) + 'KB');
    }

    return {
        version: CURRENT_SAVE_VERSION,
        image: {
            src: imageSrc,
            width: image.width,
            height: image.height
        },
        board: {
            cols: gridCols,
            rows: gridRows,
            pieceCount: pieces.length
        },
        pieces: piecesData,
        groups: groupsData,
        timer: {
            startEpoch: timer.start,
            elapsedMs: now - timer.start
        },
        meta: {
            created: timer.start,
            lastSave: now
        }
    };
}

export function deserializeGameState(data: string): HydrationResult {
    try {
        const parsed = JSON.parse(data);
        return validateGameState(parsed);
    } catch (error) {
        return {
            success: false,
            error: 'Invalid JSON format',
            shouldDiscard: true
        };
    }
}

function validateGameState(data: any): HydrationResult {
    if (!data || typeof data !== 'object') {
        return {
            success: false,
            error: 'Invalid data structure',
            shouldDiscard: true
        };
    }

    if (data.version !== CURRENT_SAVE_VERSION) {
        return {
            success: false,
            error: `Unsupported version: ${data.version}`,
            shouldDiscard: false
        };
    }

    const requiredFields = ['image', 'board', 'pieces', 'groups', 'timer', 'meta'];
    for (const field of requiredFields) {
        if (!(field in data)) {
            return {
                success: false,
                error: `Missing required field: ${field}`,
                shouldDiscard: true
            };
        }
    }

    if (!Array.isArray(data.pieces) || !Array.isArray(data.groups)) {
        return {
            success: false,
            error: 'Pieces and groups must be arrays',
            shouldDiscard: true
        };
    }

    for (const piece of data.pieces) {
        const pieceFields = ['id', 'x', 'y', 'rotation', 'gridX', 'gridY', 'groupId'];
        for (const field of pieceFields) {
            if (!(field in piece) || typeof piece[field] !== 'number') {
                return {
                    success: false,
                    error: `Invalid piece data: missing or invalid ${field}`,
                    shouldDiscard: true
                };
            }
        }
    }

    for (const group of data.groups) {
        if (!(group.id && Array.isArray(group.pieceIds))) {
            return {
                success: false,
                error: 'Invalid group data',
                shouldDiscard: true
            };
        }
    }

    return {
        success: true,
        state: data as PersistedStateV1
    };
}