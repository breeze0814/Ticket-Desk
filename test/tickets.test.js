import { describe, it, expect } from 'vitest';
import { validateTicketInput, formatTicketMessage } from '../src/tickets.js';

describe('formatTicketMessage', () => {
  it('formats ticket with HTML and emojis', () => {
    const ticket = {
      title: '无法登录后台',
      contact: '13800138000',
      category: 'incident',
      priority: 'urgent',
      description: '系统无法登录\n一直提示密码错误',
      userEmail: 'user@example.com',
    };

    const message = formatTicketMessage(ticket);

    expect(message).toContain('🎫 <b>新工单提交</b>');
    expect(message).toContain('━━━━━━━━━━━━━━━━━━');
    expect(message).toContain('👤 <b>用户信息</b>');
    expect(message).toContain('📧 邮箱: <code>user@example.com</code>');
    expect(message).toContain('📞 联系: <code>13800138000</code>');
    expect(message).toContain('📌 标题: <b>无法登录后台</b>');
    expect(message).toContain('📂 类型: 🚨 故障告警');
    expect(message).toContain('⚠️ 优先级: 🔴 紧急');
    expect(message).toContain('<pre>系统无法登录\n一直提示密码错误</pre>');
    expect(message).toContain('🕐 提交时间:');
  });

  it('maps category to emoji', () => {
    const categories = {
      incident: '🚨 故障告警',
      account: '👤 账号问题',
      billing: '💳 支付问题',
      feature: '💡 需求反馈',
      other: '📝 其他问题',
    };

    Object.entries(categories).forEach(([category, expected]) => {
      const ticket = {
        title: 'Test',
        contact: '123',
        category,
        priority: 'normal',
        description: 'Test',
        userEmail: 'test@test.com',
      };

      const message = formatTicketMessage(ticket);
      expect(message).toContain(expected);
    });
  });

  it('maps priority to emoji', () => {
    const priorities = {
      normal: '🟢 普通',
      high: '🟡 高',
      urgent: '🔴 紧急',
    };

    Object.entries(priorities).forEach(([priority, expected]) => {
      const ticket = {
        title: 'Test',
        contact: '123',
        category: 'other',
        priority,
        description: 'Test',
        userEmail: 'test@test.com',
      };

      const message = formatTicketMessage(ticket);
      expect(message).toContain(expected);
    });
  });

  it('escapes HTML special characters in user input', () => {
    const ticket = {
      title: '<script>alert("xss")</script>',
      contact: '123',
      category: 'other',
      priority: 'normal',
      description: 'Test & <tag>',
      userEmail: 'user@example.com',
    };

    const message = formatTicketMessage(ticket);

    expect(message).not.toContain('<script>');
    expect(message).toContain('&lt;script&gt;');
    expect(message).toContain('&amp;');
    expect(message).toContain('&lt;tag&gt;');
  });

  it('escapes unknown category and priority fallback values', () => {
    const ticket = {
      title: 'Test',
      contact: '123',
      category: '<b>custom</b>',
      priority: '<script>alert(1)</script>',
      description: 'Test',
      userEmail: 'test@test.com',
    };

    const message = formatTicketMessage(ticket);

    expect(message).not.toContain('<b>custom</b>');
    expect(message).not.toContain('<script>alert(1)</script>');
    expect(message).toContain('&lt;b&gt;custom&lt;/b&gt;');
    expect(message).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

describe('validateTicketInput', () => {
  it('validates all required fields are present', () => {
    const input = {
      title: '测试',
      contact: '123',
      category: 'other',
      priority: 'normal',
      description: '描述',
    };

    const result = validateTicketInput(input);

    expect(result.ok).toBe(true);
    expect(result.ticket).toEqual(input);
  });

  it('rejects when title is missing', () => {
    const result = validateTicketInput({ title: '' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('标题');
  });

  it('rejects null input without throwing', () => {
    const result = validateTicketInput(null);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toBe('标题不能为空');
  });

  it('rejects when contact is missing', () => {
    const result = validateTicketInput({
      title: 'Test',
      contact: '',
      category: 'other',
      priority: 'normal',
      description: 'Test'
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('联系方式');
  });

  it('trims whitespace from fields', () => {
    const result = validateTicketInput({
      title: '  测试  ',
      contact: '  123  ',
      category: '  other  ',
      priority: '  normal  ',
      description: '  描述  ',
    });

    expect(result.ok).toBe(true);
    expect(result.ticket.title).toBe('测试');
    expect(result.ticket.contact).toBe('123');
  });

  it('rejects unsupported category values', () => {
    const result = validateTicketInput({
      title: '测试',
      contact: '123',
      category: 'unsupported',
      priority: 'normal',
      description: '描述',
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toBe('工单类型不支持');
  });

  it('rejects unsupported priority values', () => {
    const result = validateTicketInput({
      title: '测试',
      contact: '123',
      category: 'other',
      priority: 'critical',
      description: '描述',
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toBe('优先级不支持');
  });
});
