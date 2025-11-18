import cron from 'node-cron';
import fetchPrice from '../services/priceFetcher.js';
import Gemini from '../services/geminiClient.js';
import PriceCache from '../models/PriceCache.js';
import { sendToChannel } from '../services/telegramBot.js';

function safeLog(...args) {
  console.log('[scheduler]', ...args);
}

export default function startScheduler() {
  // every minute: fetch BTC price and persist to PriceCache
  cron.schedule('*/1 * * * *', async () => {
    try {
      const price = await fetchPrice('bitcoin');
      await PriceCache.create({ ticker: 'bitcoin', price, timestamp: new Date() });
      safeLog('Persisted BTC price', price);
    } catch (err) {
      safeLog('price job error', err.message || err);
    }
  });

  // every 15 minutes: post a short update to the Telegram channel (if configured)
  cron.schedule('*/15 * * * *', async () => {
    try {
      const recent = await PriceCache.find({ ticker: 'bitcoin' }).sort({ timestamp: -1 }).limit(2).lean();
      const latest = recent[0];
      const prev = recent[1];
      let change = 'N/A';
      if (latest && prev) {
        change = (((latest.price - prev.price) / prev.price) * 100).toFixed(2);
      }

      const topMovers = [{ ticker: 'BTC', change }];
      const digest = await Gemini.summarizeDigest({ topMovers, headlines: [] });
      const timeStr = new Date().toISOString();
      const message = `*Crypto Hub Update*\n${timeStr}\nBTC: $${latest?.price ?? 'N/A'} (${change}% since last)\n\n${digest.summary}\n\nMore: https://crypto.loopnet.tech`;

      try {
        await sendToChannel(message);
        safeLog('Posted update to Telegram channel');
      } catch (sendErr) {
        safeLog('Failed to send channel update', sendErr.message || sendErr);
      }
    } catch (err) {
      safeLog('channel update job error', err.message || err);
    }
  });

  // daily digest at 08:00 UTC — uses Gemini placeholder to create summary
  cron.schedule('0 8 * * *', async () => {
    try {
      // simplistic: get last 24h price points for bitcoin
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = await PriceCache.find({ ticker: 'bitcoin', timestamp: { $gte: since } })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();

      const topMovers = [
        { ticker: 'btc', change: ((recent[0]?.price || 0) - (recent.at(-1)?.price || 0)).toFixed(2) }
      ];

      const digest = await Gemini.summarizeDigest({ topMovers, headlines: [] });
      safeLog('Daily digest:', digest.summary);
      // Post daily digest to channel as well
      try {
        const message = `*Daily Digest*\n${new Date().toISOString()}\n\n${digest.summary}\n\nUpgrade for more at https://crypto.loopnet.tech`;
        await sendToChannel(message);
        safeLog('Posted daily digest to Telegram channel');
      } catch (sendErr) {
        safeLog('Failed to send daily digest to channel', sendErr.message || sendErr);
      }
    } catch (err) {
      safeLog('daily digest error', err.message || err);
    }
  });

  safeLog('Scheduler started');
}
