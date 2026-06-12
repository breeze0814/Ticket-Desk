import request from 'supertest';
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { createApp } from '../src/app.js';

const validTicket = {
  title: '服务器告警',
  contact: 'ops@example.com',
  category: 'incident',
  priority: 'urgent',
  description: 'CPU 使用率持续超过 90%。',
};

describe('Authentication API', () => {
  let app;
  let mockAuthService;

  beforeEach(() => {
    mockAuthService = {
      sendVerificationCode: vi.fn().mockResolvedValue({
        success: true,
        message: '验证码已发送到您的邮箱',
      }),
      verifyCode: vi.fn().mockResolvedValue({
        success: true,
        token: 'mock-token',
        email: 'test@example.com',
      }),
      verifyToken: vi.fn().mockReturnValue({ email: 'test@example.com' }),
    };

    const mockNotifier = {
      sendTicket: vi.fn().mockResolvedValue(undefined),
    };

    app = createApp({ notifier: mockNotifier, authService: mockAuthService });
  });

  describe('POST /api/auth/send-code', () => {
    test('sends verification code successfully', async () => {
      const response = await request(app)
        .post('/api/auth/send-code')
        .send({ email: 'user@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('验证码已发送');
      expect(mockAuthService.sendVerificationCode).toHaveBeenCalledWith('user@example.com');
    });

    test('returns 400 for invalid email', async () => {
      mockAuthService.sendVerificationCode.mockRejectedValue(
        new Error('邮箱格式不正确')
      );

      const response = await request(app)
        .post('/api/auth/send-code')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('邮箱格式不正确');
    });

    test('returns 429 for rate limit', async () => {
      mockAuthService.sendVerificationCode.mockRejectedValue(
        new Error('请 60 秒后再试')
      );

      const response = await request(app)
        .post('/api/auth/send-code')
        .send({ email: 'rate@example.com' });

      expect(response.status).toBe(429);
      expect(response.body.error).toContain('秒后再试');
    });
  });

  describe('POST /api/auth/verify-code', () => {
    test('verifies code and returns token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-code')
        .send({ email: 'verify@example.com', code: '1234' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBe('mock-token');
      expect(mockAuthService.verifyCode).toHaveBeenCalledWith('verify@example.com', '1234');
    });

    test('returns 400 for wrong code', async () => {
      mockAuthService.verifyCode.mockRejectedValue(
        new Error('验证码错误或已过期')
      );

      const response = await request(app)
        .post('/api/auth/verify-code')
        .send({ email: 'wrong@example.com', code: '0000' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });
});

describe('POST /api/tickets', () => {
  let app;
  let mockNotifier;
  let mockAuthService;

  beforeEach(() => {
    mockNotifier = {
      sendTicket: vi.fn().mockResolvedValue(undefined),
    };

    mockAuthService = {
      sendVerificationCode: vi.fn(),
      verifyCode: vi.fn(),
      verifyToken: vi.fn().mockReturnValue({ email: 'test@example.com' }),
    };

    app = createApp({ notifier: mockNotifier, authService: mockAuthService });
  });

  test('requires authentication', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .send(validTicket);

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('未登录');
  });

  test('returns 400 when required fields are missing', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', 'Bearer valid-token')
      .send({ ...validTicket, description: '' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: '描述不能为空' });
    expect(mockNotifier.sendTicket).not.toHaveBeenCalled();
  });

  test('notifies Telegram and returns the created ticket result', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', 'Bearer valid-token')
      .send(validTicket);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('工单已提交');
    expect(response.body.ticket).toEqual({
      ...validTicket,
      userEmail: 'test@example.com',
    });
    expect(mockNotifier.sendTicket).toHaveBeenCalledWith({
      ...validTicket,
      userEmail: 'test@example.com',
    });
  });

  test('returns 502 when Telegram notification fails', async () => {
    mockNotifier.sendTicket.mockRejectedValue(new Error('Telegram 通知失败'));

    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', 'Bearer valid-token')
      .send(validTicket);

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'Telegram 通知失败' });
  });

  test('rejects invalid token', async () => {
    mockAuthService.verifyToken.mockImplementation(() => {
      throw new Error('Token 无效或已过期');
    });

    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', 'Bearer invalid-token')
      .send(validTicket);

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('未登录');
  });
});

describe('GET /', () => {
  test('serves the ticket form page', async () => {
    const mockNotifier = { sendTicket: vi.fn() };
    const mockAuthService = {
      sendVerificationCode: vi.fn(),
      verifyCode: vi.fn(),
      verifyToken: vi.fn(),
    };
    const app = createApp({ notifier: mockNotifier, authService: mockAuthService });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('提交工单');
    expect(response.text).toContain('data-ticket-form');
  });
});
