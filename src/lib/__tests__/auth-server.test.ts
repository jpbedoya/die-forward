import { deriveAuthIdFromEmail, verifyAuthToken, isAdminAuthId } from '@/lib/auth-server';

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
