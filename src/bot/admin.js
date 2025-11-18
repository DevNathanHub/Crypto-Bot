import ScheduledJob from '../models/ScheduledJob.js';
import { addAndSchedule, loadAndStartAll, stopAndRemove, reschedule } from '../cron/channelScheduler.js';
import { TELEGRAM_CHANNEL_ID, ADMIN_TELEGRAM_ID, CRYPTO, MOBILE_NUMBERS } from '../config.js';
import analytics from '../services/analytics.js';
import geminiClient from '../services/geminiClient.js';
import { postToChannel } from '../services/channelManager.js';

function isAdmin(ctx) {
  const adminId = process.env.ADMIN_TELEGRAM_ID || ADMIN_TELEGRAM_ID;
  return String(ctx.from.id) === String(adminId);
}

export function registerAdminCommands(bot) {
  // load DB schedules on registration (bot.telegram is available)
  loadAndStartAll(bot.telegram).catch((e) => console.error('scheduler load err', e));

  bot.command('job_create', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('Unauthorized.');
    const raw = ctx.message.text.replace('/job_create', '').trim();
    if (!raw) return ctx.reply('Usage: /job_create <name> || <cron> || <type> || <content|gemini:prompt>');
    const parts = raw.split('||').map((p) => p.trim());
    const [name, cronExpr, type, contentOrPrompt] = parts;
    if (!name || !cronExpr || !type || !contentOrPrompt) return ctx.reply('Invalid args. Example: /job_create MorningAlpha || 0 9 * * * || alpha || gemini:Write...');

    const payload = {};
    if (contentOrPrompt.startsWith('gemini:')) {
      payload.geminiPrompt = contentOrPrompt.replace(/^gemini:/, '').trim();
      payload.type = type;
    } else {
      payload.content = contentOrPrompt;
      payload.type = type;
    }

    const jobDoc = {
      name,
      cron: cronExpr,
      timezone: 'Europe/London',
      payload,
      createdBy: String(ctx.from.id),
      enabled: true
    };

    const saved = await addAndSchedule(jobDoc, ctx.telegram);
    return ctx.reply(`Scheduled job created: ${saved._id}\nName: ${saved.name}\nCron: ${saved.cron} (Europe/London)`);
  });

  bot.command('job_list', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('Unauthorized.');
    const jobs = await ScheduledJob.find().sort({ createdAt: -1 }).limit(50).lean();
    if (!jobs.length) return ctx.reply('No scheduled jobs.');
    const lines = jobs.map((j) => `ID: ${j._id}\nName: ${j.name}\nCron: ${j.cron} tz:${j.timezone}\nEnabled: ${j.enabled}\nLastRun: ${j.lastRunAt || 'never'}\n`).join('\n---\n');
    ctx.replyWithMarkdown(`*Scheduled Jobs*\n\n${lines}`);
  });

  bot.command('job_pause', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('Unauthorized.');
    const id = ctx.message.text.replace('/job_pause', '').trim();
    if (!id) return ctx.reply('Usage: /job_pause <jobId>');
    await stopAndRemove(id);
    ctx.reply(`Job ${id} paused.`);
  });

  bot.command('job_resume', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('Unauthorized.');
    const id = ctx.message.text.replace('/job_resume', '').trim();
    if (!id) return ctx.reply('Usage: /job_resume <jobId>');
    const job = await ScheduledJob.findById(id);
    if (!job) return ctx.reply('Job not found.');
    await reschedule(id, job.cron, ctx.telegram);
    ctx.reply(`Job ${id} resumed.`);
  });

  bot.command('job_reschedule', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('Unauthorized.');
    const raw = ctx.message.text.replace('/job_reschedule', '').trim();
    const [id, newCron] = raw.split('||').map((s) => s && s.trim());
    if (!id || !newCron) return ctx.reply('Usage: /job_reschedule <id> || <newCron>');
    await reschedule(id, newCron, ctx.telegram);
    ctx.reply(`Job ${id} rescheduled to ${newCron}`);
  });

  bot.command('job_run', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('Unauthorized.');
    const id = ctx.message.text.replace('/job_run', '').trim();
    if (!id) return ctx.reply('Usage: /job_run <jobId>');
    const job = await ScheduledJob.findById(id).lean();
    if (!job) return ctx.reply('Job not found.');
    try {
      let content = job.payload.content || '';
      if (job.payload.geminiPrompt) {
        content = await geminiClient.generate(job.payload.geminiPrompt, { maxTokens: job.payload.maxTokens || 220 });
      }
      content = `${content}\n\nTap in: https://crypto.loopnet.tech\n*Risk Disclaimer:* Past performance not guaranteed.`;
      const res = await postToChannel(ctx.telegram, job.channelId || process.env.TELEGRAM_CHANNEL_ID || null, content, { type: job.payload.type });
      if (res.ok) {
        await ScheduledJob.updateOne({ _id: id }, { $inc: { runCount: 1 }, $set: { lastRunAt: new Date() } });
        return ctx.reply('Job executed and posted.');
      } else {
        return ctx.reply(`Execution failed: ${res.error?.message || 'unknown'}`);
      }
    } catch (e) {
      return ctx.reply(`Execution error: ${e.message}`);
    }
  });

  bot.command('broadcast', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('Unauthorized.');
    const message = ctx.message.text.replace('/broadcast', '').trim();
    if (!message) return ctx.reply('Usage: /broadcast <message>');
    try {
      await ctx.telegram.sendMessage(process.env.TELEGRAM_CHANNEL_ID || config.TELEGRAM_CHANNEL_ID, message, { parse_mode: 'Markdown' });
      ctx.reply('Broadcast sent.');
    } catch (e) {
      ctx.reply('Broadcast failed: ' + e.message);
    }
  });

  bot.command('pin', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('Unauthorized.');
    const args = ctx.message.text.replace('/pin', '').trim().split(/\s+/);
    if (args.length < 2) return ctx.reply('Usage: /pin <chatId> <messageId>');
    const [chatId, messageId] = args;
    try {
      await ctx.telegram.pinChatMessage(chatId, Number(messageId));
      ctx.reply('Pinned message.');
    } catch (e) {
      ctx.reply('Pin failed: ' + e.message);
    }
  });

  // admin: show configured addresses/numbers (safe - no secrets)
  bot.command('show_config', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('Unauthorized.');
    const cfg = `Configured addresses/numbers:\n\n` +
      `USDT: \`${CRYPTO.usdt || 'NOT SET'}\`\n` +
      `BTC:  \`${CRYPTO.btc || 'NOT SET'}\`\n\n` +
      `M-Pesa (KE): ${MOBILE_NUMBERS.mpesa_ke || 'NOT SET'}\n` +
      `Airtel (UG): ${MOBILE_NUMBERS.airtel_ug || 'NOT SET'}\n` +
      `Airtel (MW): ${MOBILE_NUMBERS.airtel_mw || 'NOT SET'}`;

    await ctx.replyWithMarkdown(cfg);
  });

  // Seed all scheduled jobs from blueprint
  bot.command('seed_jobs', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('Unauthorized.');
    
    await ctx.reply('⏳ Seeding channel automation jobs...');
    
    try {
      // Dynamic import to avoid circular dependencies
      const { default: jobSeeds } = await import('../data/scheduledJobSeeds.js');
      
      let created = 0;
      let skipped = 0;
      
      for (const seed of jobSeeds) {
        // Check if job with same name already exists
        const existing = await ScheduledJob.findOne({ name: seed.name });
        
        if (existing) {
          skipped++;
          continue;
        }
        
        // Add createdBy field
        const jobDoc = {
          ...seed,
          createdBy: String(ctx.from.id),
          channelId: seed.channelId || process.env.TELEGRAM_CHANNEL_ID || TELEGRAM_CHANNEL_ID
        };
        
        await addAndSchedule(jobDoc, ctx.telegram);
        created++;
      }
      
      await ctx.replyWithMarkdown(
        `✅ *Seed Complete*\n\n` +
        `Created: ${created} jobs\n` +
        `Skipped: ${skipped} jobs (already exist)\n\n` +
        `Use /job_list to see all scheduled jobs.`
      );
      
    } catch (error) {
      console.error('Error seeding jobs:', error);
      await ctx.reply(`❌ Error seeding jobs: ${error.message}`);
    }
  });

  // Clear all scheduled jobs (dangerous - requires confirmation)
  bot.command('clear_jobs', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('Unauthorized.');
    
    await ctx.reply(
      '⚠️ *WARNING*: This will delete ALL scheduled jobs.\n\n' +
      'Reply with /clear_jobs_confirm to proceed.',
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('clear_jobs_confirm', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('Unauthorized.');
    
    try {
      const result = await ScheduledJob.deleteMany({});
      
      // Stop all active cron instances
      const { activeCronJobs } = await import('../cron/channelScheduler.js');
      activeCronJobs.forEach((cronJob, id) => {
        try {
          cronJob.stop();
        } catch (e) {
          console.error(`Error stopping cron ${id}:`, e);
        }
      });
      activeCronJobs.clear();
      
      await ctx.reply(`✅ Deleted ${result.deletedCount} jobs and stopped all cron instances.`);
    } catch (error) {
      console.error('Error clearing jobs:', error);
      await ctx.reply(`❌ Error: ${error.message}`);
    }
  });

  // Multi-channel delivery checker commands
  bot.command('check_delivery', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('Unauthorized.');
    
    try {
      const { getDeliveryStats } = await import('../utils/deliveryChecker.js');
      const hours = parseInt(ctx.message.text.split(' ')[1]) || 24;
      const stats = await getDeliveryStats(hours);
      
      let response = `📊 *Delivery Report - Last ${hours}h*\n\n`;
      response += `Total Messages: ${stats.totalMessages}\n`;
      response += `Active Channels: ${stats.uniqueChannels.length}\n\n`;
      
      response += `*By Type:*\n`;
      for (const [type, data] of Object.entries(stats.byType)) {
        response += `• ${type}: ${data.count} msgs → ${data.channelCount} channels\n`;
      }
      
      response += `\n*By Channel:*\n`;
      for (const [channelId, data] of Object.entries(stats.byChannel)) {
        response += `• ${channelId}: ${data.total} messages\n`;
      }
      
      await ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error checking delivery:', error);
      await ctx.reply(`❌ Error: ${error.message}`);
    }
  });

  bot.command('verify_multichannel', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('Unauthorized.');
    
    try {
      const { checkMultiChannelDelivery } = await import('../utils/deliveryChecker.js');
      const { TELEGRAM_CHANNEL_IDS } = await import('../config.js');
      
      const since = new Date(Date.now() - 6 * 60 * 60 * 1000); // Last 6 hours
      const report = await checkMultiChannelDelivery(since, 50);
      
      let response = `🔍 *Multi-Channel Verification*\n\n`;
      response += `Total Messages: ${report.totalMessages}\n`;
      response += `Unique Content: ${report.uniqueContent}\n`;
      response += `✅ Multi-channel: ${report.multiChannelDeliveries.length}\n`;
      response += `⚠️ Single-channel: ${report.singleChannelOnly.length}\n\n`;
      
      response += `*Expected Channels:*\n${TELEGRAM_CHANNEL_IDS.join(', ')}\n\n`;
      
      if (report.multiChannelDeliveries.length > 0) {
        response += `*Recent Multi-Channel Posts:*\n`;
        report.multiChannelDeliveries.slice(0, 3).forEach((item, idx) => {
          response += `${idx + 1}. [${item.type}] ${item.channelCount}/${TELEGRAM_CHANNEL_IDS.length} channels\n`;
        });
      }
      
      if (report.singleChannelOnly.length > 0) {
        response += `\n⚠️ *Single-Channel Issues:*\n`;
        response += `${report.singleChannelOnly.length} messages only sent to one channel\n`;
      }
      
      await ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error verifying multi-channel:', error);
      await ctx.reply(`❌ Error: ${error.message}`);
    }
  });

  bot.command('delivery_report', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('Unauthorized.');
    
    try {
      await ctx.reply('📊 Generating detailed delivery report...');
      const { printDeliveryReport } = await import('../utils/deliveryChecker.js');
      const hours = parseInt(ctx.message.text.split(' ')[1]) || 24;
      
      // This will log to console/PM2 logs
      await printDeliveryReport(hours);
      
      await ctx.reply(`✅ Detailed report generated and logged. Check PM2 logs with:\n\`pm2 logs crypto-hub-bot --lines 100\``, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error generating report:', error);
      await ctx.reply(`❌ Error: ${error.message}`);
    }
  });
}

export default { registerAdminCommands };
