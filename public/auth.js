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
  const modal = document.querySelector('[data-auth-modal]');
  const emailStep = document.querySelector('[data-email-step]');
  const codeStep = document.querySelector('[data-code-step]');
  const emailInput = document.querySelector('[data-auth-email]');
  const codeInput = document.querySelector('[data-auth-code]');
  const sendButton = document.querySelector('[data-send-code]');
  const verifyButton = document.querySelector('[data-verify-code]');
  const backButton = document.querySelector('[data-back-to-email]');
  const resendButton = document.querySelector('[data-resend-code]');
  const displayEmail = document.querySelector('[data-display-email]');
  const countdown = document.querySelector('[data-countdown]');
  const statusMsg = document.querySelector('[data-auth-status]');

  // 检查是否已登录
  if (isAuthenticated()) {
    hideAuthModal();
    showWelcome();
    return;
  }

  showAuthModal();

  // 发送验证码
  sendButton.addEventListener('click', async () => {
    const email = emailInput.value.trim();

    if (!validateEmail(email)) {
      showStatus('请输入有效的邮箱地址', 'error');
      return;
    }

    setLoading(sendButton, true);
    try {
      await sendVerificationCode(email);
      currentEmail = email;
      displayEmail.textContent = email;
      showCodeStep();
      startCountdown();
      showStatus('验证码已发送', 'success');
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      setLoading(sendButton, false);
    }
  });

  // 验证验证码
  verifyButton.addEventListener('click', async () => {
    const code = codeInput.value.trim();

    if (code.length !== 4 || !/^\d+$/.test(code)) {
      showStatus('请输入4位数字验证码', 'error');
      return;
    }

    setLoading(verifyButton, true);
    try {
      await verifyCode(currentEmail, code);
      hideAuthModal();
      showWelcome();
      showStatus('登录成功！', 'success');
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      setLoading(verifyButton, false);
    }
  });

  // 返回邮箱输入
  backButton.addEventListener('click', () => {
    showEmailStep();
    codeInput.value = '';
    stopCountdown();
  });

  // 重新发送
  resendButton.addEventListener('click', async () => {
    setLoading(resendButton, true);
    try {
      await sendVerificationCode(currentEmail);
      startCountdown();
      showStatus('验证码已重新发送', 'success');
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      setLoading(resendButton, false);
    }
  });

  function showEmailStep() {
    emailStep.hidden = false;
    codeStep.hidden = true;
  }

  function showCodeStep() {
    emailStep.hidden = true;
    codeStep.hidden = false;
    codeInput.focus();
  }

  function showAuthModal() {
    modal.hidden = false;
    emailInput.focus();
  }

  function hideAuthModal() {
    modal.hidden = true;
  }

  function showWelcome() {
    const email = getAuthEmail();
    const welcome = document.querySelector('[data-welcome-message]');
    if (welcome && email) {
      welcome.textContent = `✅ 欢迎，${email}`;
      welcome.hidden = false;
      setTimeout(() => {
        welcome.hidden = true;
      }, 3000);
    }
  }

  function startCountdown() {
    let seconds = 60;
    resendButton.disabled = true;
    countdown.textContent = `${seconds}s后重新发送`;

    resendTimer = setInterval(() => {
      seconds--;
      if (seconds <= 0) {
        stopCountdown();
      } else {
        countdown.textContent = `${seconds}s后重新发送`;
      }
    }, 1000);
  }

  function stopCountdown() {
    if (resendTimer) {
      clearInterval(resendTimer);
      resendTimer = null;
    }
    resendButton.disabled = false;
    countdown.textContent = '重新发送';
  }

  function showStatus(message, type) {
    statusMsg.textContent = message;
    statusMsg.dataset.state = type;
    statusMsg.hidden = false;

    setTimeout(() => {
      statusMsg.hidden = true;
    }, 3000);
  }

  function setLoading(button, loading) {
    button.disabled = loading;
    const text = button.querySelector('span');
    if (text) {
      if (!loading && !button.dataset.originalText) {
        button.dataset.originalText = text.textContent;
      }
      text.textContent = loading ? '处理中...' : (button.dataset.originalText || text.textContent);
    }
  }
}

// 页面加载时初始化
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initAuthUI);
}
