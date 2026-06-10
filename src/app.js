import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTicketInput } from './tickets.js';

const STATIC_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
);

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1分钟
const MAX_REQUESTS_PER_WINDOW = 3; // 每分钟最多3次

// 每5分钟清理过期记录
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(ip);
    }
  }
}, 300000);

function getClientIp(request) {
  return request.headers['x-forwarded-for']?.split(',')[0].trim()
    || request.headers['x-real-ip']
    || request.socket.remoteAddress;
}

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const remainingSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remainingSeconds };
  }

  record.count++;
  return { allowed: true };
}

export function createApp({ notifier }) {
  const app = express();

  app.use(express.json());
  app.use(express.static(STATIC_ROOT));
  app.post('/api/tickets', (request, response) => {
    handleCreateTicket({ request, notifier, response });
  });

  return app;
}

async function handleCreateTicket({ request, notifier, response }) {
  const clientIp = getClientIp(request);
  console.log(`[${new Date().toISOString()}] 收到工单提交请求，IP: ${clientIp}`);

  const rateLimit = checkRateLimit(clientIp);

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

  console.log(`[${new Date().toISOString()}] 开始发送 Telegram 通知...`);
  try {
    await notifier.sendTicket(validation.ticket);
    console.log(`[${new Date().toISOString()}] Telegram 通知发送成功`);
    response.status(201).json({
      message: '工单已提交',
      ticket: validation.ticket,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Telegram 通知失败:`, error);
    response.status(502).json({ error: error.message });
  }
}
