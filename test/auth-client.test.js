import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { initAuthUI, sendVerificationCode, verifyCode } from '../public/auth.js';

const localStorageState = new Map();
const localStorageMock = {
  getItem: vi.fn((key) => localStorageState.get(key) ?? null),
  setItem: vi.fn((key, value) => localStorageState.set(key, value)),
  removeItem: vi.fn((key) => localStorageState.delete(key)),
};

global.localStorage = localStorageMock;

describe('auth client API helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageState.clear();
  });

  test('throws when send-code API returns success false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        message: '无效的邮箱地址',
      }),
    });

    await expect(sendVerificationCode('invalid-email'))
      .rejects.toThrow('无效的邮箱地址');
  });

  test('throws when verify-code API returns success false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        message: '验证码错误或已过期',
      }),
    });

    await expect(verifyCode('user@example.com', '0000'))
      .rejects.toThrow('验证码错误或已过期');
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });
});

describe('auth UI', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorageState.clear();
    global.document = createAuthDocument();
  });

  afterEach(() => {
    delete global.document;
    vi.useRealTimers();
  });

  test('restores send button text after request completes', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: '验证码已发送',
      }),
    });

    initAuthUI();
    const button = document.querySelector('[data-send-code]');

    await button.click();

    expect(button.querySelector('span').textContent).toBe('发送验证码');
  });

  test('stores auth data and hides modal after verification succeeds', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        token: 'verified-token',
        email: 'user@example.com',
      }),
    });

    initAuthUI();
    await document.querySelector('[data-send-code]').click();
    document.querySelector('[data-auth-code]').value = '1234';
    await document.querySelector('[data-verify-code]').click();
    vi.advanceTimersByTime(500);

    expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'verified-token');
    expect(document.querySelector('[data-auth-modal]').hidden).toBe(true);
    expect(document.querySelector('[data-welcome-message]').hidden).toBe(false);
  });
});

function createAuthDocument() {
  const elements = {
    '[data-auth-modal]': createElement(),
    '[data-email-step]': createElement(),
    '[data-code-step]': createElement({ hidden: true }),
    '[data-auth-email]': createElement({ value: 'user@example.com' }),
    '[data-auth-code]': createElement(),
    '[data-send-code]': createButton('发送验证码'),
    '[data-verify-code]': createButton('确认登录'),
    '[data-back-to-email]': createButton('返回'),
    '[data-resend-code]': createButton('重新发送'),
    '[data-display-email]': createElement(),
    '[data-countdown]': createElement(),
    '[data-auth-status]': createElement({ hidden: true }),
    '[data-welcome-message]': createElement({ hidden: true }),
  };

  return {
    querySelector: (selector) => elements[selector] ?? null,
  };
}

function createButton(text) {
  const span = createElement({ textContent: text });
  const button = createElement();
  button.querySelector = (selector) => selector === 'span' ? span : null;
  return button;
}

function createElement(options = {}) {
  const listeners = new Map();

  return {
    dataset: {},
    disabled: false,
    hidden: options.hidden ?? false,
    textContent: options.textContent ?? '',
    value: options.value ?? '',
    addEventListener: (event, listener) => listeners.set(event, listener),
    click: () => listeners.get('click')?.(),
    focus: vi.fn(),
    querySelector: () => null,
  };
}
