# Gemini AI Integration Guide — Crypto Hub Bot

## Overview

This guide covers integrating Google's Gemini AI to generate crypto market summaries, personalized alerts, and engaging channel content.

---

## Prerequisites

1. **Google AI Studio Account** — https://makersuite.google.com/app/apikey
2. **Gemini API Key** — Generate from AI Studio
3. **Model Access** — Free tier includes generous quota

---

## Setup

### Install Dependencies

```bash
npm install @google/generative-ai
```

### Environment Variables

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash  # or gemini-1.5-pro
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=500
```

---

## Basic Integration

### Service Implementation

Replace the placeholder in `src/services/geminiClient.js`:

```javascript
// src/services/geminiClient.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
});

/**
 * Generate market summary from price data
 */
async function generateOneLineSummary(priceData) {
  try {
    const prompt = `You are a crypto market analyst. Based on this data, write ONE engaging sentence summarizing the market:

BTC: $${priceData.btc?.usd || 'N/A'} (${priceData.btc?.change_24h || '0'}% 24h)
ETH: $${priceData.eth?.usd || 'N/A'} (${priceData.eth?.change_24h || '0'}% 24h)
BNB: $${priceData.bnb?.usd || 'N/A'} (${priceData.bnb?.change_24h || '0'}% 24h)

Keep it concise, informative, and slightly enthusiastic. No emojis.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();

  } catch (error) {
    console.error('Gemini API error:', error);
    return `BTC $${priceData.btc?.usd || 'N/A'} | ETH $${priceData.eth?.usd || 'N/A'} | Market update available.`;
  }
}

/**
 * Generate personalized alert message
 */
async function generateAlertMessage({ coin, currentPrice, targetPrice, direction }) {
  try {
    const prompt = `You are a crypto trading assistant. Generate a SHORT alert message (max 2 sentences) for:

Coin: ${coin.toUpperCase()}
Current Price: $${currentPrice}
Target: $${targetPrice}
Direction: ${direction === 'above' ? 'price exceeded target' : 'price dropped below target'}

Be informative and actionable. Suggest whether to buy/sell/hold.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();

  } catch (error) {
    console.error('Gemini alert generation failed:', error);
    return `${coin.toUpperCase()} is now $${currentPrice} (target: $${targetPrice})`;
  }
}

/**
 * Generate daily digest
 */
