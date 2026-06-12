import 'dotenv/config';
import { createApp } from './app.js';
import { createTelegramNotifier } from './telegram.js';
import { createMailerFromEnv } from './mailer.js';
import { createAuthServiceFromEnv } from './auth.js';

const DEFAULT_PORT = 3000;

const notifier = createTelegramNotifier({
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
});

const mailer = createMailerFromEnv();
const authService = createAuthServiceFromEnv(mailer);

const app = createApp({ notifier, authService });
const port = DEFAULT_PORT;

app.listen(port, () => {
  console.log(`工单系统已启动: http://localhost:${port}`);
});
