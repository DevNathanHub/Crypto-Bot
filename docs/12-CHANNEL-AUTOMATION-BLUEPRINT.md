# 🚀 Channel Automation Blueprint - Implementation Guide

Complete guide for the Crypto Hub Bot's automated channel content system.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Content Schedule](#content-schedule)
3. [Quick Start](#quick-start)
4. [Admin Commands](#admin-commands)
5. [Content Templates](#content-templates)
6. [Customization](#customization)
7. [Best Practices](#best-practices)

---

## 🎯 Overview

The Crypto Hub Bot uses a sophisticated content automation system that:

- ✅ Posts **marketing messages** every 5 minutes
- ✅ Shares **trading strategies** every 5 minutes
- ✅ Alerts on **whale transactions** every 10 minutes
- ✅ Shows **trending coins** every 15 minutes
- ✅ Reports **top movers** every 30 minutes
- ✅ Delivers **market alpha** every hour
- ✅ Sends **motivation** every 3 hours
- ✅ Posts **daily greetings** (morning/afternoon/night)
- ✅ Generates **daily digest** with full market data

All content is:
- 📍 **Timezone-aware** (Europe/London by default)
- 🔄 **Auto-rotates** templates to prevent repetition
- 🤖 **AI-enhanced** with Gemini for dynamic content
- 📊 **Data-driven** using CoinGecko + Etherscan APIs
- 💰 **Conversion-focused** with crypto.loopnet.tech CTAs

---

## ⏰ Content Schedule

### High-Frequency (Every 5-15 minutes)

| Interval | Type | Purpose | CTA |
|----------|------|---------|-----|
| 5 min | Marketing | Drive signups | ✅ |
| 5 min | Strategy | Educate + engage | ✅ |
| 10 min | Whale Alerts | Real-time alpha | ✅ |
| 15 min | Trending Coins | Hot opportunities | ✅ |
| 15 min | Quick Update | Market pulse | ❌ |

### Medium-Frequency (Every 30 min - 3 hours)

| Interval | Type | Purpose | CTA |
|----------|------|---------|-----|
| 30 min | Top Movers | Gainers/Losers | ✅ |
| 1 hour | Market Alpha | Technical analysis | ✅ |
| 3 hours | Motivation | Inspire action | ✅ |

### Daily Posts

| Time | Type | Content |
|------|------|---------|
| 8:00 AM | Daily Digest | Full market summary |
| 9:00 AM | Morning Greeting | GM message + tip |
| 2:00 PM | Afternoon Check | Midday update |
| 8:00 PM | Night Wrap | GN message |

---

## 🚀 Quick Start

### Step 1: Seed All Jobs

Use the admin command to create all scheduled jobs:

```
/seed_jobs
```

This will create **13 automated jobs** based on the blueprint.

**Output:**
```
✅ Seed Complete

Created: 13 jobs
Skipped: 0 jobs (already exist)

Use /job_list to see all scheduled jobs.
```

### Step 2: Verify Jobs

Check all scheduled jobs:

```
/job_list
```

### Step 3: Test Individual Job

Run a specific job manually to test:

```
/job_run <jobId>
```

Example:
```
/job_run 507f1f77bcf86cd799439011
```

### Step 4: Monitor

Watch your channel for automated posts! 🎉

---

## 🛠️ Admin Commands

### Job Management

```bash
# List all scheduled jobs
/job_list

# Create custom job
/job_create <name> || <cron> || <type> || <content|gemini:prompt>

# Example: Create hourly BTC update
/job_create BTC Hourly || 0 * * * * || alpha || gemini:Write a quick BTC price analysis in 50 words

# Pause a job
/job_pause <jobId>

# Resume a job
/job_resume <jobId>

# Change schedule
/job_reschedule <jobId> || <newCron>

# Run job immediately
/job_run <jobId>
```

### Bulk Operations

```bash
# Seed all blueprint jobs
/seed_jobs

# Clear all jobs (requires confirmation)
/clear_jobs
/clear_jobs_confirm
```

### Broadcasting

```bash
# Send immediate message to channel
/broadcast Your message here with *markdown*

# Pin a message
/pin <chatId> <messageId>
```

### Configuration

```bash
# Show payment addresses/numbers
/show_config
```

---

## 📝 Content Templates

### Template Categories

All templates are in `/src/data/contentTemplates.js`:

1. **MARKETING_MESSAGES** - 5 pre-written pitches
2. **STRATEGY_MESSAGES** - 6 trading strategies
3. **MOTIVATION_MESSAGES** - 4 inspiration posts
4. **GREETING_MESSAGES** - Morning/afternoon/night greetings
5. **GEMINI_PROMPTS** - AI prompt library

### Template Rotation

The system automatically rotates through templates to avoid repetition:

```javascript
// First run: Message 1
// Second run: Message 2
// Third run: Message 3
// ...
// After last: Back to Message 1
```

### Dynamic Content (API-Driven)

These job types fetch **real-time data**:

- `whale` → Etherscan whale transactions
- `trending` → CoinGecko trending coins
- `movers` → Top gainers/losers
- `digest` → Full market summary
- `quick_update` → One-line market pulse

---

## ⚙️ Customization

### Add Custom Templates

Edit `/src/data/contentTemplates.js`:

```javascript
export const MARKETING_MESSAGES = [
  {
    title: "Your Custom Message",
    content: `🚀 Your content here...
    
    CTA → https://crypto.loopnet.tech`
  },
  // ... more templates
];
```

### Create Custom Job Type

1. Add job to `/src/data/scheduledJobSeeds.js`
2. Handle type in `/src/cron/channelScheduler.js`

Example:

```javascript
// In scheduledJobSeeds.js
{
  name: 'Hourly Gas Prices',
  cron: '0 * * * *',
  timezone: 'Europe/London',
  enabled: true,
  payload: {
    type: 'gas_update', // Custom type
    appendCTA: true
  }
}

// In channelScheduler.js
else if (jobType.includes('gas_update')) {
  const { getGasPrices } = await import('../services/etherscan.js');
  const gas = await getGasPrices();
  content = `⛽ ETH Gas Prices:
  
🐢 Safe: ${gas.safe} Gwei
⚡ Standard: ${gas.proposed} Gwei
🚀 Fast: ${gas.fast} Gwei`;
}
```

### Adjust Posting Frequency

Edit cron expressions in `/src/data/scheduledJobSeeds.js`:

```javascript
cron: '*/5 * * * *'  // Every 5 minutes
cron: '*/10 * * * *' // Every 10 minutes
cron: '0 * * * *'    // Every hour
cron: '0 */3 * * *'  // Every 3 hours
cron: '0 9 * * *'    // Daily at 9 AM
```

**Cron Format:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7, 0=Sunday)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

### Change Timezone

Default is `Europe/London`. Change in seeds:

```javascript
timezone: 'Africa/Nairobi'   // Kenya
timezone: 'Africa/Kampala'   // Uganda
timezone: 'Africa/Blantyre'  // Malawi
timezone: 'UTC'              // Universal
```

---

## 💡 Best Practices

### Content Strategy

1. **Balance frequency**: Don't spam the channel
2. **Rotate templates**: Prevents reader fatigue
3. **Mix content types**: Marketing + education + data
4. **Time greetings**: Align with audience timezone
5. **Test prompts**: Use `/job_run` before enabling

### API Usage

**CoinGecko Free Tier:**
- 30 calls/minute
- Monitor with: `console.log` in priceFetcher.js

**Etherscan Free Tier:**
- 5 calls/second
- 100,000 calls/day

**Tip:** Cache frequently-used data to reduce API calls.

### Gemini AI Prompts

**Good prompts:**
```
Write a 50-word pitch for automated crypto trading targeting mobile users. Include benefits and crypto.loopnet.tech CTA.
```

**Bad prompts:**
```
Tell me about crypto
```

**Rules:**
- Specify word count (40-80 words ideal)
- Define audience (mobile users, beginners, etc.)
- Request CTA inclusion
- Set tone (professional, exciting, casual)

### Error Handling

Jobs automatically retry on failure (see `retryPolicy` in seeds):

```javascript
retryPolicy: {
  retries: 3,        // Retry 3 times
  backoffSec: 5      // Wait 5 seconds between retries
}
```

### Monitoring

**Check job status:**
```bash
/job_list
```

**Look for:**
- ✅ `enabled: true` - Job is active
- 🕐 `lastRunAt` - When it last ran
- 🔢 `runCount` - Total executions

**MongoDB Query:**
```javascript
// Find jobs that haven't run recently
db.scheduled_jobs.find({
  enabled: true,
  lastRunAt: { $lt: new Date(Date.now() - 3600000) } // 1 hour ago
})
```

---

## 📊 Content Performance

### Track What Works

Monitor in your channel:
1. Views per post type
2. Engagement (reactions, comments)
3. Click-through rate to crypto.loopnet.tech
4. New member spikes after certain posts

### Optimize

- **High engagement** → Increase frequency
- **Low engagement** → Reduce or improve content
- **Best times** → Schedule more posts then
- **Best types** → Create more templates

---

## 🔥 Advanced Features

### Conditional Posting

Skip posts if conditions aren't met:

```javascript
// In channelScheduler.js
if (jobType.includes('whale')) {
  const whales = await getRecentWhaleTransactions(1000);
  if (whales && whales.length > 0) {
    content = geminiClient.generateWhaleAlert(whales[0]);
  } else {
    // No whales detected - skip posting
    console.log('[Scheduler] No whale transactions, skipping post');
    return;
  }
}
```

### Multi-Channel Support

Post to different channels:

```javascript
// In job seed
channelId: '@cryptohub_alpha'      // Main channel
channelId: '@cryptohub_vip'        // VIP channel
channelId: process.env.TEST_CHANNEL // Test channel
```

### Dynamic Scheduling

Adjust cron based on market conditions:

```javascript
// More posts during high volatility
if (volatility > 5) {
  await reschedule(jobId, '*/3 * * * *', telegram); // Every 3 min
} else {
  await reschedule(jobId, '*/15 * * * *', telegram); // Every 15 min
}
```

---

## 🆘 Troubleshooting

### Jobs Not Running

**Check:**
1. Is bot running? `npm run dev`
2. MongoDB connected? Check logs
3. Job enabled? `/job_list`
4. Cron syntax correct? Use [crontab.guru](https://crontab.guru)

**Fix:**
```bash
/job_resume <jobId>
```

### Content Not Posting

**Check:**
1. Channel ID correct in `.env`?
2. Bot is admin in channel?
3. Channel privacy settings?

**Test:**
```bash
/broadcast Test message
```

### API Errors

**CoinGecko timeout:**
- Increase timeout in priceFetcher.js
- Check API status: [status.coingecko.com](https://status.coingecko.com)

**Etherscan rate limit:**
- Reduce whale alert frequency
- Add delay between calls

### Duplicate Exports Error

If you see `Duplicate export of 'function_name'`:

1. Check for `export` keyword on function definition
2. Check for function in export list at bottom
3. Remove one (keep only export list)

---

## 📚 Related Documentation

- [04-SCHEDULER-GUIDE.md](./04-SCHEDULER-GUIDE.md) - Full scheduler documentation
- [06-GEMINI-AI.md](./06-GEMINI-AI.md) - AI integration guide
- [03-API-REFERENCE.md](./03-API-REFERENCE.md) - Command reference

---

## 🎉 Success Checklist

- [ ] Run `/seed_jobs` to create all automated jobs
- [ ] Verify with `/job_list` - should see 13 jobs
- [ ] Test one job: `/job_run <jobId>`
- [ ] Check your Telegram channel for the post
- [ ] Monitor for 1 hour to ensure jobs run
- [ ] Review engagement and optimize

**You're ready to automate! 🚀**

---

*Last updated: November 17, 2025*
