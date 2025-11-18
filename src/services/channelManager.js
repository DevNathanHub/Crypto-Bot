import ChannelMessage from '../models/ChannelMessage.js';
import ScheduledJob from '../models/ScheduledJob.js';

/**
 * Post to a single channel with retry logic
 */
async function postToSingleChannel(telegram, channelId, content, options = {}) {
  const maxAttempts = options.retries ?? (options.retryPolicy?.retries ?? 2);
  let attempt = 0;
  let lastErr = null;
  
  while (attempt <= maxAttempts) {
    try {
      const sendOptions = options.sendOptions || {};
      const sent = await telegram.sendMessage(channelId, content, sendOptions);

      const cm = new ChannelMessage({
        title: options.title || null,
        content,
        type: options.type || 'update',
        postedAt: new Date(),
        geminiPrompt: options.geminiPrompt || null,
        telegramMessageId: sent.message_id,
        telegramChatId: String(channelId)
      });
      await cm.save();
      return { ok: true, sent, record: cm, channelId };
    } catch (err) {
      lastErr = err;
      attempt += 1;
      const backoffSec = options.backoffSec ?? (options.retryPolicy?.backoffSec ?? 30);
      const wait = backoffSec * Math.pow(2, attempt - 1) * 1000;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  return { ok: false, error: lastErr, channelId };
}

/**
 * Post to multiple channels (supports single channelId or array)
 */
export async function postToChannel(telegram, channelId, content, options = {}) {
  // If channelId is an array, post to all channels
  if (Array.isArray(channelId)) {
    const results = await Promise.allSettled(
      channelId.map(id => postToSingleChannel(telegram, id, content, options))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok);
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
    
    console.log(`[ChannelManager] Posted to ${successful.length}/${channelId.length} channels`);
    
    if (failed.length > 0) {
      console.error(`[ChannelManager] Failed channels:`, failed.map(f => 
        f.status === 'fulfilled' ? f.value.channelId : 'unknown'
      ));
    }
    
    // Return success if at least one channel succeeded
    return {
      ok: successful.length > 0,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { ok: false, error: r.reason }),
      successful: successful.length,
      failed: failed.length,
      record: successful.length > 0 ? successful[0].value.record : null
    };
  }
  
  // Single channel (backward compatibility)
  return postToSingleChannel(telegram, channelId, content, options);
}

export async function updateMessageAnalytics(messageId, { views = 0, clicks = 0, reactions = 0 } = {}) {
  try {
    await ChannelMessage.updateOne(
      { _id: messageId },
      { $inc: { 'analytics.views': views, 'analytics.clicks': clicks, 'analytics.reactions': reactions } }
    );
  } catch (e) {
    console.warn('analytics update failed', e);
  }
}

export default { postToChannel, updateMessageAnalytics };
