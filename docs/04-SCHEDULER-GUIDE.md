# Scheduler Guide — Crypto Hub Bot

## Overview

Crypto Hub Bot uses two scheduler implementations:
1. **Node-cron scheduler** (`src/cron/scheduler.js`) — Simple MVP scheduler
2. **Channel scheduler** (`src/cron/channelScheduler.js`) — DB-backed, timezone-aware Growth scheduler

This guide focuses on the **channel scheduler** (recommended for production).

---

## Channel Scheduler Features

- ✅ **Persistent schedules** stored in MongoDB (`ScheduledJob` collection)
- ✅ **Timezone-aware** scheduling (default: `Europe/London`)
- ✅ **Dynamic management** via admin commands
- ✅ **Retry/backoff** on failures
- ✅ **Gemini integration** for AI-generated content
- ✅ **Analytics tracking** for posted messages

---

## ScheduledJob Model

```javascript
{
  name: String,              // Human-readable name
  cron: String,              // Cron expression
  timezone: String,          // IANA timezone (default: 'Europe/London')
  channelId: String,         // Telegram channel ID
  payload: {
    type: String,            // 'alpha', 'digest', 'news'
    content: String,         // Static content (optional)
    geminiPrompt: String,    // AI prompt (optional)
    maxTokens: Number,       // Token limit for AI
    temperature: Number,     // AI creativity (0-1)
    appendCTA: Boolean       // Append link to crypto.loopnet.tech
  },
  enabled: Boolean,          // Active/paused
  lastRunAt: Date,           // Last execution time
  runCount: Number,          // Total executions
  retryPolicy: {
    retries: Number,         // Max retry attempts
    backoffSec: Number       // Base backoff seconds
  },
  createdBy: String,         // Admin who created
  createdAt: Date,
  updatedAt: Date
}
```

---

## Creating Scheduled Jobs

### Via Admin Command

```
/job_create <name> || <cron> || <type> || <content>
```

**Example 1: Static Content**
```
/job_create DailyReminder || 0 18 * * * || news || 📢 Daily market wrap at https://crypto.loopnet.tech
```

**Example 2: AI-Generated Content**
```
/job_create MorningAlpha || 0 9 * * * || alpha || gemini:Write a concise crypto alpha for BTC and ETH. Keep under 200 chars. Include trend direction.
```

**Example 3: Hourly Price Update**
```
/job_create HourlyPrices || 0 * * * * || update || gemini:Summarize BTC, ETH, and SOL price movements in the last hour. One line each.
```

### Via MongoDB Insert (Advanced)

```javascript
db.scheduledjobs.insertOne({
  name: "Weekend Summary",
  cron: "0 20 * * 0",  // Sundays at 20:00
  timezone: "Europe/London",
  channelId: process.env.TELEGRAM_CHANNEL_ID,
  payload: {
    type: "digest",
    geminiPrompt: "Write a weekend crypto market summary focusing on major movers. 3-4 sentences.",
    maxTokens: 220,
    temperature: 0.7,
    appendCTA: true
  },
  enabled: true,
  retryPolicy: { retries: 3, backoffSec: 30 },
  createdBy: "admin",
  createdAt: new Date()
})
```

---

## Cron Expression Guide

### Syntax

```
┌────────────── minute (0 - 59)
│ ┌──────────── hour (0 - 23)
│ │ ┌────────── day of month (1 - 31)
│ │ │ ┌──────── month (1 - 12)
│ │ │ │ ┌────── day of week (0 - 7) (0 or 7 = Sunday)
│ │ │ │ │
* * * * *
```

### Common Patterns

| Pattern | Description |
|---------|-------------|
| `0 9 * * *` | Every day at 09:00 |
| `*/15 * * * *` | Every 15 minutes |
| `0 9,12,18 * * *` | At 09:00, 12:00, and 18:00 daily |
| `0 9 * * 1-5` | Weekdays at 09:00 |
| `0 0 1 * *` | First day of month at midnight |
| `30 8 * * 1,3,5` | Mon/Wed/Fri at 08:30 |

### Testing Cron Expressions

