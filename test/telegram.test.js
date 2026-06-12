import { describe, expect, test, vi } from 'vitest';
import { createTelegramNotifier } from '../src/telegram.js';

const ticket = {
  title: '支付回调失败',
  contact: 'dev@example.com',
  category: 'billing',
  priority: 'urgent',
  description: '订单已经支付，但业务系统没有收到回调。',
};

describe('createTelegramNotifier', () => {
  test('requires Telegram credentials', () => {
    expect(() =>
      createTelegramNotifier({
        botToken: '',
        chatId: '456',
        fetch: vi.fn(),
      }),
    ).toThrow('缺少 TELEGRAM_BOT_TOKEN');
  });

  test('sends the ticket message to Telegram sendMessage API', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    const notifier = createTelegramNotifier({
      botToken: '123:abc',
      chatId: '456',
      fetch,
    });

    await notifier.sendTicket(ticket);

    expect(fetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bot123:abc/sendMessage',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: expect.stringContaining('"chat_id":"456"'),
      }),
    );
  });

  test('does not log the bot token when sending ticket message', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const notifier = createTelegramNotifier({
      botToken: 'secret-token',
      chatId: '456',
      fetch,
    });

    await notifier.sendTicket(ticket);

    expect(logSpy.mock.calls.flat().join('\n')).not.toContain('secret-token');
    logSpy.mockRestore();
  });

  test('does not log proxy credentials when sending ticket message', async () => {
    const previousProxy = process.env.HTTPS_PROXY;
    process.env.HTTPS_PROXY = 'http://user:secret-password@proxy.example.com:8080';
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const notifier = createTelegramNotifier({
      botToken: '123:abc',
      chatId: '456',
      fetch,
    });

    try {
      await notifier.sendTicket(ticket);
      expect(logSpy.mock.calls.flat().join('\n')).not.toContain('secret-password');
    } finally {
      process.env.HTTPS_PROXY = previousProxy;
      logSpy.mockRestore();
    }
  });

  test('raises an explicit error when Telegram rejects the request', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });
    const notifier = createTelegramNotifier({
      botToken: 'bad',
      chatId: '456',
      fetch,
    });

    await expect(notifier.sendTicket(ticket)).rejects.toThrow(
      'Telegram 通知失败: 401 Unauthorized',
    );
  });
});
