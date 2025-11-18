import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID } from '../config.js';
import { Telegraf } from 'telegraf';
import { registerAdminCommands } from '../bot/admin.js';
import https from 'https';
import http from 'http';

// Create custom agents with longer timeouts
const httpsAgent = new https.Agent({
  keepAlive: true,
  timeout: 60000, // 60 seconds
  keepAliveMsecs: 30000
});

const httpAgent = new http.Agent({
  keepAlive: true,
  timeout: 60000,
  keepAliveMsecs: 30000
});

let bot;

export default function startTelegram() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('TELEGRAM_BOT_TOKEN not set — skipping Telegram bot');
    return null;
  }

  bot = new Telegraf(TELEGRAM_BOT_TOKEN, {
    telegram: {
      apiRoot: 'https://api.telegram.org',
      testEnv: false,
      webhookReply: false,
      agent: httpsAgent,
      attachmentAgent: httpsAgent
    },
    handlerTimeout: 90000 // 90 seconds timeout
  });

  bot.start((ctx) => ctx.reply('Welcome to Crypto Hub Bot — send /help to get started'));
  bot.command('help', (ctx) => ctx.reply('Use /subscribe <ticker> to get alerts'));

  // Register admin commands (this will also load schedules)
  try {
    registerAdminCommands(bot);
  } catch (e) {
    console.warn('Failed to register admin commands', e);
  }

  // register user commands (dynamic import)
  import('./commands.js')
    .then((m) => m.registerUserCommands(bot))
    .catch((e) => console.warn('Failed to register user commands', e));

  // Launch with error handling and retry logic
  const launchBot = async (retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[Telegram] Attempting to launch bot (attempt ${attempt}/${retries})...`);
        await bot.launch();
        console.log('[Telegram] Bot launched successfully');
        return;
      } catch (err) {
        console.error(`[Telegram] Launch attempt ${attempt} failed:`, err.message);
        if (attempt === retries) {
          console.error('[Telegram] All launch attempts failed. Bot will not be available.');
          console.error('[Telegram] Check your internet connection and TELEGRAM_BOT_TOKEN');
        } else {
          const delay = attempt * 2000; // Progressive delay: 2s, 4s, 6s
          console.log(`[Telegram] Retrying in ${delay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  };

  launchBot();

  return bot;
}

export function sendTelegramMessage(chatId, text) {
  if (!bot) return Promise.reject(new Error('telegram_not_initialized'));
  return bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' });
}

export function sendToChannel(text) {
  if (!TELEGRAM_CHANNEL_ID) return Promise.reject(new Error('telegram_channel_id_not_set'));
  if (!bot) return Promise.reject(new Error('telegram_not_initialized'));
  return bot.telegram.sendMessage(TELEGRAM_CHANNEL_ID, text, { parse_mode: 'Markdown' });
}