Use [Crontab Guru](https://crontab.guru) to validate expressions.

---

## Timezone Handling

### Default Timezone
All jobs default to **Europe/London** (handles BST ↔ GMT transitions automatically).

### Example: DST Transition

Job scheduled for `0 9 * * *` (09:00 London time):
- **BST (summer)**: Runs at 08:00 UTC
- **GMT (winter)**: Runs at 09:00 UTC

The `cron` package handles this automatically — you always specify **local London time**.

### Changing Timezone

To use a different timezone, modify the job:

```javascript
await ScheduledJob.updateOne(
  { _id: jobId },
  { timezone: 'America/New_York' }
);
```

Then reschedule:
```
/job_reschedule <jobId> || <cron>
```

---

## Job Management

### List All Jobs

```
/job_list
```

Returns all jobs with status, last run time, and cron expression.

### Pause a Job

```
/job_pause <jobId>
```

- Stops execution
- Job remains in database
- Can be resumed later

### Resume a Job

```
/job_resume <jobId>
```

Re-enables a paused job.

### Force-Run a Job

```
/job_run <jobId>
```

Executes immediately (bypasses schedule). Useful for:
- Testing output before scheduling
- Ad-hoc posts

### Reschedule a Job

```
/job_reschedule <jobId> || <newCron>
```

Updates cron expression without recreating the job.

### Delete a Job

Currently via MongoDB:

```javascript
db.scheduledjobs.deleteOne({ _id: ObjectId("...") })
```

Or programmatically stop and remove:

```javascript
import { stopAndRemove } from './cron/channelScheduler.js';
await stopAndRemove(jobId);
```

---

## Content Generation

### Static Content

Set `payload.content`:

```javascript
{
  payload: {
    type: "news",
    content: "📰 Today's top crypto headlines:\n\n1. Bitcoin hits new high\n2. Ethereum upgrade successful"
  }
}
```

### AI-Generated Content

Set `payload.geminiPrompt`:

```javascript
{
  payload: {
    type: "alpha",
    geminiPrompt: "Write a short trading signal for BTC based on recent price action. Include entry/exit levels.",
    maxTokens: 250,
    temperature: 0.8
  }
}
```

**Temperature Guide:**
- `0.0 - 0.3`: Deterministic, factual
- `0.4 - 0.7`: Balanced creativity
- `0.8 - 1.0`: Highly creative, varied

### Hybrid (AI + Static)

Generate base content with AI, then append static footer:

```javascript
{
  payload: {
    geminiPrompt: "Summarize today's crypto market in 2 sentences.",
    appendCTA: true  // Adds "Tap in: https://crypto.loopnet.tech"
  }
}
```

---

## Retry & Error Handling

### Retry Policy

```javascript
retryPolicy: {
  retries: 3,        // Max retry attempts
  backoffSec: 30     // Base backoff (exponential: 30s, 60s, 120s)
}
```

### Failure Scenarios

| Failure | Behavior |
|---------|----------|
| Gemini API timeout | Retry with backoff, fallback to cached content |
| Telegram rate limit | Exponential backoff, queue message |
| Job disabled mid-run | Skip execution |
| Channel not found | Log error, alert admin |

### Monitoring Failures

Check logs for:
```
[Scheduler] job <name> failed after retries
```

Admin notification (future):
```
/alert Job "MorningAlpha" failed 3 times. Check logs.
```

---

## Analytics & Tracking

### Automatic Tracking

Every posted message creates a `ChannelMessage` record:

```javascript
{
  title: jobName,
  content: postedContent,
  type: "alpha",
  postedAt: Date,
  geminiPrompt: "...",
  telegramMessageId: 12345,
  analytics: {
    views: 0,
    clicks: 0,
    reactions: 0
  }
}
```

### Query Analytics

```javascript
// Most viewed posts
db.channelmessages.find().sort({ "analytics.views": -1 }).limit(10)

// Posts by type
db.channelmessages.find({ type: "alpha" })

// Recent posts
db.channelmessages.find().sort({ postedAt: -1 }).limit(20)
```

---

## Best Practices

### Job Naming
- Use descriptive names: `MorningAlpha`, `EveningDigest`, `HourlyPrices`
- Include frequency hint: `Daily_MarketWrap`, `Hourly_BTC_Update`

### Cron Timing
- **Avoid overlaps**: Don't schedule multiple heavy jobs at same time
- **Consider audience**: Post when your audience is active
- **Test first**: Use `/job_run` to verify output before scheduling

### Content Quality
- **Review AI output**: Run jobs manually first
- **Set token limits**: Prevent overly long messages
- **Use temperature wisely**: Lower for factual, higher for creative

### Resource Management
- **Limit concurrent jobs**: Avoid more than 5 jobs in same minute
- **Cache AI responses**: Reuse digest outputs within a time window
- **Monitor costs**: Track Gemini API usage

---

## Troubleshooting

### Job Not Running

**Check 1: Is job enabled?**
```
/job_list
```
Look for `Enabled: true`.

**Check 2: Is cron expression valid?**
Validate at [Crontab Guru](https://crontab.guru).

**Check 3: Check logs**
```bash
# Look for scheduler errors
grep "Scheduler" logs.txt
```

### Job Runs at Wrong Time

**Issue**: Timezone mismatch

**Solution**:
1. Verify `timezone` field in database:
   ```javascript
   db.scheduledjobs.findOne({ name: "MorningAlpha" })
   ```
2. Should be `Europe/London` (or your preferred timezone)
3. Reschedule if needed

### AI Content Not Generating

**Check 1: Gemini API key set?**
```
/show_config
```

**Check 2: Prompt format correct?**
Must start with `gemini:`:
```
gemini:Write a summary...
```

**Check 3: Fallback to mock**
If `GEMINI_API_KEY` not set, uses placeholder:
```
AI summary for: <prompt>
```

### Channel Posts Failing

**Check 1: Bot is admin in channel?**
- Bot must be channel administrator
- Must have "Post Messages" permission

**Check 2: Channel ID correct?**
```bash
# Test manually
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -d "chat_id=<CHANNEL_ID>" \
  -d "text=Test"
```

---

## Advanced: Custom Scheduler Logic

### Adding New Job Types

Edit `src/cron/channelScheduler.js`:

```javascript
// Inside CronJob callback
if (jobDoc.payload.type === 'custom') {
  // Custom logic
  const data = await fetchCustomData();
  content = formatCustomContent(data);
}
```

### Per-Job Channels

Override `channelId` per job:

```javascript
{
  channelId: "-1001234567890",  // Different channel
  payload: { ... }
}
```

### Conditional Execution

Add logic to skip execution based on conditions:

```javascript
// Skip on weekends
const now = new Date();
if (now.getDay() === 0 || now.getDay() === 6) {
  console.log('Skipping weekend job');
  return;
}
```

---

## Migration from Node-Cron

If using the legacy `src/cron/scheduler.js`, migrate to channel scheduler:

1. **Identify jobs** in `scheduler.js`
2. **Convert to DB entries** using `/job_create`
3. **Test** with `/job_run`
4. **Disable old scheduler** (comment out in `src/index.js`)

---

## Example Job Library

### Morning Alpha (Weekdays 9 AM)
```
/job_create MorningAlpha || 0 9 * * 1-5 || alpha || gemini:Write a concise morning crypto alpha for BTC and ETH with trend direction. Under 200 chars.
```

### Evening Digest (Daily 8 PM)
```
/job_create EveningDigest || 0 20 * * * || digest || gemini:Summarize today's top 3 crypto events in bullet points. Include impact assessment.
```

### Hourly Price Check
```
/job_create HourlyPrices || 0 * * * * || update || gemini:Report BTC, ETH, SOL price changes in last hour. One line per coin.
```

### Weekend Summary (Sunday 8 PM)
```
/job_create WeekendSummary || 0 20 * * 0 || digest || gemini:Write a weekend crypto market summary with key movers and outlook for the week.
```

---

## Next Steps

- Configure jobs via `/job_create`
- Monitor job execution in logs
- Set up analytics tracking ([08-OPERATIONS.md](./08-OPERATIONS.md))
- Integrate real Gemini API ([06-GEMINI-AI.md](./06-GEMINI-AI.md))
