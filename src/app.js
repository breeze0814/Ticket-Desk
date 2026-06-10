import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTicketInput } from './tickets.js';

const STATIC_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
);

export function createApp({ notifier }) {
  const app = express();

  app.use(express.json());
  app.use(express.static(STATIC_ROOT));
  app.post('/api/tickets', (request, response) => {
    handleCreateTicket({ body: request.body, notifier, response });
  });

  return app;
}

async function handleCreateTicket({ body, notifier, response }) {
  const validation = validateTicketInput(body);

  if (!validation.ok) {
    response.status(validation.status).json({ error: validation.error });
    return;
  }

  try {
    await notifier.sendTicket(validation.ticket);
    response.status(201).json({
      message: '工单已提交',
      ticket: validation.ticket,
    });
  } catch (error) {
    response.status(502).json({ error: error.message });
  }
}
