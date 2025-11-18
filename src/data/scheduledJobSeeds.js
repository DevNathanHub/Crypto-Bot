/**
 * MongoDB ScheduledJob Seeds - Ready to Insert
 * Complete channel automation blueprint implementation
 */

export const jobSeeds = [
  // ==========================================
  // EVERY 5 MINUTES - MARKETING
  // ==========================================
  {
    name: '5min Marketing - Automation Value',
    cron: '*/5 * * * *',
    timezone: 'Europe/London',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '@cryptohub_alpha',
    enabled: true,
    payload: {
      type: 'marketing',
      geminiPrompt: 'Write a compelling 50-word pitch for automated crypto trading targeting African mobile users. Include M-Pesa, automation benefits, and 150% daily gains mention. End with crypto.loopnet.tech CTA.',
      maxTokens: 200,
      temperature: 0.85,
      appendCTA: true
    },
    retryPolicy: {
      retries: 3,
      backoffSec: 5
    }
  },

  // ==========================================
  // EVERY 5 MINUTES - STRATEGIES
  // ==========================================
  {
    name: '5min Strategy - Quick Alpha',
    cron: '*/5 * * * *',
    timezone: 'Europe/London',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '@cryptohub_alpha',
    enabled: true,
    payload: {
      type: 'strategy',
      geminiPrompt: 'Explain a profitable crypto trading strategy in 40 words. Make it actionable and exciting. Examples: whale tracking, DCA optimization, arbitrage, sentiment trading. Link to crypto.loopnet.tech.',
      maxTokens: 180,
      temperature: 0.9,
      appendCTA: true
    },
    retryPolicy: {
      retries: 3,
      backoffSec: 5
    }
  },

  // ==========================================
  // EVERY 10 MINUTES - WHALE ALERTS
  // ==========================================
  {
    name: '10min Whale Alert',
    cron: '*/10 * * * *',
    timezone: 'Europe/London',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '@cryptohub_alpha',
    enabled: true,
    payload: {
      type: 'whale',
      content: '', // Will be populated by channelScheduler with real whale data
      appendCTA: true
    },
    retryPolicy: {
      retries: 2,
      backoffSec: 3
    }
  },

  // ==========================================
  // EVERY 15 MINUTES - TRENDING COINS
  // ==========================================
  {
    name: '15min Trending Alert',
    cron: '*/15 * * * *',
    timezone: 'Europe/London',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '@cryptohub_alpha',
    enabled: true,
    payload: {
      type: 'trending',
      content: '', // Will be populated with CoinGecko trending data
      appendCTA: true
    },
    retryPolicy: {
      retries: 3,
      backoffSec: 5
    }
  },

  // ==========================================
  // EVERY 30 MINUTES - MARKET MOVERS
  // ==========================================
  {
    name: '30min Top Movers',
    cron: '*/30 * * * *',
    timezone: 'Europe/London',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '@cryptohub_alpha',
    enabled: true,
    payload: {
      type: 'movers',
      content: '', // Will be populated with top gainers/losers
      appendCTA: true
    },
    retryPolicy: {
      retries: 3,
      backoffSec: 5
    }
  },

  // ==========================================
  // EVERY HOUR - MARKET ALPHA
  // ==========================================
  {
    name: 'Hourly Market Alpha',
    cron: '0 * * * *',
    timezone: 'Europe/London',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '@cryptohub_alpha',
    enabled: true,
    payload: {
      type: 'alpha',
      geminiPrompt: 'Write a 1-hour market update covering BTC/ETH trends, support/resistance levels, and one hot altcoin. Keep it under 80 words. Professional but exciting tone. Include crypto.loopnet.tech.',
      maxTokens: 250,
      temperature: 0.7,
      appendCTA: true
    },
    retryPolicy: {
      retries: 3,
      backoffSec: 5
    }
  },

  // ==========================================
  // EVERY 3 HOURS - MOTIVATION
  // ==========================================
  {
    name: '3hour Motivation Boost',
    cron: '0 */3 * * *',
    timezone: 'Europe/London',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '@cryptohub_alpha',
    enabled: true,
    payload: {
      type: 'motivation',
      geminiPrompt: 'Write an inspiring message about mobile crypto trading success. Mention M-Pesa, $5 to $20 flips, or automation benefits. 45 words with crypto.loopnet.tech.',
      maxTokens: 180,
      temperature: 0.85,
      appendCTA: true
    },
    retryPolicy: {
      retries: 3,
      backoffSec: 5
    }
  },

  // ==========================================
  // DAILY GREETINGS
  // ==========================================
  {
    name: 'Daily Morning Greeting',
    cron: '0 9 * * *', // 9 AM London time
    timezone: 'Europe/London',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '@cryptohub_alpha',
    enabled: true,
    payload: {
      type: 'greeting_morning',
      content: `🌅 GM High-On-Chain Fam!
Markets are heating up — perfect setups forming.

🔥 Daily Tip:
Automated trading catches night volatility YOU sleep through.

Tap in: https://crypto.loopnet.tech`,
      appendCTA: false // Already included
    },
    retryPolicy: {
      retries: 3,
      backoffSec: 5
    }
  },

  {
    name: 'Daily Afternoon Check',
    cron: '0 14 * * *', // 2 PM London time
    timezone: 'Europe/London',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '@cryptohub_alpha',
    enabled: true,
    payload: {
      type: 'greeting_afternoon',
      content: `☀️ Midday Market Check:

Volatility picking up across major pairs.
Bot is actively scanning for setups.

Your only job? Stay plugged in → https://crypto.loopnet.tech`,
      appendCTA: false
    },
    retryPolicy: {
      retries: 3,
      backoffSec: 5
    }
  },

  {
    name: 'Daily Night Wrap',
    cron: '0 20 * * *', // 8 PM London time
    timezone: 'Europe/London',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '@cryptohub_alpha',
    enabled: true,
    payload: {
      type: 'greeting_night',
      content: `🌙 GN Legends.
While you sleep, our bots hunt alpha in the dark.
150%+ automated daily gains aren't a dream — they're math.

Plug in: https://crypto.loopnet.tech`,
      appendCTA: false
    },
    retryPolicy: {
      retries: 3,
      backoffSec: 5
    }
  },

  // ==========================================
  // DAILY DIGEST (Once per day)
  // ==========================================
  {
    name: 'Daily Complete Digest',
    cron: '0 8 * * *', // 8 AM London time
    timezone: 'Europe/London',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '@cryptohub_alpha',
    enabled: true,
    payload: {
      type: 'digest',
      content: '', // Will be populated with full market data
      appendCTA: true
    },
    retryPolicy: {
      retries: 3,
      backoffSec: 10
    }
  },

  // ==========================================
  // QUICK UPDATES (Every 15 minutes)
  // ==========================================
  {
    name: '15min Quick Market Update',
    cron: '*/15 * * * *',
    timezone: 'Europe/London',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '@cryptohub_alpha',
    enabled: true,
    payload: {
      type: 'quick_update',
      content: '', // Will be one-line summary from gemini
      appendCTA: false // Keep it clean for frequent updates
    },
    retryPolicy: {
      retries: 2,
      backoffSec: 3
    }
  }
];

export default jobSeeds;
