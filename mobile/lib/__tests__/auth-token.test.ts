// Unit tests for the in-memory auth token registry (getAuthToken/setAuthToken)
// used by api.ts to attach `Authorization: Bearer <token>` headers, and for
// the authHeaders() helper in api.ts that builds the header from it.
import { getAuthToken, setAuthToken } from '../auth';
import { authHeaders } from '../api';

describe('auth token registry', () => {
  afterEach(() => {
    setAuthToken(null);
  });

  it('starts with no token', () => {
    expect(getAuthToken()).toBeNull();
  });

  it('set -> get returns the token', () => {
    setAuthToken('abc123');
    expect(getAuthToken()).toBe('abc123');
  });

  it('clear -> get returns null', () => {
    setAuthToken('abc123');
    setAuthToken(null);
    expect(getAuthToken()).toBeNull();
  });

  it('overwrites a previous token on re-set', () => {
    setAuthToken('first');
    setAuthToken('second');
    expect(getAuthToken()).toBe('second');
  });
});

describe('authHeaders', () => {
  afterEach(() => {
    setAuthToken(null);
  });

  it('returns an Authorization header when a token is present', () => {
    setAuthToken('tok-1');
    expect(authHeaders()).toEqual({ Authorization: 'Bearer tok-1' });
  });

  it('returns an empty object when there is no token', () => {
    setAuthToken(null);
    expect(authHeaders()).toEqual({});
  });

  it('accepts an explicit token argument, bypassing the registry', () => {
    setAuthToken('registry-token');
    expect(authHeaders('explicit-token')).toEqual({ Authorization: 'Bearer explicit-token' });
    expect(authHeaders(null)).toEqual({});
  });
});
