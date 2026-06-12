import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAuthService } from '../src/auth.js';

describe('Authentication Service - Configuration Validation', () => {
  it('should throw error if mailer is missing', () => {
    expect(() => createAuthService({
      jwtSecret: 'test-secret-key-with-at-least-32-characters-long',
      jwtExpiresIn: '1h'
    })).toThrow('认证服务配置不完整或 JWT 密钥过短');
  });

  it('should throw error if jwtSecret is missing', () => {
    expect(() => createAuthService({
      mailer: { sendVerificationCode: vi.fn() },
      jwtExpiresIn: '1h'
    })).toThrow('认证服务配置不完整或 JWT 密钥过短');
  });

  it('should throw error if jwtSecret is too short (< 32 characters)', () => {
    expect(() => createAuthService({
      mailer: { sendVerificationCode: vi.fn() },
      jwtSecret: 'short-key',
      jwtExpiresIn: '1h'
    })).toThrow('认证服务配置不完整或 JWT 密钥过短');
  });

  it('should accept jwtSecret with exactly 32 characters', () => {
    expect(() => createAuthService({
      mailer: { sendVerificationCode: vi.fn() },
      jwtSecret: '12345678901234567890123456789012', // exactly 32 chars
      jwtExpiresIn: '1h'
    })).not.toThrow();
  });

  it('should accept jwtSecret with more than 32 characters', () => {
    const authService = createAuthService({
      mailer: { sendVerificationCode: vi.fn() },
      jwtSecret: 'test-secret-key-with-at-least-32-characters-long',
      jwtExpiresIn: '1h'
    });
    expect(authService).toBeDefined();
    expect(authService.sendVerificationCode).toBeDefined();
    authService.stopCleanup();
  });
});

