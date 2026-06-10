import { describe, expect, test, vi } from 'vitest';
import { collectTicketPayload, submitTicket } from '../public/app.js';

describe('collectTicketPayload', () => {
  test('maps form fields into the ticket payload', () => {
    const formData = new FormData();
    formData.set('title', '  支付失败  ');
    formData.set('contact', 'ops@example.com');
    formData.set('category', 'billing');
    formData.set('priority', 'high');
    formData.set('description', '用户付款后订单没有更新。');

    expect(collectTicketPayload(formData)).toEqual({
      title: '支付失败',
      contact: 'ops@example.com',
      category: 'billing',
      priority: 'high',
      description: '用户付款后订单没有更新。',
    });
  });
});

describe('submitTicket', () => {
  test('posts the ticket payload to the backend API', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: '工单已提交' }),
    });

    await submitTicket({ title: '工单标题' }, fetch);

    expect(fetch).toHaveBeenCalledWith(
      '/api/tickets',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: '工单标题' }),
      }),
    );
  });

  test('throws the backend error message when submission fails', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: '描述不能为空' }),
    });

    await expect(submitTicket({}, fetch)).rejects.toThrow('描述不能为空');
  });
});
