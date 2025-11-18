import { CronJob } from 'cron';
import ScheduledJob from '../models/ScheduledJob.js';
import { postToChannel } from '../services/channelManager.js';
import geminiClient from '../services/geminiClient.js';
import analytics from '../services/analytics.js';
import { fetchTopCoinPrices, fetchTrendingCoins, fetchTopMovers, fetchGlobalMarketData } from '../services/priceFetcher.js';
import { getRecentWhaleTransactions } from '../services/etherscan.js';
import { TELEGRAM_CHANNEL_IDS } from '../config.js';

const activeCronJobs = new Map();

// Content rotation state (prevents repetition)
const contentRotation = {
  marketing: 0,
  strategy: 0,
  motivation: 0,
  greeting_morning: 0,
  greeting_night: 0
};

/**
 * Get next template from rotation
 */
async function getRotatedContent(type) {
  try {
    const { default: templates } = await import('../data/contentTemplates.js');
    
    if (type === 'marketing' && templates.MARKETING_MESSAGES) {
      const messages = templates.MARKETING_MESSAGES;
      const index = contentRotation.marketing % messages.length;
      contentRotation.marketing++;
      return messages[index].content;
    }
    
    if (type === 'strategy' && templates.STRATEGY_MESSAGES) {
      const messages = templates.STRATEGY_MESSAGES;
      const index = contentRotation.strategy % messages.length;
      contentRotation.strategy++;
      return messages[index].content;
    }
    
    if (type === 'motivation' && templates.MOTIVATION_MESSAGES) {
      const messages = templates.MOTIVATION_MESSAGES;
      const index = contentRotation.motivation % messages.length;
      contentRotation.motivation++;
      return messages[index].content;
    }
    
    if (type === 'greeting_morning' && templates.GREETING_MESSAGES?.morning) {
      const messages = templates.GREETING_MESSAGES.morning;
      const index = contentRotation.greeting_morning % messages.length;
      contentRotation.greeting_morning++;
      return messages[index].content;
    }
    
    if (type === 'greeting_night' && templates.GREETING_MESSAGES?.night) {
      const messages = templates.GREETING_MESSAGES.night;
      const index = contentRotation.greeting_night % messages.length;
      contentRotation.greeting_night++;
      return messages[index].content;
    }
    
  } catch (error) {
    console.error('Error loading templates:', error);
  }
  
  return null;
}

