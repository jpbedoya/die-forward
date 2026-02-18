# Die Forward Integrations

Third-party integrations for the Graveyard Hackathon and beyond.

## Active Integrations

| Integration | Status | Purpose |
|-------------|--------|---------|
| [Audius](./audius/) | 🟡 Prototype | Background music streaming |
| [Tapestry](./tapestry/) | 📋 Planned | Social graph, follows, profiles |
| [MagicBlock](./magicblock/) | 📋 Planned | Ephemeral rollups, real-time combat |

## Integration Guidelines

Each integration folder should contain:
- `README.md` — Overview, use cases, API reference
- `hooks/` — React hooks for the integration
- `components/` — UI components
- `lib/` — Core logic, API clients
- `test.tsx` — Test page (accessible at `/integration-name-test`)

## Adding a New Integration

1. Create folder: `integrations/new-name/`
2. Add README with use cases
3. Build test page first
4. Extract reusable hooks/components
5. Integrate into main game flow
