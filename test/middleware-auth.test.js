import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuthMiddleware } from '../src/middleware/auth.js';

describe('createAuthMiddleware', () => {
  let authService;
  let middleware;
  let req;
  let res;
  let next;

  beforeEach(() => {
    // Mock authService
    authService = {
      verifyToken: vi.fn((token) => {
        if (token === 'valid-token') {
          return { email: 'user@example.com' };
        }
        throw new Error('Token 无效或已过期');
      })
    };

    middleware = createAuthMiddleware(authService);

    // Mock request
    req = {
      headers: {}
    };

    // Mock response
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    // Mock next
    next = vi.fn();
  });

  it('extracts user email from valid token', () => {
    req.headers.authorization = 'Bearer valid-token';

    middleware(req, res, next);

    expect(req.userEmail).toBe('user@example.com');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization header is missing', () => {
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: '未登录或登录已过期' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', () => {
    req.headers.authorization = 'Bearer invalid-token';

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: '未登录或登录已过期' });
    expect(next).not.toHaveBeenCalled();
  });

  it('handles bearer token with different casing', () => {
    req.headers.authorization = 'bearer valid-token';

    middleware(req, res, next);

    expect(req.userEmail).toBe('user@example.com');
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 when authorization header format is invalid', () => {
    req.headers.authorization = 'InvalidFormat token';

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: '未登录或登录已过期' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization header has only one part', () => {
    req.headers.authorization = 'BearerTokenWithoutSpace';

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: '未登录或登录已过期' });
    expect(next).not.toHaveBeenCalled();
  });
});
