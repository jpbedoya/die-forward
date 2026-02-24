# Tapestry Integration

**Status:** ✅ Live  
**Namespace:** `dieforward`  
**Docs:** https://docs.usetapestry.dev

## What is Tapestry?

Solana's social graph protocol. Onchain profiles, follows, content, likes — shared across all apps in the ecosystem.

- **SDK:** `socialfi` npm package (v0.1.14)
- **API base URL:** `https://api.usetapestry.dev/api/v1` (baked into SDK — do not pass manually)

## Implementation

### Client (`src/lib/tapestry.ts`)

Four exports:

| Function | Description |
|----------|-------------|
| `upsertProfile(walletAddress, nickname?)` | Find or create a Tapestry profile on wallet connect |
| `postDeath({ walletAddress, playerName, room, finalMessage, stakeAmount })` | Post a death event; returns `contentId` |
| `postVictory({ walletAddress, playerName, reward })` | Post a victory event |
| `likeDeath({ walletAddress, contentId })` | Like a death post (🕯️ candle) |

**Wallet users only** — guests have no wallet address for Tapestry.

All calls are `await`ed at the call site (not fire-and-forget) — Vercel serverless functions kill unresolved promises when the response is sent. Each call site wraps in `try/catch` so Tapestry failures never affect gameplay.

### Where it's called

| Event | Route | Function | Notes |
|-------|-------|----------|-------|
| Wallet connect | `POST /api/auth/wallet` | `upsertProfile` | 3s timeout via `Promise.race` |
| Player death | `POST /api/session/death` | `postDeath` | Returns `contentId` stored on death record |
| Player victory | `POST /api/session/victory` | `postVictory` | — |
| 🕯️ Candle like | `POST /api/tapestry/like` | `likeDeath` | Also increments `likeCount` in InstantDB |

### Content format

**Death post:**
```
💀 juamps fell at depth 7 (staked 0.05 SOL) in Die Forward.
"The shadows consumed me."

https://play.dieforward.com
```

**Victory post:**
```
⚔️ juamps escaped the crypt and claimed 0.075 SOL! Die Forward.

https://play.dieforward.com
```

**Content IDs** are generated as `dieforward-death-<wallet8>-<timestamp>` and stored as `tapestryContentId` on InstantDB death records, enabling likes to be synced back.

## SDK Usage Notes

- Instantiate with `new SocialFi()` — no arguments needed; base URL is baked in
- API key is passed as a query param `{ apiKey: KEY }` as the first arg to each method (not as an HTTP header)
- Namespace is tied to the API key on Tapestry's side — do not pass `namespace` in request bodies (it's not in the schema)
- `blockchain: 'SOLANA'` is the correct value for profile creation

## Env Vars

```
TAPESTRY_API_KEY=...       # from https://app.usetapestry.dev — must be set in Vercel env vars
TAPESTRY_NAMESPACE=dieforward  # informational only; namespace comes from API key
```

⚠️ **Set these in Vercel environment variables** — `.env.local` is local only and not deployed.

## Gotchas Learned

1. **API base URL** — the SDK uses `/api/v1/`, not `/v1/`. Don't override it.
2. **API key** — goes as `?apiKey=KEY` query param, not an `x-api-key` header.
3. **Namespace** — not a body field; determined by which API key you use.
4. **Serverless fire-and-forget** — Vercel kills the function when the response is sent. Always `await` Tapestry calls and wrap in `try/catch`.
5. **Env var typos** — a single wrong character in `TAPESTRY_API_KEY` causes 401s with no useful error message. Verify in Vercel dashboard.

## Roadmap

### Phase 3: Social Features (not yet implemented)
- [ ] Follow players from leaderboard
- [ ] Show followed players' recent runs
- [ ] Comments on death cards

## Links

- Quickstart: https://docs.usetapestry.dev
- Dashboard: https://app.usetapestry.dev
- NPM: https://www.npmjs.com/package/socialfi