describe('Authentication Service - Verification Code Generation', () => {
  let authService;
  let mockMailer;
  const testEmail = 'test@example.com';
  const jwtSecret = 'test-secret-key-with-at-least-32-characters-long';
  const jwtExpiresIn = '1h';

  beforeEach(() => {
    // Create mock mailer
    mockMailer = {
      sendVerificationCode: vi.fn().mockResolvedValue(true)
    };

    // Mock timers with a fixed start time
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

    // Create auth service
    authService = createAuthService({
      mailer: mockMailer,
      jwtSecret,
      jwtExpiresIn
    });
  });

  afterEach(() => {
    // Stop cleanup interval to prevent memory leaks
    if (authService && authService.stopCleanup) {
      authService.stopCleanup();
    }
    // Clear verification codes to prevent cross-test pollution
    if (authService && authService.clearCodes) {
      authService.clearCodes();
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('sendVerificationCode', () => {
    it('should generate and send a 4-digit verification code', async () => {
      const result = await authService.sendVerificationCode(testEmail);

      expect(result.success).toBe(true);
      expect(result.message).toBe('验证码已发送');
      expect(mockMailer.sendVerificationCode).toHaveBeenCalledOnce();

      // Check that mailer was called with email and a 4-digit code
      const [email, code] = mockMailer.sendVerificationCode.mock.calls[0];
      expect(email).toBe(testEmail);
      expect(code).toMatch(/^\d{4}$/);
      expect(parseInt(code)).toBeGreaterThanOrEqual(1000);
      expect(parseInt(code)).toBeLessThan(10000);
    });

    it('should normalize email before storing and sending verification code', async () => {
      await authService.sendVerificationCode('  USER@Example.COM  ');
      const [, code] = mockMailer.sendVerificationCode.mock.calls[0];

      await expect(authService.verifyCode('user@example.com', code))
        .resolves.toMatchObject({
          success: true,
          email: 'user@example.com',
        });
      expect(mockMailer.sendVerificationCode).toHaveBeenCalledWith(
        'user@example.com',
        code,
      );
    });

    it('should reject invalid email addresses', async () => {
      const invalidEmails = ['', 'invalid', 'test@', '@example.com', 'test @example.com'];

      for (const email of invalidEmails) {
        const result = await authService.sendVerificationCode(email);
        expect(result.success).toBe(false);
        expect(result.message).toContain('无效');
      }

      expect(mockMailer.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting (1 minute cooldown)', async () => {
      // First request should succeed
      const result1 = await authService.sendVerificationCode(testEmail);
      expect(result1.success).toBe(true);
      expect(mockMailer.sendVerificationCode).toHaveBeenCalledTimes(1);

      // Immediate second request should fail
      const result2 = await authService.sendVerificationCode(testEmail);
      expect(result2.success).toBe(false);
      expect(result2.message).toContain('请稍后再试');
      expect(mockMailer.sendVerificationCode).toHaveBeenCalledTimes(1); // Still only 1 call

      // Advance time by 59 seconds (still within cooldown)
      vi.advanceTimersByTime(59 * 1000);
      const result3 = await authService.sendVerificationCode(testEmail);
      expect(result3.success).toBe(false);
      expect(mockMailer.sendVerificationCode).toHaveBeenCalledTimes(1);

      // Advance time by 2 more seconds (total 61 seconds, past cooldown)
      vi.advanceTimersByTime(2 * 1000);
      const result4 = await authService.sendVerificationCode(testEmail);
      expect(result4.success).toBe(true);
      expect(mockMailer.sendVerificationCode).toHaveBeenCalledTimes(2);
    });

    it('should isolate verification codes between service instances', async () => {
      await authService.sendVerificationCode(testEmail);
      const [, code] = mockMailer.sendVerificationCode.mock.calls[0];
      const otherService = createAuthService({
        mailer: mockMailer,
        jwtSecret,
        jwtExpiresIn
      });

      await expect(otherService.verifyCode(testEmail, code))
        .rejects.toThrow('验证码错误或已过期');

      otherService.stopCleanup();
    });
  });

  describe('verifyCode', () => {
    it('should verify correct code and return JWT token', async () => {
      // Send verification code first
      await authService.sendVerificationCode(testEmail);

      // Extract the code from mock call
      const [email, code] = mockMailer.sendVerificationCode.mock.calls[0];
      expect(email).toBe(testEmail);

      // Verify the code
      const result = await authService.verifyCode(testEmail, code);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.email).toBe(testEmail);
    });

    it('should reject incorrect verification code', async () => {
      // Send verification code first
      await authService.sendVerificationCode(testEmail);

      // Try to verify with wrong code
      await expect(authService.verifyCode(testEmail, '9999'))
        .rejects.toThrow('验证码错误或已过期');
    });

    it('should reject expired verification code', async () => {
      // Send verification code
      await authService.sendVerificationCode(testEmail);

      // Extract the code from mock call
      const [email, code] = mockMailer.sendVerificationCode.mock.calls[0];

      // Advance time past expiry (3 minutes)
      vi.advanceTimersByTime(3 * 60 * 1000 + 1000);

      // Try to verify expired code
      await expect(authService.verifyCode(testEmail, code))
        .rejects.toThrow('验证码错误或已过期');
    });

    it('should enforce max attempts limit (3 attempts)', async () => {
      // Send verification code
      await authService.sendVerificationCode(testEmail);

      // Try 3 times with wrong code
      await expect(authService.verifyCode(testEmail, '9999'))
        .rejects.toThrow('验证码错误或已过期');

      await expect(authService.verifyCode(testEmail, '8888'))
        .rejects.toThrow('验证码错误或已过期');

      await expect(authService.verifyCode(testEmail, '7777'))
        .rejects.toThrow('验证次数过多，请重新发送验证码');

      // Extract the correct code
      const [email, correctCode] = mockMailer.sendVerificationCode.mock.calls[0];

      // Fourth attempt should fail even with correct code (code was deleted after max attempts)
      await expect(authService.verifyCode(testEmail, correctCode))
        .rejects.toThrow('验证码错误或已过期');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid JWT token', async () => {
      // Send and verify code to get a token
      await authService.sendVerificationCode(testEmail);
      const [email, code] = mockMailer.sendVerificationCode.mock.calls[0];

      const verifyResult = await authService.verifyCode(testEmail, code);
      const token = verifyResult.token;

      // Verify the token
      const payload = authService.verifyToken(token);

      expect(payload).toBeDefined();
      expect(payload.email).toBe(testEmail);
    });

    it('should reject invalid JWT token', () => {
      const invalidToken = 'invalid.token.string';

      expect(() => authService.verifyToken(invalidToken)).toThrow('Token 无效或已过期');
    });
  });
});
