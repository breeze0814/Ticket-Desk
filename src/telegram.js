import { formatTicketMessage } from './tickets.js';
import { ProxyAgent } from 'undici';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

function getProxyAgent() {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  return proxy ? new ProxyAgent(proxy) : undefined;
}

export function createTelegramNotifier(options = {}) {
  const { botToken, chatId, fetch: fetchImpl = globalThis.fetch } = options;

  requireValue(botToken, 'TELEGRAM_BOT_TOKEN');
  requireValue(chatId, 'TELEGRAM_CHAT_ID');
  requireFetch(fetchImpl);

  return {
    sendTicket: (ticket) => sendTicket({ botToken, chatId, fetchImpl, ticket }),
  };
}

async function sendTicket({ botToken, chatId, fetchImpl, ticket }) {
  const url = `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`;
  console.log(`[Telegram] 请求 URL: ${url}`);
  console.log(`[Telegram] 代理配置: HTTP_PROXY=${process.env.HTTP_PROXY}, HTTPS_PROXY=${process.env.HTTPS_PROXY}`);

  try {
    const dispatcher = getProxyAgent();
    const options = buildRequest(chatId, ticket);
    if (dispatcher) {
      options.dispatcher = dispatcher;
    }

    const response = await fetchImpl(url, options);
    console.log(`[Telegram] 响应状态: ${response.status}`);

    if (!response.ok) {
      throw new Error(await buildTelegramError(response));
    }
  } catch (error) {
    console.error(`[Telegram] 请求失败:`, error);
    throw error;
  }
}

function buildRequest(chatId, ticket) {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: formatTicketMessage(ticket),
    }),
  };
}

async function buildTelegramError(response) {
  const body = await response.text();
  return `Telegram 通知失败: ${response.status} ${body}`;
}

function requireValue(value, envName) {
  if (!String(value ?? '').trim()) {
    throw new Error(`缺少 ${envName}`);
  }
}

function requireFetch(fetchImpl) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('当前 Node.js 环境缺少 fetch');
  }
}
