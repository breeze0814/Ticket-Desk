import 'dotenv/config';
import { createApp } from './app.js';
import { createTelegramNotifier } from './telegram.js';
import { createMailerFromEnv } from './mailer.js';
import { createAuthServiceFromEnv } from './auth.js';
import { getInternalPort } from './server-config.js';

const notifier = createTelegramNotifier({
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
});

const mailer = createMailerFromEnv();
const authService = createAuthServiceFromEnv(mailer);

const app = createApp({ notifier, authService });
const port = getInternalPort();

app.listen(port, () => {
  console.log(`工单系统已启动，内部监听端口: ${port}`);
});
