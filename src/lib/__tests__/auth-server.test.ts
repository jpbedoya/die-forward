import {
  deriveAuthIdFromEmail,
  verifyAuthToken,
  isAdminAuthId,
  resolveStartIdentity,
  type AuthedIdentity,
} from '@/lib/auth-server';

const IDENTITY: AuthedIdentity = {
  authId: 'verified-abc',
  email: 'verified-abc@wallet.dieforward.com',
  instantUserId: 'user-1',
};

describe('deriveAuthIdFromEmail', () => {
  it('strips the wallet domain suffix', () => {
    expect(deriveAuthIdFromEmail('ABC123@wallet.dieforward.com')).toBe('ABC123');
  });

  it('strips the guest domain suffix', () => {
    expect(deriveAuthIdFromEmail('g-1@guest.dieforward.com')).toBe('g-1');
  });

  it('returns null for an unknown domain', () => {
    expect(deriveAuthIdFromEmail('someone@example.com')).toBeNull();
  });

  it('returns null for null', () => {
    expect(deriveAuthIdFromEmail(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(deriveAuthIdFromEmail(undefined)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(deriveAuthIdFromEmail('')).toBeNull();
  });

  it('returns null for a malformed address with nothing before the wallet suffix', () => {
    expect(deriveAuthIdFromEmail('@wallet.dieforward.com')).toBeNull();
  });

  it('returns null for a malformed address with nothing before the guest suffix', () => {
    expect(deriveAuthIdFromEmail('@guest.dieforward.com')).toBeNull();
  });

  it('is case-sensitive about the domain (does not match a near-miss suffix)', () => {
    expect(deriveAuthIdFromEmail('ABC@wallet.dieforward.com.evil.com')).toBeNull();
  });
});

describe('verifyAuthToken', () => {
  const url = 'https://dieforward.com/api/whatever';

  it('returns an AuthedIdentity for a valid Bearer header and wallet email', async () => {
    const req = new Request(url, { headers: { Authorization: 'Bearer good-token' } });
    const verifyToken = jest.fn().mockResolvedValue({ id: 'user-1', email: 'ABC@wallet.dieforward.com' });

    const result = await verifyAuthToken(req, { verifyToken });

    expect(verifyToken).toHaveBeenCalledWith('good-token');
    expect(result).toEqual({ authId: 'ABC', email: 'ABC@wallet.dieforward.com', instantUserId: 'user-1' });
  });

  it('returns an AuthedIdentity for a valid Bearer header and guest email', async () => {
    const req = new Request(url, { headers: { Authorization: 'Bearer good-token' } });
    const verifyToken = jest.fn().mockResolvedValue({ id: 'user-2', email: 'g-9@guest.dieforward.com' });

    const result = await verifyAuthToken(req, { verifyToken });

    expect(result).toEqual({ authId: 'g-9', email: 'g-9@guest.dieforward.com', instantUserId: 'user-2' });
  });

  it('returns null when verifyToken resolves null (invalid token)', async () => {
    const req = new Request(url, { headers: { Authorization: 'Bearer bad-token' } });
    const verifyToken = jest.fn().mockResolvedValue(null);

    expect(await verifyAuthToken(req, { verifyToken })).toBeNull();
  });

  it('returns null when there is no Authorization header and no body token', async () => {
    const req = new Request(url);
    const verifyToken = jest.fn();

    expect(await verifyAuthToken(req, { verifyToken })).toBeNull();
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('returns null for a malformed Authorization header (no Bearer scheme)', async () => {
    const req = new Request(url, { headers: { Authorization: 'good-token' } });
    const verifyToken = jest.fn();

    expect(await verifyAuthToken(req, { verifyToken })).toBeNull();
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('returns null for a malformed Authorization header even if a body token is present', async () => {
    const req = new Request(url, {
      method: 'POST',
      headers: { Authorization: 'Basic abc123', 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'body-token' }),
    });
    const verifyToken = jest.fn();

    expect(await verifyAuthToken(req, { verifyToken })).toBeNull();
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('falls back to a `token` field in a parsed JSON body when there is no Authorization header', async () => {
    const req = new Request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'body-token' }),
    });
    const verifyToken = jest.fn().mockResolvedValue({ id: 'user-3', email: 'XYZ@wallet.dieforward.com' });

    const result = await verifyAuthToken(req, { verifyToken });

    expect(verifyToken).toHaveBeenCalledWith('body-token');
    expect(result).toEqual({ authId: 'XYZ', email: 'XYZ@wallet.dieforward.com', instantUserId: 'user-3' });
  });

  it('returns null when the verified email does not map to a known authId shape', async () => {
    const req = new Request(url, { headers: { Authorization: 'Bearer good-token' } });
    const verifyToken = jest.fn().mockResolvedValue({ id: 'user-4', email: 'someone@example.com' });

    expect(await verifyAuthToken(req, { verifyToken })).toBeNull();
  });

  it('returns null when verifyToken throws', async () => {
    const req = new Request(url, { headers: { Authorization: 'Bearer good-token' } });
    const verifyToken = jest.fn().mockRejectedValue(new Error('network error'));

    expect(await verifyAuthToken(req, { verifyToken })).toBeNull();
  });

  it('returns null when the verified user has no email', async () => {
    const req = new Request(url, { headers: { Authorization: 'Bearer good-token' } });
    const verifyToken = jest.fn().mockResolvedValue({ id: 'user-5' });

    expect(await verifyAuthToken(req, { verifyToken })).toBeNull();
  });
});

describe('resolveStartIdentity', () => {
  // ── Coin-mode: fail-closed, verified authId only ──────────────────────────
  it('coin-mode with no identity rejects 403 (auth required)', () => {
    expect(
      resolveStartIdentity({ identity: null, bodyAuthId: 'victim', bodyWallet: 'victim-wallet', isCoinMode: true }),
    ).toEqual({ reject: 'Authentication required for coin staking', status: 403 });
  });

  it('coin-mode with a body authId that mismatches the verified authId rejects 403', () => {
    expect(
      resolveStartIdentity({ identity: IDENTITY, bodyAuthId: 'victim', bodyWallet: 'w', isCoinMode: true }),
    ).toEqual({ reject: 'Identity mismatch', status: 403 });
  });

  it('coin-mode with a matching body authId resolves to the verified authId', () => {
    expect(
      resolveStartIdentity({ identity: IDENTITY, bodyAuthId: 'verified-abc', bodyWallet: 'w', isCoinMode: true }),
    ).toEqual({ authId: 'verified-abc' });
  });

  it('coin-mode with identity and no body authId resolves to the verified authId', () => {
    expect(
      resolveStartIdentity({ identity: IDENTITY, bodyAuthId: undefined, bodyWallet: 'w', isCoinMode: true }),
    ).toEqual({ authId: 'verified-abc' });
  });

  it('coin-mode ignores the body walletAddress entirely (never used to locate a balance)', () => {
    // A malicious body wallet must not leak into the resolved identity.
    expect(
      resolveStartIdentity({ identity: IDENTITY, bodyAuthId: null, bodyWallet: 'attacker-wallet', isCoinMode: true }),
    ).toEqual({ authId: 'verified-abc' });
  });

  // ── SOL / free modes: verified overrides body, else body fallback ─────────
  it('sol/free with identity overrides the body authId', () => {
    expect(
      resolveStartIdentity({ identity: IDENTITY, bodyAuthId: 'something-else', bodyWallet: 'w', isCoinMode: false }),
    ).toEqual({ authId: 'verified-abc' });
  });

  it('sol/free with no identity falls back to the body authId', () => {
    expect(
      resolveStartIdentity({ identity: null, bodyAuthId: 'body-auth', bodyWallet: 'w', isCoinMode: false }),
    ).toEqual({ authId: 'body-auth' });
  });

  it('sol/free with no identity and no body authId falls back to the walletAddress (pre-hardening behavior)', () => {
    expect(
      resolveStartIdentity({ identity: null, bodyAuthId: undefined, bodyWallet: 'wallet-xyz', isCoinMode: false }),
    ).toEqual({ authId: 'wallet-xyz' });
  });

  it('sol/free with neither identity nor any body id rejects 400 (defensive; route validates wallet upstream)', () => {
    expect(
      resolveStartIdentity({ identity: null, bodyAuthId: null, bodyWallet: null, isCoinMode: false }),
    ).toEqual({ reject: 'Identity required', status: 400 });
  });
});

describe('isAdminAuthId', () => {
  const originalEnv = process.env.NEXT_PUBLIC_ADMIN_WALLETS;

  afterEach(() => {
    process.env.NEXT_PUBLIC_ADMIN_WALLETS = originalEnv;
  });

  it('returns true for a wallet in NEXT_PUBLIC_ADMIN_WALLETS', () => {
    process.env.NEXT_PUBLIC_ADMIN_WALLETS = 'WalletOne,WalletTwo';
    expect(isAdminAuthId('WalletTwo')).toBe(true);
  });

  it('returns true for the hardcoded fallback wallet regardless of env', () => {
    process.env.NEXT_PUBLIC_ADMIN_WALLETS = '';
    expect(isAdminAuthId('D7NdNbJTL7s6Z7Wu8nGe5SBc64FiFQAH3iPvRZw15qSL')).toBe(true);
  });

  it('returns false for a wallet not in the list', () => {
    process.env.NEXT_PUBLIC_ADMIN_WALLETS = 'WalletOne,WalletTwo';
    expect(isAdminAuthId('SomeoneElse')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAdminAuthId(null)).toBe(false);
  });

  it('returns false when the env var is unset/empty and authId is not the fallback', () => {
    delete process.env.NEXT_PUBLIC_ADMIN_WALLETS;
    expect(isAdminAuthId('RandomWallet')).toBe(false);
  });

  it('trims whitespace around comma-separated wallets', () => {
    process.env.NEXT_PUBLIC_ADMIN_WALLETS = ' WalletOne , WalletTwo ';
    expect(isAdminAuthId('WalletTwo')).toBe(true);
  });
});
