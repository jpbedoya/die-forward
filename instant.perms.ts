/**
 * InstantDB Permissions
 * 
 * Defines access control rules for the Die Forward database.
 * https://www.instantdb.com/docs/permissions
 */

export default {
  // Players can read freely; updates require auth (any authenticated user).
  // NOTE: "auth.id == data.authId" would be ideal but auth.id is InstantDB's
  // internal UUID, which differs from our authId (wallet address / guestId).
  // App-layer logic ensures users only ever mutate their own record.
  players: {
    allow: {
      view: "true", // Anyone can view player stats
      create: "auth.id != null", // Must be authenticated to create
      update: "auth.id != null", // Must be authenticated to update
      delete: "false", // No deletes allowed
    },
  },

  // Deaths are immutable once created
  deaths: {
    allow: {
      view: "true", // Anyone can view death records
      create: "auth.id != null", // Must be authenticated to record death
      update: "false", // Deaths are immutable
      delete: "false", // Deaths cannot be deleted
    },
  },

  // Corpses can be discovered but not modified otherwise
  corpses: {
    allow: {
      view: "true", // Anyone can view corpses
      create: "auth.id != null", // Must be authenticated
      // Can only update discovered/tip fields, and only if not already discovered by someone else
      update: "auth.id != null && (data.discovered == false || data.discoveredBy == auth.id)",
      delete: "false",
    },
  },

  // Game settings are admin-only
  settings: {
    allow: {
      view: "true", // Anyone can view settings
      create: "false", // Admin-only via backend
      update: "false", // Admin-only via backend
      delete: "false",
    },
  },

  // ── Money-critical namespaces (deny-by-default) ───────────────────────────
  // These hold the pale-coin economy. The server admin client BYPASSES perms,
  // so all legitimate writes (start/death/victory/cleanup routes, admin page)
  // still work. Without these rules the namespaces are default-ALLOW, letting
  // any authenticated InstantDB client mint coins (set coinPool huge), forge
  // receipts, or tamper with live sessions. See spec §3.1.

  // gameSettings: holds coinPool / coinBonusPercent / victoryBonusPercent.
  // The mobile client legitimately READS this (useGameSettings), so allow view
  // but deny every client write — mutations are server/admin-only.
  gameSettings: {
    allow: {
      view: "true", // useGameSettings reads coinBonusPercent/pool for display
      create: "false", // server/admin-only via backend
      update: "false", // server/admin-only via backend (coin mint surface)
      delete: "false",
    },
  },

  // runReceipts: immutable server-written record of every run's coin settlement.
  // Clients must never create/forge or alter them.
  runReceipts: {
    allow: {
      view: "true", // players may read their own run history
      create: "false", // server-only (death/victory/cleanup routes)
      update: "false", // immutable
      delete: "false",
    },
  },

  // sessions: authoritative run state (stake, currentRoom, status, payout).
  // Entirely server-managed — clients must not write session rows.
  sessions: {
    allow: {
      view: "true",
      create: "false", // server-only (start route)
      update: "false", // server-only (advance/death/victory/cleanup)
      delete: "false",
    },
  },

  // worldShifts: nightly community-aggregation output (apex/curse/architect ids
  // and counts — NO UGC). Clients READ today's row; only the server cron writes
  // (admin client bypasses perms). Deny all client writes.
  worldShifts: {
    allow: {
      view: "true",
      create: "false",
      update: "false",
      delete: "false",
    },
  },

  // reports: UGC abuse reports (A2). Any authenticated client may create one;
  // nobody may read/edit/delete them from the client (server aggregation reads
  // via the admin bypass). Prevents report tampering + reporter enumeration.
  reports: {
    allow: {
      view: "false",
      create: "auth.id != null",
      update: "false",
      delete: "false",
    },
  },
};
