/**
 * InstantDB Permissions
 * 
 * Defines access control rules for the Die Forward database.
 * https://www.instantdb.com/docs/permissions
 */

export default {
  // Players can only update their own records
  players: {
    allow: {
      view: "true", // Anyone can view player stats
      create: "auth.id != null", // Must be authenticated to create
      update: "auth.id == data.authId", // Can only update own record
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
};
