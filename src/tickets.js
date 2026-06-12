const REQUIRED_FIELDS = [
  { key: 'title', label: '标题' },
  { key: 'contact', label: '联系方式' },
  { key: 'category', label: '工单类型' },
  { key: 'priority', label: '优先级' },
  { key: 'description', label: '描述' },
];

export function validateTicketInput(input = {}) {
  const ticket = normalizeTicket(input);
  const missingField = REQUIRED_FIELDS.find(({ key }) => ticket[key] === '');

  if (missingField) {
    return {
      ok: false,
      status: 400,
      error: `${missingField.label}不能为空`,
    };
  }

  return { ok: true, ticket };
}

export function formatTicketMessage(ticket) {
  const timestamp = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const categoryEmoji = {
    incident: '🚨 故障告警',
    account: '👤 账号问题',
    billing: '💳 支付问题',
    feature: '💡 需求反馈',
    other: '📝 其他问题',
  };

  const priorityEmoji = {
    normal: '🟢 普通',
    high: '🟡 高',
    urgent: '🔴 紧急',
  };

  return [
    '🎫 <b>新工单提交</b>',
    '━━━━━━━━━━━━━━━━━━',
    '',
    '👤 <b>用户信息</b>',
    `📧 邮箱: <code>${escapeHtml(ticket.userEmail || 'N/A')}</code>`,
    `📞 联系: <code>${escapeHtml(ticket.contact)}</code>`,
    '',
    '📋 <b>工单详情</b>',
    `📌 标题: <b>${escapeHtml(ticket.title)}</b>`,
    `📂 类型: ${categoryEmoji[ticket.category] || ticket.category}`,
    `⚠️ 优先级: ${priorityEmoji[ticket.priority] || ticket.priority}`,
    '',
    '📝 <b>问题描述</b>',
    `<pre>${escapeHtml(ticket.description)}</pre>`,
    '',
    `🕐 提交时间: ${timestamp}`,
  ].join('\n');
}

function normalizeTicket(input) {
  return Object.fromEntries(
    REQUIRED_FIELDS.map(({ key }) => [key, String(input[key] ?? '').trim()]),
  );
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
