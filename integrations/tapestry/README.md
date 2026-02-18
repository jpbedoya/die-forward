# Tapestry Integration

**Status:** 📋 Planned  
**Test Page:** TBD

## What is Tapestry?

Solana's social graph protocol. Onchain profiles, follows, content, likes — shared across all apps in the ecosystem.

- **Docs:** https://docs.usetapestry.dev
- **SDK:** `socialfi` (npm)
- **API:** https://api.usetapestry.dev/v1

## Use Cases for Die Forward

### 1. Player Profiles
Universal Solana identity that works across apps:
```typescript
// Get or create profile
const profile = await client.profiles.findOrCreate({
  walletAddress: publicKey,
  username: 'dungeon_crawler_69',
  bio: 'Died 47 times. Still descending.',
  blockchain: 'SOLANA'
});
```

### 2. Follow Other Players
- Follow players from leaderboard
- See friends' recent runs in your feed
- "X is currently at depth 5..."

### 3. Social Death Feed
When you die, post to Tapestry:
```typescript
await client.content.create({
  walletAddress: publicKey,
  contentType: 'POST',
  properties: {
    body: 'Killed by a Wraith at depth 7. Staked 0.1 SOL.',
    image: deathCardUrl, // Screenshot of death card
  }
});
```

### 4. Likes on Death Cards
- Like memorable deaths from the feed
- Most-liked deaths get highlighted

### 5. Comments
- "Should've fled at depth 5 lol"
- Trash talk and encouragement

## API Quick Reference

```typescript
import { SocialFi } from 'socialfi';

const client = new SocialFi({
  baseURL: 'https://api.usetapestry.dev/v1/',
  apiKey: process.env.TAPESTRY_API_KEY,
});

// Create profile
await client.profiles.findOrCreate({ walletAddress, username, bio });

// Follow someone
await client.follows.followWithRequest({ followerWallet, followeeWallet });

// Create post
await client.content.createCreate({ walletAddress, contentType: 'POST', properties });

// Like content
await client.likes.createLikeWithRequest({ walletAddress, contentId });

// Get feed
await client.feed.getFeed({ walletAddress });
```

## Setup

1. Get API key: https://app.usetapestry.dev
2. Set namespace (e.g., `dieforward`)
3. Install SDK: `npm install socialfi`

## Implementation Plan

### Phase 1: Profiles
- [ ] Create test page `/tapestry-test`
- [ ] Profile creation on first wallet connect
- [ ] Display profile on leaderboard

### Phase 2: Social Feed
- [ ] Post death/victory to Tapestry
- [ ] Show recent deaths from followed players
- [ ] Like functionality

### Phase 3: Deep Integration
- [ ] "Challenge a friend" (follow + invite)
- [ ] Social notifications
- [ ] Cross-app visibility (other Tapestry apps see Die Forward activity)

## Links

- Quickstart: https://docs.usetapestry.dev
- API Reference: https://docs.usetapestry.dev/api
- NPM: https://www.npmjs.com/package/socialfi
