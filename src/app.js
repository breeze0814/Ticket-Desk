import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTicketInput } from './tickets.js';
import { createAuthMiddleware } from './middleware/auth.js';

const STATIC_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
);

const RATE_LIMIT_WINDOW_MS = 60000; // 1分钟
const MAX_REQUESTS_PER_WINDOW = 3; // 每分钟最多3次
const RATE_LIMIT_CLEANUP_MS = 300000; // 5分钟

function getClientIp(request) {
  return request.headers['x-forwarded-for']?.split(',')[0].trim()
    || request.headers['x-real-ip']
    || request.socket.remoteAddress;
}

function createRateLimiter() {
  const records = new Map();
  const cleanupInterval = setInterval(() => cleanupRateLimitRecords(records), RATE_LIMIT_CLEANUP_MS);

  return {
    check: (ip) => checkRateLimit(records, ip),
    stop: () => clearInterval(cleanupInterval),
  };
}

function cleanupRateLimitRecords(records) {
  const now = Date.now();

  for (const [ip, record] of records.entries()) {
    if (now > record.resetAt) {
      records.delete(ip);
    }
  }
}

function checkRateLimit(records, ip) {
  const now = Date.now();
  const record = records.get(ip);

  if (!record) {
    records.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (now > record.resetAt) {
    records.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const remainingSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remainingSeconds };
  }

  records.set(ip, { ...record, count: record.count + 1 });
  return { allowed: true };
}

export function createApp({ notifier, authService }) {
  const app = express();
  const rateLimiter = createRateLimiter();

  app.use(express.json());
  app.use(express.static(STATIC_ROOT));

  // 认证端点
  app.post('/api/auth/send-code', async (request, response) => {
    await handleSendCode({ request, authService, response });
  });

  app.post('/api/auth/verify-code', async (request, response) => {
    await handleVerifyCode({ request, authService, response });
  });

  // 工单端点（需要认证）
  const authMiddleware = createAuthMiddleware(authService);
  app.post('/api/tickets', authMiddleware, (request, response) => {
    handleCreateTicket({ request, notifier, response, rateLimiter });
  });

  app.locals.stopRateLimiter = rateLimiter.stop;
  return app;
}

async function handleSendCode({ request, authService, response }) {
  const { email } = request.body;

  try {
    const result = await authService.sendVerificationCode(email);
    if (!result.success) {
      const status = result.message.includes('频繁') ? 429 : 400;
      response.status(status).json({ error: result.message });
      return;
    }

    response.status(200).json(result);
  } catch (error) {
    const status = error.message.includes('秒后再试') ? 429 : 400;
    response.status(status).json({ error: error.message });
  }
}

async function handleVerifyCode({ request, authService, response }) {
  const { email, code } = request.body;

  try {
    const result = await authService.verifyCode(email, code);
    response.status(200).json(result);
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
}

async function handleCreateTicket({ request, notifier, response, rateLimiter }) {
  const clientIp = getClientIp(request);
  console.log(`[${new Date().toISOString()}] 收到工单提交请求，IP: ${clientIp}`);

  const rateLimit = rateLimiter.check(clientIp);

  if (!rateLimit.allowed) {
    console.log(`[${new Date().toISOString()}] IP ${clientIp} 超出频率限制`);
    response.status(429).json({
      error: `提交过于频繁，请 ${rateLimit.remainingSeconds} 秒后再试`
    });
    return;
  }

  const validation = validateTicketInput(request.body);

  if (!validation.ok) {
    console.log(`[${new Date().toISOString()}] 工单验证失败: ${validation.error}`);
    response.status(validation.status).json({ error: validation.error });
    return;
  }

  // 从认证中间件添加的 userEmail
  const ticket = {
    ...validation.ticket,
    userEmail: request.userEmail,
  };

  console.log(`[${new Date().toISOString()}] 开始发送 Telegram 通知...`);
  try {
    await notifier.sendTicket(ticket);
    console.log(`[${new Date().toISOString()}] Telegram 通知发送成功`);
    response.status(201).json({
      message: '工单已提交',
      ticket,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Telegram 通知失败:`, error);
    response.status(502).json({ error: error.message });
  }
}
