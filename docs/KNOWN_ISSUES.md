# Known Issues & Limitations

## Security

### Client-Side HP/Inventory (Hackathon Limitation)
**Status:** Known, deferred

Players can edit localStorage to:
- Set HP to arbitrary values (never die)
- Add items to inventory
- Modify stamina

**Impact:** Makes game trivially easy, but doesn't increase payout (fixed 1.5x multiplier).

**Fix (post-hackathon):** Move combat/HP tracking server-side, or implement signed state transitions.

### What IS protected:
- ✅ Room progression (server-tracked)
- ✅ Victory requires completing all rooms (server-verified)
- ✅ Double-claim prevention (session status check)
- ✅ Stake amounts validated server-side
