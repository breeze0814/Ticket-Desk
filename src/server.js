import 'dotenv/config';
import { createApp } from './app.js';
import { createTelegramNotifier } from './telegram.js';

const DEFAULT_PORT = 3000;

const notifier = createTelegramNotifier({
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
});

const app = createApp({ notifier });
const port = Number(process.env.PORT ?? DEFAULT_PORT);

app.listen(port, () => {
  console.log(`工单系统已启动: http://localhost:${port}`);
});
