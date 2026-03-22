import { init } from '@instantdb/admin';

// Validate env vars are present, then initialize.
// This runs at module load time (same as the original inline pattern),
// but centralizes the validation and throws a clear error if vars are missing.
const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
const adminToken = process.env.INSTANT_ADMIN_KEY;
if (!appId || !adminToken) {
  throw new Error('Missing InstantDB configuration (NEXT_PUBLIC_INSTANT_APP_ID / INSTANT_ADMIN_KEY)');
}

export const db = init({ appId, adminToken });
