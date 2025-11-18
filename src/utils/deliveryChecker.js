import ChannelMessage from '../models/ChannelMessage.js';

/**
 * Check if the same content was delivered to all configured channels
 * @param {Date} since - Check messages since this time
 * @param {number} limit - Number of recent messages to check
 */
export async function checkMultiChannelDelivery(since = null, limit = 50) {
  const query = {};
  if (since) {
    query.postedAt = { $gte: since };
  }
  
  const messages = await ChannelMessage.find(query)
    .sort({ postedAt: -1 })
    .limit(limit)
    .select('content type postedAt telegramChatId telegramMessageId')
    .lean();
  
  // Group messages by content and type
  const contentGroups = {};
  
  for (const msg of messages) {
    const key = `${msg.type}:${msg.content.substring(0, 100)}`; // First 100 chars as key
    if (!contentGroups[key]) {
      contentGroups[key] = {
        content: msg.content.substring(0, 100) + '...',
        type: msg.type,
        postedAt: msg.postedAt,
        channels: [],
        messageIds: []
      };
    }
    contentGroups[key].channels.push(msg.telegramChatId);
    contentGroups[key].messageIds.push(msg.telegramMessageId);
  }
  
  // Check which content was sent to multiple channels
  const report = {
    totalMessages: messages.length,
    uniqueContent: Object.keys(contentGroups).length,
    multiChannelDeliveries: [],
    singleChannelOnly: [],
    timestamp: new Date()
  };
  
  for (const [key, group] of Object.entries(contentGroups)) {
    const uniqueChannels = [...new Set(group.channels)];
    
    if (uniqueChannels.length > 1) {
      report.multiChannelDeliveries.push({
        content: group.content,
        type: group.type,
        postedAt: group.postedAt,
        channelCount: uniqueChannels.length,
        channels: uniqueChannels,
        messageIds: group.messageIds
      });
    } else {
      report.singleChannelOnly.push({
        content: group.content,
        type: group.type,
        postedAt: group.postedAt,
        channel: uniqueChannels[0]
      });
    }
  }
  
  return report;
}

/**
 * Verify that a specific message type was delivered to all expected channels
 * @param {string} type - Message type to check
 * @param {string[]} expectedChannels - Array of expected channel IDs
 * @param {Date} since - Check messages since this time
 */
export async function verifyMessageDelivery(type, expectedChannels, since = null) {
  const query = { type };
  if (since) {
    query.postedAt = { $gte: since };
  }
  
  const messages = await ChannelMessage.find(query)
    .sort({ postedAt: -1 })
    .select('content postedAt telegramChatId')
    .lean();
  
  // Group by content to check if same content went to all channels
  const contentMap = {};
  
  for (const msg of messages) {
    const contentKey = msg.content.substring(0, 150); // Use first 150 chars as key
    if (!contentMap[contentKey]) {
      contentMap[contentKey] = {
        channels: new Set(),
        postedAt: msg.postedAt
      };
    }
    contentMap[contentKey].channels.add(msg.telegramChatId);
  }
  
  const results = [];
  
  for (const [content, data] of Object.entries(contentMap)) {
    const deliveredChannels = Array.from(data.channels);
    const missingChannels = expectedChannels.filter(ch => !deliveredChannels.includes(String(ch)));
    
    results.push({
      content: content + '...',
      postedAt: data.postedAt,
      delivered: deliveredChannels.length === expectedChannels.length,
      deliveredChannels,
      missingChannels,
      deliveryRate: `${deliveredChannels.length}/${expectedChannels.length}`
    });
  }
  
  return {
    type,
    expectedChannels,
    totalMessages: results.length,
    fullyDelivered: results.filter(r => r.delivered).length,
    partialDelivery: results.filter(r => !r.delivered).length,
    details: results
  };
}

/**
 * Get delivery statistics for the last N hours
 * @param {number} hours - Number of hours to check
 */
export async function getDeliveryStats(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const messages = await ChannelMessage.find({ postedAt: { $gte: since } })
    .select('type postedAt telegramChatId')
    .lean();
  
  // Group by type
  const statsByType = {};
  const channelStats = {};
  
  for (const msg of messages) {
    // Type stats
    if (!statsByType[msg.type]) {
      statsByType[msg.type] = { count: 0, channels: new Set() };
    }
    statsByType[msg.type].count++;
    statsByType[msg.type].channels.add(msg.telegramChatId);
    
    // Channel stats
    const channelId = msg.telegramChatId;
    if (!channelStats[channelId]) {
      channelStats[channelId] = { total: 0, byType: {} };
    }
    channelStats[channelId].total++;
    channelStats[channelId].byType[msg.type] = (channelStats[channelId].byType[msg.type] || 0) + 1;
  }
  
  // Convert Sets to arrays
  for (const type in statsByType) {
    statsByType[type].channels = Array.from(statsByType[type].channels);
    statsByType[type].channelCount = statsByType[type].channels.length;
  }
  
  return {
    period: `Last ${hours} hours`,
    since,
    totalMessages: messages.length,
    byType: statsByType,
    byChannel: channelStats,
    uniqueChannels: Object.keys(channelStats)
  };
}

/**
 * Print a formatted delivery report to console
 */
export async function printDeliveryReport(hours = 24) {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          MULTI-CHANNEL DELIVERY REPORT                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const stats = await getDeliveryStats(hours);
  
  console.log(`📊 Period: ${stats.period}`);
  console.log(`📨 Total Messages: ${stats.totalMessages}`);
  console.log(`📡 Active Channels: ${stats.uniqueChannels.length}\n`);
  
  console.log('📋 Messages by Type:');
  console.log('─────────────────────────────────────────────────────────────');
  for (const [type, data] of Object.entries(stats.byType)) {
    console.log(`  ${type.padEnd(20)} ${data.count} msgs → ${data.channelCount} channels`);
  }
  
  console.log('\n📡 Messages by Channel:');
  console.log('─────────────────────────────────────────────────────────────');
  for (const [channelId, data] of Object.entries(stats.byChannel)) {
    console.log(`  Channel ${channelId}: ${data.total} total messages`);
    for (const [type, count] of Object.entries(data.byType)) {
      console.log(`    └─ ${type}: ${count}`);
    }
  }
  
  console.log('\n');
  
  const delivery = await checkMultiChannelDelivery(stats.since);
  console.log(`✅ Multi-channel deliveries: ${delivery.multiChannelDeliveries.length}`);
  console.log(`⚠️  Single-channel only: ${delivery.singleChannelOnly.length}\n`);
  
  if (delivery.multiChannelDeliveries.length > 0) {
    console.log('Recent multi-channel posts (last 5):');
    delivery.multiChannelDeliveries.slice(0, 5).forEach((item, idx) => {
      console.log(`  ${idx + 1}. [${item.type}] ${item.postedAt.toISOString()}`);
      console.log(`     Channels: ${item.channels.join(', ')}`);
      console.log(`     "${item.content}"\n`);
    });
  }
  
  return stats;
}

export default {
  checkMultiChannelDelivery,
  verifyMessageDelivery,
  getDeliveryStats,
  printDeliveryReport
};
