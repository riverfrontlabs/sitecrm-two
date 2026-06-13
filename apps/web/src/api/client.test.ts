import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, setAuthToken, getAuthToken } from './client';

afterEach(() => {
  vi.unstubAllGlobals();
  setAuthToken(null);
});

describe('ApiError', () => {
  it('carries status and message', () => {
    const err = new ApiError(404, 'Not Found');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not Found');
    expect(err).toBeInstanceOf(Error);
  });

  it('is distinguishable from generic errors', () => {
    const err = new ApiError(500, 'Server Error');
    expect(err instanceof ApiError).toBe(true);
    expect(new Error('x') instanceof ApiError).toBe(false);
  });
});

describe('auth token', () => {
  beforeEach(() => {
    localStorage.clear();
    setAuthToken(null);
  });

  it('returns null when no token is set', () => {
    expect(getAuthToken()).toBeNull();
  });

  it('stores and retrieves a token', () => {
    setAuthToken('test-jwt-token');
    expect(getAuthToken()).toBe('test-jwt-token');
  });

  it('clears the token when set to null', () => {
    setAuthToken('test-jwt-token');
    setAuthToken(null);
    expect(getAuthToken()).toBeNull();
  });
});
