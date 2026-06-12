import { getAuthToken, clearAuth } from './auth.js';

const API_ENDPOINT = '/api/tickets';
const TICKET_FIELDS = ['title', 'contact', 'category', 'priority', 'description'];
const STATUS_HIDE_DELAY_MS = 4000;

export function collectTicketPayload(formData) {
  return Object.fromEntries(
    TICKET_FIELDS.map((field) => [field, String(formData.get(field) ?? '').trim()]),
  );
}

export async function submitTicket(ticket, fetchImpl = fetch) {
  const token = getAuthToken();

  if (!token) {
    throw new Error('未登录，请先登录');
  }

  const response = await fetchImpl(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(ticket),
  });
  const result = await response.json();

  if (!response.ok) {
    // 如果是 401，清除本地 token
    if (response.status === 401) {
      clearAuth();
      window.location.reload();
    }
    throw new Error(result.error);
  }

  return result;
}

function bindTicketForm(documentRef) {
  const form = documentRef.querySelector('[data-ticket-form]');
  const status = documentRef.querySelector('[data-submit-status]');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    handleSubmit({ form, status });
  });
}

async function handleSubmit({ form, status }) {
  const submitButton = form.querySelector('button[type="submit"]');
  setSubmitting({ submitButton, status, isSubmitting: true });

  try {
    await submitTicket(collectTicketPayload(new FormData(form)));
    form.reset();
    showStatus(status, '✅ 工单提交成功！团队已收到通知，我们会尽快与您联系。', 'success');
  } catch (error) {
    showStatus(status, '❌ 提交失败：' + error.message, 'error');
  } finally {
    setSubmitting({ submitButton, status, isSubmitting: false });
  }
}

function setSubmitting({ submitButton, status, isSubmitting }) {
  submitButton.disabled = isSubmitting;
  const buttonText = submitButton.querySelector('span');
  if (buttonText) {
    buttonText.textContent = isSubmitting ? '提交中...' : '提交工单';
  }

  if (isSubmitting) {
    showStatus(status, '⏳ 正在提交工单，请稍候...', 'pending');
  }
}

function showStatus(status, message, type) {
  status.hidden = false;
  status.textContent = message;
  status.dataset.state = type;

  if (type !== 'pending') {
    window.setTimeout(() => {
      status.hidden = true;
    }, STATUS_HIDE_DELAY_MS);
  }
}

if (typeof document !== 'undefined') {
  bindTicketForm(document);
}
