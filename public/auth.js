const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_EMAIL_KEY = 'auth_email';

export async function sendVerificationCode(email) {
  const response = await fetch('/api/auth/send-code', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || '发送失败');
  }

  if (!result.success) {
    throw new Error(result.message || '发送失败');
  }

  return result;
}

export async function verifyCode(email, code) {
  const response = await fetch('/api/auth/verify-code', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || '验证失败');
  }

  if (!result.success) {
    throw new Error(result.message || '验证失败');
  }

  // 存储 token 和 email
  localStorage.setItem(AUTH_TOKEN_KEY, result.token);
  localStorage.setItem(AUTH_EMAIL_KEY, result.email);

  return result;
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getAuthEmail() {
  return localStorage.getItem(AUTH_EMAIL_KEY);
}

export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_EMAIL_KEY);
}

export function isAuthenticated() {
  return !!getAuthToken();
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

let currentEmail = '';
let resendTimer = null;

export function initAuthUI() {
  const ui = getAuthElements(document);

  // 检查是否已登录
  if (isAuthenticated()) {
    hideAuthModal(ui);
    showWelcome(document);
    return;
  }

  showAuthModal(ui);
  bindAuthActions(ui);
}

function getAuthElements(documentRef) {
  return {
    modal: documentRef.querySelector('[data-auth-modal]'),
    emailStep: documentRef.querySelector('[data-email-step]'),
    codeStep: documentRef.querySelector('[data-code-step]'),
    emailInput: documentRef.querySelector('[data-auth-email]'),
    codeInput: documentRef.querySelector('[data-auth-code]'),
    sendButton: documentRef.querySelector('[data-send-code]'),
    verifyButton: documentRef.querySelector('[data-verify-code]'),
    backButton: documentRef.querySelector('[data-back-to-email]'),
    resendButton: documentRef.querySelector('[data-resend-code]'),
    displayEmail: documentRef.querySelector('[data-display-email]'),
    countdown: documentRef.querySelector('[data-countdown]'),
    statusMsg: documentRef.querySelector('[data-auth-status]'),
    documentRef,
  };
}

function bindAuthActions(ui) {
  ui.sendButton.addEventListener('click', async () => {
    await handleSendCodeClick(ui);
  });

  ui.verifyButton.addEventListener('click', async () => {
    await handleVerifyCodeClick(ui);
  });

  ui.backButton.addEventListener('click', () => {
    showEmailStep(ui);
    ui.codeInput.value = '';
    stopCountdown(ui);
  });

  ui.resendButton.addEventListener('click', async () => {
    await handleResendCodeClick(ui);
  });
}

async function handleSendCodeClick(ui) {
  const email = ui.emailInput.value.trim();
  if (!validateEmail(email)) {
    showStatus(ui, '请输入有效的邮箱地址', 'error');
    return;
  }

  setLoading(ui.sendButton, true);
  try {
    await sendVerificationCode(email);
    currentEmail = email;
    ui.displayEmail.textContent = email;
    showCodeStep(ui);
    startCountdown(ui);
    showStatus(ui, '验证码已发送', 'success');
  } catch (error) {
    showStatus(ui, error.message, 'error');
  } finally {
    setLoading(ui.sendButton, false);
  }
}

async function handleVerifyCodeClick(ui) {
  const code = ui.codeInput.value.trim();
  if (code.length !== 4 || !/^\d+$/.test(code)) {
    showStatus(ui, '请输入4位数字验证码', 'error');
    return;
  }

  setLoading(ui.verifyButton, true);
  try {
    await handleVerifySuccess(ui, code);
  } catch (error) {
    console.error('[Auth] 登录失败:', error);
    showStatus(ui, error.message, 'error');
  } finally {
    setLoading(ui.verifyButton, false);
  }
}

async function handleResendCodeClick(ui) {
  setLoading(ui.resendButton, true);
  try {
    await sendVerificationCode(currentEmail);
    startCountdown(ui);
    showStatus(ui, '验证码已重新发送', 'success');
  } catch (error) {
    showStatus(ui, error.message, 'error');
  } finally {
    setLoading(ui.resendButton, false);
  }
}

async function handleVerifySuccess(ui, code) {
  const result = await verifyCode(currentEmail, code);
  console.log('[Auth] 登录成功:', result);
  showStatus(ui, '登录成功！', 'success');

  // 延迟关闭弹窗，让用户看到成功消息
  setTimeout(() => {
    hideAuthModal(ui);
    showWelcome(ui.documentRef);
  }, 500);
}

function showEmailStep(ui) {
  ui.emailStep.hidden = false;
  ui.codeStep.hidden = true;
}

function showCodeStep(ui) {
  ui.emailStep.hidden = true;
  ui.codeStep.hidden = false;
  ui.codeInput.focus();
}

function showAuthModal(ui) {
  ui.modal.hidden = false;
  ui.emailInput.focus();
}

function hideAuthModal(ui) {
  ui.modal.hidden = true;
}

function showWelcome(documentRef) {
  const email = getAuthEmail();
  const welcome = documentRef.querySelector('[data-welcome-message]');
  if (!welcome || !email) {
    return;
  }

  welcome.textContent = `✅ 欢迎，${email}`;
  welcome.hidden = false;
  setTimeout(() => {
    welcome.hidden = true;
  }, 3000);
}

function startCountdown(ui) {
  let seconds = 60;
  ui.resendButton.disabled = true;
  ui.countdown.textContent = `${seconds}s后重新发送`;

  resendTimer = setInterval(() => {
    seconds--;
    if (seconds <= 0) {
      stopCountdown(ui);
      return;
    }

    ui.countdown.textContent = `${seconds}s后重新发送`;
  }, 1000);
}

function stopCountdown(ui) {
  if (resendTimer) {
    clearInterval(resendTimer);
    resendTimer = null;
  }
  ui.resendButton.disabled = false;
  ui.countdown.textContent = '重新发送';
}

function showStatus(ui, message, type) {
  ui.statusMsg.textContent = message;
  ui.statusMsg.dataset.state = type;
  ui.statusMsg.hidden = false;

  setTimeout(() => {
    ui.statusMsg.hidden = true;
  }, 3000);
}

function setLoading(button, loading) {
  button.disabled = loading;
  const text = button.querySelector('span');
  if (!text) {
    return;
  }

  if (loading) {
    button.dataset.originalText = text.textContent;
    text.textContent = '处理中...';
    return;
  }

  text.textContent = button.dataset.originalText || text.textContent;
  delete button.dataset.originalText;
}

// 页面加载时初始化
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initAuthUI);
}
