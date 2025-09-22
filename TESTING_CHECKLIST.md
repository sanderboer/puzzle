# Persistence System Manual Testing Checklist

## Auto-Save/Load Testing
- [ ] **Start New Game**: Select an image and piece count, verify game starts normally
- [ ] **Move Pieces**: Drag several pieces to different positions
- [ ] **Page Refresh**: Refresh the browser tab/page
- [ ] **Auto-Restore**: Verify pieces are restored to their moved positions
- [ ] **Timer Continuation**: Verify timer continues from where it left off

## Save Persistence Testing  
- [ ] **Multiple Moves**: Make several piece moves, refresh after each
- [ ] **Grouping**: Connect 2+ pieces into a group, refresh, verify group persists
- [ ] **Complex Groups**: Create multiple groups, refresh, verify all groups persist
- [ ] **Mixed State**: Have solo pieces + groups, refresh, verify all states persist

## Error Recovery Testing
- [ ] **Corrupt Save**: 
  1. Open DevTools → Application → Local Storage
  2. Find key `puzzle.active.v1` 
  3. Edit value to invalid JSON (e.g., remove closing brace)
  4. Refresh page
  5. **Expected**: Game shows menu, corrupted save is cleared
- [ ] **Invalid Data**:
  1. Set save value to `{"version":1,"invalid":"data"}`
  2. Refresh page  
  3. **Expected**: Game shows menu, invalid save is cleared
- [ ] **Blob URL Issue (FIXED)**: 
  1. Upload a local image file and start game
  2. Move pieces around
  3. Refresh page
  4. **Expected**: Game state is restored (image is now saved as data URL)

## Completion Flow Testing
- [ ] **Complete Puzzle**: Connect all pieces into single group
- [ ] **Win State**: Verify "Puzzle Complete!" message appears
- [ ] **Save Clearing**: Refresh page after completion
- [ ] **Menu Display**: **Expected**: Menu is shown (save was cleared)
- [ ] **New Game**: Start new puzzle, verify it works normally

## New Game Testing  
- [ ] **Clear Save**: Start a game, make moves, click "New Game" button
- [ ] **Menu Return**: Verify menu is shown immediately
- [ ] **Fresh Start**: Select new image/settings, start game
- [ ] **No Persistence**: Move pieces, refresh page
- [ ] **Expected**: Menu is shown (no save from previous game)

## Edge Cases
- [ ] **Window Close**: Make moves, close browser tab/window
- [ ] **Reopen**: Open game again in new tab
- [ ] **Expected**: Game state is restored
- [ ] **Multiple Tabs**: Open game in 2+ tabs, make moves in each
- [ ] **Expected**: Only the most recently active tab's state persists
- [ ] **Incognito Mode**: Test save/load in private browsing
- [ ] **Expected**: Works within session, clears on incognito close

## Performance Testing
- [ ] **Large Puzzles**: Test with 100+ pieces
- [ ] **Save Speed**: Verify saves don't cause visible lag
- [ ] **Load Speed**: Verify page refresh loads quickly  
- [ ] **Memory**: Check for excessive localStorage growth over time

## Browser Compatibility
- [ ] **Chrome**: Test all core functionality
- [ ] **Firefox**: Test all core functionality  
- [ ] **Safari**: Test all core functionality
- [ ] **Edge**: Test all core functionality

## Success Criteria
✅ All save/load cycles work correctly  
✅ Error states recover gracefully  
✅ Completion properly clears saves  
✅ No data corruption or loss  
✅ Performance remains smooth  

---

**Testing URL**: Open `index.html` in browser or run dev server  
**DevTools**: Use Application → Local Storage to inspect saves  
**Key**: Look for `puzzle.active.v1` in localStorage