async function generateDailyDigest(marketData) {
  try {
    const prompt = `You are a crypto market analyst. Write a brief daily digest (3-4 sentences) covering:

Market Data:
${Object.entries(marketData).map(([coin, data]) => 
  `${coin.toUpperCase()}: $${data.usd} (${data.change_24h > 0 ? '+' : ''}${data.change_24h}%)`
).join('\n')}

Include:
1. Overall market sentiment
2. Biggest mover
3. Key takeaway for traders

Keep it professional but engaging.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();

  } catch (error) {
    console.error('Gemini digest generation failed:', error);
    return 'Daily market digest unavailable. Check individual coin prices.';
  }
}

/**
 * Generic content generation with custom prompt
 */
async function generate(prompt, options = {}) {
  try {
    const config = {
      temperature: options.temperature || parseFloat(process.env.GEMINI_TEMPERATURE) || 0.7,
      maxOutputTokens: options.maxTokens || parseInt(process.env.GEMINI_MAX_TOKENS) || 500,
      topP: options.topP || 0.8,
      topK: options.topK || 40
    };

    const result = await model.generateContent(
      prompt,
      { generationConfig: config }
    );

    const response = await result.response;
    return response.text().trim();

  } catch (error) {
    console.error('Gemini generation error:', error);
    throw error;
  }
}

/**
 * Stream generation (for long responses)
 */
async function* generateStream(prompt) {
  try {
    const result = await model.generateContentStream(prompt);
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      yield chunkText;
    }

  } catch (error) {
    console.error('Gemini stream error:', error);
    throw error;
  }
}

export {
  generateOneLineSummary,
  generateAlertMessage,
  generateDailyDigest,
  generate,
  generateStream
};
```

---

## Prompt Engineering

### Best Practices

1. **Be Specific** — Define role, format, and constraints clearly
2. **Provide Context** — Include relevant data in the prompt
3. **Set Boundaries** — Limit output length and style
4. **Test Iteratively** — Refine prompts based on outputs

### Example: Improved Market Summary

```javascript
async function generateMarketSummary(priceData, sentiment = 'neutral') {
  const prompt = `Role: You are a professional crypto market analyst.

Task: Generate a concise market summary (max 3 sentences).

Data:
${Object.entries(priceData).map(([coin, data]) => 
  `- ${coin.toUpperCase()}: $${data.usd} (${data.change_24h > 0 ? '+' : ''}${data.change_24h}% 24h)`
).join('\n')}

Market Sentiment: ${sentiment}

Requirements:
- First sentence: Overall market direction
- Second sentence: Highlight biggest mover
- Third sentence: Actionable insight
- Tone: Professional, clear, confident
- No emojis or jargon

Output:`;

  return await generate(prompt);
}
```

---

## Token Management

### Cost Optimization

**Gemini Pricing (as of 2024):**
- **gemini-1.5-flash**: Free up to 15 requests/min, 1M tokens/day
- **gemini-1.5-pro**: $0.00025/1K input tokens, $0.0005/1K output tokens

### Strategies

1. **Use Flash for Simple Tasks** — Summaries, alerts
2. **Cache System Prompts** — Reduce redundant context
3. **Limit Max Tokens** — Set appropriate `maxOutputTokens`
4. **Batch Requests** — Combine multiple questions

### Token Counter

```javascript
// Approximate token count (4 chars ≈ 1 token)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

async function generateWithBudget(prompt, maxTokenBudget = 1000) {
  const promptTokens = estimateTokens(prompt);
  const remainingTokens = maxTokenBudget - promptTokens;

  if (remainingTokens < 50) {
    throw new Error('Prompt too long for token budget');
  }

  return await generate(prompt, { maxTokens: remainingTokens });
}
```

---

## Caching Strategy

### Response Cache

```javascript
// src/services/geminiCache.js
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour

async function getCachedGeneration(prompt, generator) {
  const cacheKey = `gemini:${hashPrompt(prompt)}`;
  
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('Cache hit for prompt');
    return cached;
  }

  const result = await generator(prompt);
  cache.set(cacheKey, result);
  return result;
}

function hashPrompt(prompt) {
  // Simple hash for cache key
  return require('crypto')
    .createHash('md5')
    .update(prompt)
    .digest('hex')
    .slice(0, 16);
}

export { getCachedGeneration };
```

Usage:

```javascript
import { getCachedGeneration } from './geminiCache.js';

const summary = await getCachedGeneration(
  promptText,
  (p) => generate(p)
);
```

---

## Error Handling

### Retry Logic

```javascript
async function generateWithRetry(prompt, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generate(prompt);
    } catch (error) {
      console.error(`Gemini attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        throw new Error(`Gemini failed after ${maxRetries} attempts`);
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### Rate Limit Handling

```javascript
class RateLimiter {
  constructor(requestsPerMinute = 15) {
    this.requests = [];
    this.limit = requestsPerMinute;
  }

  async throttle() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old requests
    this.requests = this.requests.filter(time => time > oneMinuteAgo);

    if (this.requests.length >= this.limit) {
      const oldestRequest = this.requests[0];
      const waitTime = 60000 - (now - oldestRequest);
      console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requests.push(now);
  }
}

const rateLimiter = new RateLimiter(15);

async function generateRateLimited(prompt) {
  await rateLimiter.throttle();
  return await generate(prompt);
}
```

---

## Content Safety

### Filter Responses

```javascript
const UNSAFE_PATTERNS = [
  /invest all your money/i,
  /guaranteed profit/i,
  /can't lose/i,
  /financial advice/i
];

function isSafeContent(text) {
  return !UNSAFE_PATTERNS.some(pattern => pattern.test(text));
}

async function generateSafeContent(prompt) {
  const content = await generate(prompt);

  if (!isSafeContent(content)) {
    console.warn('Unsafe content detected, using fallback');
    return 'Market data available. Please check prices manually.';
  }

  return content;
}
```

### Disclaimer Injection

```javascript
async function generateWithDisclaimer(prompt) {
  const content = await generate(prompt);
  return `${content}\n\n⚠️ Not financial advice. DYOR.`;
}
```

---

## Advanced Use Cases

### Personalized Recommendations

```javascript
async function generatePersonalizedInsight(user, marketData) {
  const prompt = `Role: Crypto trading assistant

User Profile:
- Experience: ${user.experienceLevel || 'beginner'}
- Risk Tolerance: ${user.riskTolerance || 'moderate'}
- Favorite Coins: ${user.watchlist?.join(', ') || 'BTC, ETH'}

Market Data:
${Object.entries(marketData).map(([coin, data]) => 
  `${coin.toUpperCase()}: $${data.usd} (${data.change_24h}% 24h)`
).join('\n')}

Task: Provide personalized insight (2-3 sentences) tailored to this user's profile.

Requirements:
- Address their risk tolerance
- Mention coins from their watchlist
- Be encouraging but realistic
- Include one actionable tip

Output:`;

  return await generate(prompt);
}
```

### Sentiment Analysis

```javascript
async function analyzeSentiment(news) {
  const prompt = `Analyze the sentiment of this crypto news:

"${news}"

Respond with ONLY ONE WORD: positive, negative, or neutral`;

  const sentiment = await generate(prompt, { maxTokens: 10 });
  return sentiment.toLowerCase().trim();
}
```

### Educational Content

```javascript
async function generateEducationalTip(topic) {
  const prompt = `You are a crypto educator. Explain "${topic}" in 2-3 simple sentences suitable for beginners.

Requirements:
- No jargon
- Use analogies if helpful
- End with a practical tip

Output:`;

  return await generate(prompt);
}
```

---

## Integration with Channel Scheduler

### Dynamic Content Generation

Update `src/cron/channelScheduler.js`:

```javascript
import { generateOneLineSummary, generateDailyDigest } from '../services/geminiClient.js';

async function executeScheduledJob(job) {
  try {
    let content;

    if (job.payload.geminiPrompt) {
      // Fetch live data
      const prices = await fetchTopCoinPrices();
      
      if (job.payload.geminiPrompt === 'DAILY_DIGEST') {
        content = await generateDailyDigest(prices);
      } else if (job.payload.geminiPrompt === 'QUICK_UPDATE') {
        content = await generateOneLineSummary(prices);
      } else {
        // Custom prompt
        content = await generate(job.payload.geminiPrompt);
      }
    } else {
      // Static content
      content = job.payload.content;
    }

    await postToChannel(job.channelId, content);

    // Update job stats
    job.lastRunAt = new Date();
    job.runCount += 1;
    await job.save();

  } catch (error) {
    console.error(`Job ${job.name} failed:`, error);
  }
}
```

---

## Testing

### Mock Responses

```javascript
// __tests__/geminiClient.test.js
import { jest } from '@jest/globals';

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: () => ({
      generateContent: mockGenerateContent
    })
  }))
}));

describe('Gemini Client', () => {
  it('should generate market summary', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Bitcoin surges past $50K as market gains momentum.'
      }
    });

    const summary = await generateOneLineSummary({ btc: { usd: 50000, change_24h: 5 } });
    expect(summary).toContain('Bitcoin');
  });
});
```

### Integration Test

```bash
# Test with real API (use sparingly)
node -e "
import('./src/services/geminiClient.js').then(async ({ generate }) => {
  const result = await generate('Say hello in one sentence');
  console.log(result);
});
"
```

---

## Monitoring

### Track Usage

```javascript
// src/services/geminiMetrics.js
let totalRequests = 0;
let totalTokens = 0;
let errors = 0;

function logRequest(promptTokens, outputTokens) {
  totalRequests++;
  totalTokens += promptTokens + outputTokens;
}

function logError() {
  errors++;
}

function getStats() {
  return {
    totalRequests,
    totalTokens,
    errors,
    avgTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0
  };
}

export { logRequest, logError, getStats };
```

### Admin Command

```javascript
// src/bot/admin.js
bot.command('gemini_stats', async (ctx) => {
  if (!isAdmin(ctx)) return;

  const stats = getStats();
  ctx.reply(
    `*Gemini AI Stats*\n\n` +
    `Requests: ${stats.totalRequests}\n` +
    `Tokens: ${stats.totalTokens.toLocaleString()}\n` +
    `Errors: ${stats.errors}\n` +
    `Avg Tokens/Request: ${stats.avgTokensPerRequest.toFixed(0)}`,
    { parse_mode: 'Markdown' }
  );
});
```

---

## Troubleshooting

### Common Issues

**Issue: API Key Invalid**
```
Error: [GoogleGenerativeAI Error]: Invalid API key
```
**Solution:** Verify `GEMINI_API_KEY` in `.env`

**Issue: Rate Limit Exceeded**
```
Error: Resource exhausted (RESOURCE_EXHAUSTED)
```
**Solution:** Implement rate limiting or upgrade plan

**Issue: Safety Filters Triggered**
```
Error: SAFETY_SETTINGS_BLOCKED
```
**Solution:** Adjust prompt or use `safetySettings` parameter

**Issue: Empty Responses**
```
Response text is empty
```
**Solution:** Check if prompt is too restrictive, add fallback

---

## Best Practices

1. **Always Have Fallbacks** — Never rely solely on AI
2. **Cache Aggressively** — Reduce API calls for repeated content
3. **Monitor Costs** — Track token usage in production
4. **Validate Outputs** — Check for unsafe/inappropriate content
5. **Test Prompts** — A/B test different prompt styles
6. **Use Appropriate Model** — Flash for speed, Pro for quality
7. **Handle Errors Gracefully** — Provide default content on failure

---

## Next Steps

1. Replace placeholder in `src/services/geminiClient.js`
2. Test with API key from Google AI Studio
3. Refine prompts based on output quality
4. Implement caching layer
5. Monitor token usage
6. Set up rate limiting