function scheduleCronInstance(jobDoc, telegram) {
  if (!jobDoc.enabled) return;
  const tz = jobDoc.timezone || 'Europe/London';
  const cronTime = jobDoc.cron;
  const id = jobDoc._id.toString();

  if (activeCronJobs.has(id)) return;

  const task = new CronJob(
    cronTime,
    async () => {
      console.log(`[Scheduler] running job ${jobDoc.name} (${id}) at ${new Date().toISOString()} tz=${tz}`);
      try {
        const latest = await ScheduledJob.findById(id);
        if (!latest || !latest.enabled) return;

        let content = jobDoc.payload.content || '';
        
        // Handle different job types with rich data
        const jobType = jobDoc.payload.type || jobDoc.name.toLowerCase();
        
        // Try template rotation first if no custom content
        if (!content && !jobDoc.payload.geminiPrompt) {
          content = await getRotatedContent(jobType);
        }
        
        if (jobType.includes('digest') || jobType.includes('daily')) {
          // Daily digest with full market data
          try {
            const [prices, movers, trending, global] = await Promise.all([
              fetchTopCoinPrices(),
              fetchTopMovers(),
              fetchTrendingCoins(),
              fetchGlobalMarketData()
            ]);
            content = geminiClient.generateDailyDigest(prices, movers, trending, global);
          } catch (err) {
            console.error('[Scheduler] Failed to fetch digest data:', err);
            content = jobDoc.payload.content || '📊 Market update temporarily unavailable';
          }
        } else if (jobType.includes('trending')) {
          // Trending coins alert
          try {
            const trending = await fetchTrendingCoins();
            content = geminiClient.generateTrendingAlert(trending);
          } catch (err) {
            console.error('[Scheduler] Failed to fetch trending data:', err);
            content = '🔥 Trending data temporarily unavailable';
          }
        } else if (jobType.includes('whale')) {
          // Whale alert
          try {
            const whales = await getRecentWhaleTransactions(1000); // 1000+ ETH
            if (whales && whales.length > 0) {
              content = geminiClient.generateWhaleAlert(whales[0]);
            } else {
              // Skip posting if no whales detected
              console.log('[Scheduler] No whale transactions detected, skipping post');
              return;
            }
          } catch (err) {
            console.error('[Scheduler] Failed to fetch whale data:', err);
            return; // Don't post on error for whale alerts
          }
        } else if (jobType.includes('mover') || jobType.includes('gainer')) {
          // Top movers/gainers
          try {
            const movers = await fetchTopMovers();
            content = geminiClient.generateMoversSummary(movers.gainers, movers.losers);
          } catch (err) {
            console.error('[Scheduler] Failed to fetch movers data:', err);
            content = '📊 Market movers data temporarily unavailable';
          }
        } else if (jobType.includes('quick') || jobType.includes('update')) {
          // Quick market update
          try {
            const [prices, trending, global] = await Promise.all([
              fetchTopCoinPrices(),
              fetchTrendingCoins(),
              fetchGlobalMarketData()
            ]);
            content = geminiClient.generateOneLineSummary(prices, trending, global);
          } catch (err) {
            console.error('[Scheduler] Failed to fetch update data:', err);
            content = '📊 Market update temporarily unavailable';
          }
        } else if (jobDoc.payload.geminiPrompt) {
          // Custom AI-generated content
          const aiResp = await geminiClient.generate(jobDoc.payload.geminiPrompt, { 
            maxTokens: jobDoc.payload.maxTokens || 220, 
            temperature: jobDoc.payload.temperature ?? 0.8 
          });
          content = aiResp || content;
        }

        // Append CTA if not explicitly disabled
        if (jobDoc.payload.appendCTA !== false && !content.includes('crypto.loopnet.tech')) {
          content = `${content}\n\n_Stay ahead at crypto.loopnet.tech_`;
        }

        // Post to all configured channels (supports multi-channel broadcasting)
        const channelIds = jobDoc.channelId || TELEGRAM_CHANNEL_IDS;
        const result = await postToChannel(telegram, channelIds, content, {
          retries: jobDoc.retryPolicy?.retries,
          backoffSec: jobDoc.retryPolicy?.backoffSec,
          type: jobDoc.payload.type,
          geminiPrompt: jobDoc.payload.geminiPrompt,
          sendOptions: { parse_mode: 'Markdown' }
        });

        await ScheduledJob.updateOne({ _id: id }, { $inc: { runCount: 1 }, $set: { lastRunAt: new Date(), updatedAt: new Date() } });

        if (result.ok) {
          if (result.record) {
            await analytics.recordMessage({ 
              title: jobDoc.name, 
              content, 
              type: jobDoc.payload.type, 
              geminiPrompt: jobDoc.payload.geminiPrompt 
            });
          }
          console.log(`[Scheduler] job ${jobDoc.name} success`);
        } else {
          console.error(`[Scheduler] job ${jobDoc.name} failed after retries`, result.error?.message || result.error);
        }
      } catch (e) {
        console.error(`[Scheduler] job ${jobDoc.name} execution error`, e);
      }
    },
    null,
    true,
    tz
  );

  activeCronJobs.set(id, task);
  console.log(`[Scheduler] scheduled job ${jobDoc.name} (${id}) -> ${cronTime} tz=${tz}`);
}

async function loadAndStartAll(telegram) {
  const jobs = await ScheduledJob.find({}).lean();
  for (const j of jobs) {
    scheduleCronInstance(j, telegram);
  }
}

async function addAndSchedule(jobDoc, telegram) {
  const saved = await (new ScheduledJob(jobDoc)).save();
  scheduleCronInstance(saved, telegram);
  return saved;
}

async function stopAndRemove(id) {
  const inst = activeCronJobs.get(id);
  if (inst) {
    try { inst.stop(); } catch (e) {}
    activeCronJobs.delete(id);
  }
  await ScheduledJob.updateOne({ _id: id }, { enabled: false, updatedAt: new Date() });
}

async function reschedule(id, newCron, telegram) {
  await stopAndRemove(id);
  await ScheduledJob.updateOne({ _id: id }, { cron: newCron, updatedAt: new Date(), enabled: true });
  const job = await ScheduledJob.findById(id);
  scheduleCronInstance(job, telegram);
}

export { loadAndStartAll, addAndSchedule, stopAndRemove, reschedule, activeCronJobs };
