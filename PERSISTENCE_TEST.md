# Persistence System Test Instructions

## Debug Version Ready
The game now has comprehensive debug logging to trace the save/restore cycle. Open your browser's Developer Console (F12) to see detailed logs.

## Test Scenarios

### Scenario 1: Default Image Persistence Test
1. **Start fresh**: Clear localStorage in DevTools (`localStorage.clear()`)
2. **Start game**: Click "Start Game" with default image
3. **Check logs**: Should see `SaveManager: Game state saved successfully for reason: game_start`
4. **Move pieces**: Drag a few pieces around
5. **Check logs**: Should see `SaveManager: requestSave called with reason: piece_drop`
6. **Refresh page**: Press F5
7. **Expected**: Game should restore automatically, not show menu
8. **Check logs**: Should see:
   - `tryAutoLoad: Found valid saved state`  
   - `loadGameFromState: Image loaded successfully`
   - `loadGameFromState: Game state restored successfully`

### Scenario 2: Uploaded Image Persistence Test (Critical)
1. **Start fresh**: Clear localStorage
2. **Upload image**: Select a custom image file
3. **Start game**: Click "Start Game" 
4. **Check logs**: Should see `serializeGameState: Converting blob URL to data URL`
5. **Move pieces**: Drag a few pieces
6. **Refresh page**: Press F5
7. **Expected**: Game should restore with your uploaded image
8. **Check logs**: Should NOT see "Failed to load saved image"

### Scenario 3: Completion Clears Save
1. **Start game** with few pieces (4-6)
2. **Complete puzzle**: Solve all pieces
3. **Check logs**: Should see save cleared on completion
4. **Refresh page**: Should show menu (no saved state)

## Debug Log Meanings

### Successful Flow:
```
SaveManager: requestSave called with reason: game_start
SaveManager: Game state saved successfully for reason: game_start
tryAutoLoad: Found valid saved state, attempting to restore
loadGameFromState: Starting image load...
loadGameFromState: Image loaded successfully, reconstructing game...
loadGameFromState: Game state restored successfully
```

### Blob URL Conversion (when uploading images):
```
serializeGameState: Converting blob URL to data URL for persistence
serializeGameState: Blob URL converted to data URL: data:image/png;base64,iVBOR...
```

### Problem Indicators:
- `tryAutoLoad: No saved state found` → Save isn't being created
- `Failed to load saved image` → Image restoration failed
- `tryAutoLoad: Saved state invalid` → Data corruption

## Known Issues Fixed
- ✅ Blob URLs causing image load failures after refresh
- ✅ Game_start saves now immediate (non-debounced)
- ✅ Enhanced error handling and logging
- ✅ Win state properly clears saves

## Running the Test
1. Build: `npm run build`
2. Serve: Open `dist/index.html` in browser or run `npm run dev` (if ports are available)
3. Open DevTools Console
4. Follow test scenarios above
5. Report any issues with specific console logs

The debug logging will help identify exactly where the persistence cycle fails, if it does.