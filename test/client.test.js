import { describe, expect, test, beforeEach, vi } from 'vitest';
import { collectTicketPayload, submitTicket } from '../public/app.js';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock window.location.reload
global.window = { location: { reload: vi.fn() } };

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
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock getAuthToken to return a valid token
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  test('posts the ticket payload to the backend API with auth token', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: '工单已提交' }),
    });

    await submitTicket({ title: '工单标题' }, fetch);

    expect(fetch).toHaveBeenCalledWith(
      '/api/tickets',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer mock-token',
        },
        body: JSON.stringify({ title: '工单标题' }),
      }),
    );
  });

  test('throws the backend error message when submission fails', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: '描述不能为空' }),
    });

    await expect(submitTicket({}, fetch)).rejects.toThrow('描述不能为空');
  });

  test('throws error when not authenticated', async () => {
    localStorageMock.getItem.mockReturnValue(null);

    const fetch = vi.fn();

    await expect(submitTicket({}, fetch)).rejects.toThrow('未登录，请先登录');
    expect(fetch).not.toHaveBeenCalled();
  });

  test('clears auth and reloads on 401 response', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: '未登录或登录已过期' }),
    });

    await expect(submitTicket({}, fetch)).rejects.toThrow('未登录或登录已过期');

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_email');
    expect(window.location.reload).toHaveBeenCalled();
  });
});
