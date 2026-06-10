import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';
import { createApp } from '../src/app.js';

const validTicket = {
  title: '服务器告警',
  contact: 'ops@example.com',
  category: 'incident',
  priority: 'urgent',
  description: 'CPU 使用率持续超过 90%。',
};

describe('POST /api/tickets', () => {
  test('returns 400 when required fields are missing', async () => {
    const notifier = { sendTicket: vi.fn() };
    const app = createApp({ notifier });

    const response = await request(app)
      .post('/api/tickets')
      .send({ ...validTicket, description: '' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: '描述不能为空' });
    expect(notifier.sendTicket).not.toHaveBeenCalled();
  });

  test('notifies Telegram and returns the created ticket result', async () => {
    const notifier = { sendTicket: vi.fn().mockResolvedValue(undefined) };
    const app = createApp({ notifier });

    const response = await request(app).post('/api/tickets').send(validTicket);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message: '工单已提交',
      ticket: validTicket,
    });
    expect(notifier.sendTicket).toHaveBeenCalledWith(validTicket);
  });

  test('returns 502 when Telegram notification fails', async () => {
    const notifier = {
      sendTicket: vi.fn().mockRejectedValue(new Error('Telegram 通知失败')),
    };
    const app = createApp({ notifier });

    const response = await request(app).post('/api/tickets').send(validTicket);

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'Telegram 通知失败' });
  });
});

describe('GET /', () => {
  test('serves the ticket form page', async () => {
    const notifier = { sendTicket: vi.fn() };
    const app = createApp({ notifier });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('提交工单');
    expect(response.text).toContain('data-ticket-form');
  });
});
