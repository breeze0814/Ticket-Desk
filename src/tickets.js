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
  return [
    '新工单',
    `标题: ${ticket.title}`,
    `联系方式: ${ticket.contact}`,
    `类型: ${ticket.category}`,
    `优先级: ${ticket.priority}`,
    `描述: ${ticket.description}`,
  ].join('\n');
}

function normalizeTicket(input) {
  return Object.fromEntries(
    REQUIRED_FIELDS.map(({ key }) => [key, String(input[key] ?? '').trim()]),
  );
}
