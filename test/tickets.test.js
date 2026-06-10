import { describe, expect, test } from 'vitest';
import { formatTicketMessage, validateTicketInput } from '../src/tickets.js';

const validTicket = {
  title: '无法登录后台',
  contact: 'ops@example.com',
  category: 'account',
  priority: 'high',
  description: '输入正确密码后仍然提示登录失败。',
};

describe('validateTicketInput', () => {
  test('rejects missing required fields', () => {
    const result = validateTicketInput({ ...validTicket, title: '   ' });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: '标题不能为空',
    });
  });

  test('returns a normalized ticket for valid input', () => {
    const result = validateTicketInput({
      ...validTicket,
      title: '  无法登录后台  ',
    });

    expect(result).toEqual({
      ok: true,
      ticket: {
        ...validTicket,
        title: '无法登录后台',
      },
    });
  });
});

describe('formatTicketMessage', () => {
  test('includes all core ticket fields', () => {
    const message = formatTicketMessage(validTicket);

    expect(message).toContain('新工单');
    expect(message).toContain('无法登录后台');
    expect(message).toContain('ops@example.com');
    expect(message).toContain('account');
    expect(message).toContain('high');
    expect(message).toContain('输入正确密码后仍然提示登录失败。');
  });
});
