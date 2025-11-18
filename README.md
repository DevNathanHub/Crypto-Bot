# Crypto Hub Bot — High-On-Chain Ops 🚀

> **Telegram channel automation + bot** that publishes crypto market updates, on-chain alpha, mobile-money opportunities, and drives traffic to [crypto.loopnet.tech](https://crypto.loopnet.tech).

**Tech Stack:** Node.js (Telegraf), MongoDB (Mongoose), node-cron, Gemini AI, Express  
**Timezone Support:** Europe/London (with DST handling)  
**Tone:** Hacker / High-energy / Mobile-first

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Project Structure](#project-structure)
4. [Environment Variables](#environment-variables)
5. [Bot Commands](#bot-commands)
6. [Scheduler & Channel Management](#scheduler--channel-management)
7. [Payment Integrations](#payment-integrations)
8. [Gemini AI Usage](#gemini-ai-usage)
9. [API Endpoints](#api-endpoints)
10. [Documentation](#documentation)
11. [Deployment](#deployment)
12. [Testing](#testing)
13. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Crypto Hub Bot automates publishing crypto market updates, alerts, memes, and mobile-money CTAs to a Telegram channel. Key features:

✅ **Persistent schedule management** — Create/list/pause/resume jobs stored in MongoDB  
✅ **Timezone-aware scheduling** — Europe/London with automatic DST handling  
✅ **Gemini AI content generation** — Dynamic market summaries and alerts  
✅ **Public crypto APIs** — CoinGecko price feeds with caching  
✅ **Mobile money integrations** — M-Pesa (Kenya), Airtel Money (Uganda/Malawi)  
✅ **Crypto deposits** — USDT/BTC addresses from environment  
✅ **Admin management** — Broadcasts, scheduled posts, dispute resolution  
✅ **Analytics tracking** — Message views, clicks, reactions  
✅ **Retry/backoff logic** — Resilient channel posting with exponential backoff  

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- Telegram Bot Token ([create via @BotFather](https://t.me/BotFather))
- Telegram Channel (bot must be admin)

### Installation

```bash
# 1. Clone repository
git clone <repo-url>
cd crypto-hub-bot

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 4. Start development server
npm run dev
```

### Verify Setup

```bash
# Check bot is running
curl http://localhost:3000/api/health

# Test Telegram bot
# Send /start to your bot in Telegram
```

---

## 📁 Project Structure

```
src/
├── bot/
│   ├── admin.js              # Admin commands (schedule management)
│   └── commands.js           # User commands (/start, /deposit, /prices)
├── cron/
│   ├── channelScheduler.js   # DB-backed persistent scheduler
│   └── scheduler.js          # Simple cron jobs (price caching)
├── services/
│   ├── geminiClient.js       # Gemini AI wrapper
│   ├── priceFetcher.js       # CoinGecko API client
│   ├── channelManager.js     # Channel posting + analytics
│   ├── telegramBot.js        # Bot initialization
│   ├── analytics.js          # Analytics tracking
│   └── payments.js           # Payment helpers (placeholder)
├── models/
│   ├── User.js               # User accounts
│   ├── ChannelMessage.js     # Posted messages + analytics
│   ├── ScheduledJob.js       # Cron job definitions
│   ├── Transaction.js        # Payment records
│   ├── Subscription.js       # User subscriptions
│   ├── Alert.js              # Price alerts
│   └── PriceCache.js         # Cached price data
├── routes/
│   └── api.js                # REST API endpoints
├── utils/
│   └── paymentContacts.js    # Mobile money contact helper
├── config.js                 # Environment configuration
├── server.js                 # Express server
└── index.js                  # Application entry point

docs/                         # Comprehensive documentation (11 guides)
__tests__/                    # Jest test suite
```

---

## ⚙️ Environment Variables

Create `.env` file (never commit to git):

```env
# === Core ===
NODE_ENV=development
PORT=3000
BASE_URL=https://crypto.loopnet.tech

# === Database ===
MONGO_URI=mongodb://localhost:27017/crypto_hub
# Or MongoDB Atlas:
# MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/crypto_hub

# === Telegram ===
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHANNEL_ID=-1001234567890
ADMIN_TELEGRAM_ID=123456789

# === Gemini AI ===
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.0-flash
GEMINI_TEMPERATURE=0.8
GEMINI_MAX_TOKENS=500

# === Crypto Addresses (public) ===
CRYPTO_USDT_ADDRESS=0xYourTetherUSDTAddressHere
CRYPTO_BTC_ADDRESS=bc1qyourbtcaddresshere

# === Mobile Money (E.164 format, no +) ===
MOBILE_MPESA_KE=254XXXXXXXXX
MOBILE_AIRTEL_UG=256XXXXXXXXX
MOBILE_AIRTEL_MW=265XXXXXXXXX
DEFAULT_PAYMENT_COUNTRY=KE

# === M-Pesa Daraja (optional - for STK Push) ===
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_ENVIRONMENT=sandbox
MPESA_CALLBACK_URL=https://yourdomain.com/api/webhook/mpesa/callback

# === Airtel Money (optional) ===
AIRTEL_CLIENT_ID=your_client_id
AIRTEL_CLIENT_SECRET=your_client_secret
AIRTEL_ENVIRONMENT=staging
```

See `.env.example` for complete reference.

---

## 🤖 Bot Commands

### User Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message & signup CTA |
| `/help` | Show available commands |
| `/prices` | Latest crypto prices (BTC, ETH, BNB, SOL, ADA) |
| `/deposit [country]` | Show crypto addresses & mobile money number |
| `/confirm_deposit <amount>` | Confirm payment (for reconciliation) |
| `/alerts` | View active price alerts |
| `/subscribe <ticker> <price>` | Set price alert |

### Admin Commands (requires `ADMIN_TELEGRAM_ID`)

| Command | Description |
|---------|-------------|
| `/job_create Name \|\| cron \|\| type \|\| content` | Create scheduled job |
| `/job_list` | List all scheduled jobs |
| `/job_pause <jobId>` | Pause a job |
| `/job_resume <jobId>` | Resume paused job |
| `/job_reschedule <jobId> \|\| <newCron>` | Update job schedule |
| `/job_run <jobId>` | Force-run job immediately |
| `/broadcast <message>` | Send message to channel |
| `/pin <messageId>` | Pin message in channel |
| `/show_config` | Display configured addresses |
| **`/seed_jobs`** | **Seed all automation blueprint jobs** |
| `/clear_jobs` | Clear all jobs (requires confirm) |

#### Job Creation Examples

**Daily morning alpha (9 AM London time):**
```
/job_create MorningAlpha || 0 9 * * * || alpha || gemini:Write a hacker-style alpha for BTC and ETH
```

**Quick market update (every 15 minutes):**
```
/job_create QuickUpdate || */15 * * * * || update || gemini:QUICK_UPDATE
```

**Daily digest (6 PM London time):**
```
/job_create EveningDigest || 0 18 * * * || digest || gemini:DAILY_DIGEST
```

---

## ⏰ Scheduler & Channel Management

### 🚀 Quick Start: Automated Content Blueprint

**Seed 13 pre-configured jobs in one command:**

```bash
/seed_jobs
```

This creates:
- ✅ **5-min marketing** messages (drive signups)
- ✅ **5-min strategy** tips (educate users)
- ✅ **10-min whale alerts** (real-time on-chain data)
- ✅ **15-min trending** coins (CoinGecko hot list)
- ✅ **30-min top movers** (gainers/losers)
- ✅ **Hourly market alpha** (AI-generated insights)
- ✅ **3-hour motivation** posts (inspire action)
- ✅ **Daily greetings** (morning/afternoon/night)
- ✅ **Daily digest** (complete market summary)

**See full blueprint:** `docs/12-CHANNEL-AUTOMATION-BLUEPRINT.md`

### How It Works

1. **Persistent Storage** — Jobs stored in MongoDB (`ScheduledJob` model)
2. **Timezone-Aware** — Uses `cron` library with `Europe/London` timezone (handles DST automatically)
3. **Dynamic Loading** — On startup, loads all enabled jobs from DB
4. **Content Rotation** — Automatically rotates through 30+ pre-written templates
5. **API Integration** — Fetches live data from CoinGecko + Etherscan
6. **AI Enhancement** — Uses Gemini for dynamic content generation
7. **Admin Control** — Create/pause/resume/reschedule via Telegram commands

### ScheduledJob Payload

```javascript
{
  name: "MorningAlpha",
  cron: "0 9 * * *",
  timezone: "Europe/London",
  channelId: "-1001234567890",
  enabled: true,
  payload: {
    type: "alpha",           // alpha, update, digest, promo
    geminiPrompt: "...",     // AI-generated content
    content: "...",          // OR static content
    appendCTA: true          // Add CTA + disclaimer
  },
  retryPolicy: {
    retries: 2,
    backoffSec: 30
  }
}
```

### Channel Posting Pipeline

1. **Generate Content** — Static text or Gemini AI call
2. **Append CTA** — Add link to https://crypto.loopnet.tech
3. **Post with Retry** — `channelManager.postToChannel()` with exponential backoff
4. **Log Analytics** — Store `ChannelMessage` record for tracking

---

## 💰 Payment Integrations

### Crypto Deposits

**Addresses** configured in `.env`:
- **USDT**: ERC-20 or TRC-20 address
- **BTC**: Native SegWit (bc1...) recommended

**User Flow:**
1. User sends `/deposit`
2. Bot displays addresses with instructions
3. User sends crypto and uses `/confirm_deposit <amount> <txid>`
4. Admin manually verifies transaction

**Future Enhancement:** Implement automated verification via Etherscan/Blockchain.info APIs.

### M-Pesa (Kenya)

**Integration Type:** Daraja API (STK Push)

**Flow:**
1. User initiates payment via bot command
2. Backend calls STK Push API
3. User receives M-Pesa prompt on phone
4. User enters PIN
5. Daraja sends callback to webhook
6. System updates `Transaction` status

**Documentation:** See `docs/05-PAYMENT-INTEGRATION.md`

### Airtel Money (Uganda/Malawi)

**Integration Type:** Collections API

**Flow:**
1. User provides phone number
2. Backend initiates collection request
3. User receives payment prompt
4. User approves transaction
5. Webhook confirms payment
6. System updates `Transaction` status

**Documentation:** See `docs/05-PAYMENT-INTEGRATION.md`

---

## 🤖 Gemini AI Usage

### Configuration

Set in `.env`:
```env
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-2.0-flash  
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=500
```

### Example Prompts

**Hacker-style alpha:**
```javascript
await generateOneLineSummary({
  btc: { usd: 50000, change_24h: 2.5 },
  eth: { usd: 3000, change_24h: -1.2 }
});
// Output: "Bitcoin surges past $50K as bulls dominate the market."
```

**Daily digest:**
```javascript
await generateDailyDigest(priceData);
// Output: Professional 3-4 sentence market summary
```

### Best Practices

✅ Cache AI responses for repeated prompts  
✅ Limit token length (cost optimization)  
✅ Always have fallback content for API failures  
✅ Monitor token usage and costs  
✅ Test prompts iteratively for quality  

**Documentation:** See `docs/06-GEMINI-AI.md`

---

## 🌐 API Endpoints

### Public Endpoints

```
GET  /api/health          # Health check
GET  /api/prices          # Latest crypto prices
POST /api/subscribe       # Create subscription
```

### Webhook Endpoints (secure in production)

```
POST /api/webhook/mpesa/callback       # M-Pesa STK callback
POST /api/webhook/mpesa/validation     # M-Pesa C2B validation
POST /api/webhook/mpesa/confirmation   # M-Pesa C2B confirmation
POST /api/webhook/airtel/callback      # Airtel payment callback
```

### Admin Endpoints (add authentication)

```
GET  /api/admin/jobs           # List scheduled jobs
POST /api/admin/jobs           # Create job
PUT  /api/admin/jobs/:id       # Update job
DELETE /api/admin/jobs/:id     # Delete job
```

---

## 📚 Documentation

Comprehensive guides in `docs/` directory:

1. **[00-OVERVIEW.md](docs/00-OVERVIEW.md)** — Project vision & navigation
2. **[01-SETUP.md](docs/01-SETUP.md)** — Local development setup
3. **[02-ARCHITECTURE.md](docs/02-ARCHITECTURE.md)** — System design
4. **[03-API-REFERENCE.md](docs/03-API-REFERENCE.md)** — Complete API reference
5. **[04-SCHEDULER-GUIDE.md](docs/04-SCHEDULER-GUIDE.md)** — Cron job management
6. **[05-PAYMENT-INTEGRATION.md](docs/05-PAYMENT-INTEGRATION.md)** — M-Pesa, Airtel, crypto
7. **[06-GEMINI-AI.md](docs/06-GEMINI-AI.md)** — AI content generation
8. **[07-DEPLOYMENT.md](docs/07-DEPLOYMENT.md)** — PM2, Docker, Kubernetes
9. **[08-OPERATIONS.md](docs/08-OPERATIONS.md)** — Monitoring & troubleshooting
10. **[09-ROADMAP.md](docs/09-ROADMAP.md)** — 24-week implementation plan
11. **[10-SECURITY.md](docs/10-SECURITY.md)** — Security best practices
12. **[11-TESTING.md](docs/11-TESTING.md)** — Testing guide with Jest

---

## 🚢 Deployment

### Option 1: PM2 (Simple VPS)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start src/index.js --name crypto-hub-bot

# Save configuration
pm2 save
pm2 startup
```

### Option 2: Docker

```bash
# Build image
docker build -t crypto-hub-bot .

# Run container
docker run -d \
  --name crypto-hub-bot \
  --env-file .env \
  -p 3000:3000 \
  crypto-hub-bot
```

### Option 3: Docker Compose

```bash
docker-compose up -d
```

### Option 4: Kubernetes

See `docs/07-DEPLOYMENT.md` for complete Kubernetes manifests.

---

## 🧪 Testing

### Run Tests

```bash
# Install test dependencies
npm install --save-dev jest supertest mongodb-memory-server nock @jest/globals

# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Structure

```
__tests__/
├── setup.js                      # MongoDB Memory Server setup
├── models/
│   ├── User.test.js
│   └── Transaction.test.js
├── services/
│   └── priceFetcher.test.js
└── utils/
    └── paymentContacts.test.js
```

**Documentation:** See `docs/11-TESTING.md`

---

## 🔧 Troubleshooting

### Bot Not Responding

**Check:**
1. `TELEGRAM_BOT_TOKEN` is correct
2. Bot is admin in channel
3. MongoDB connection successful

```bash
# Test bot connection
curl https://api.telegram.org/bot<TOKEN>/getMe

# Check logs
pm2 logs crypto-hub-bot
```

### Jobs Not Running

**Check:**
1. Job is enabled (`ScheduledJob.enabled = true`)
2. Cron expression is valid
3. Timezone is set to `Europe/London`

```bash
# List jobs via admin command
/job_list

# Force run to test
/job_run <jobId>
```

### Payment Webhook Not Received

**Check:**
1. Webhook URL is HTTPS
2. Port 443 is open
3. URL is registered with payment provider
4. Server responds with 200 status quickly

```bash
# Test webhook endpoint
curl -X POST https://yourdomain.com/api/webhook/mpesa/callback \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'
```

**More troubleshooting:** See `docs/08-OPERATIONS.md`

---

## 🛣️ Roadmap

### Phase 1: MVP (Weeks 1-8)
- ✅ Bot with basic commands
- ✅ Channel automation
- ✅ Price fetching
- ✅ Admin commands
- ✅ Payment integration setup

### Phase 2: Growth (Weeks 9-16)
- [ ] Per-user crypto addresses
- [ ] Automated payment verification
- [ ] Analytics dashboard
- [ ] Redis caching & locks
- [ ] Advanced AI prompts

### Phase 3: Enterprise (Weeks 17-24)
- [ ] React admin dashboard
- [ ] Multi-channel support
- [ ] Advanced analytics
- [ ] Kubernetes deployment
- [ ] Revenue optimization

**Full roadmap:** See `docs/09-ROADMAP.md`

---

## 🔒 Security

⚠️ **Important Security Notes:**

- Never commit `.env` to git
- Use environment variables for all secrets
- Rotate API keys regularly
- Validate all webhook payloads
- Implement rate limiting on API endpoints
- Use HTTPS for all webhook URLs
- Add authentication to admin endpoints

**Full security guide:** See `docs/10-SECURITY.md`

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📞 Support

- **Documentation:** Check `docs/` directory
- **Issues:** Open GitHub issue
- **Email:** support@crypto.loopnet.tech
- **Telegram:** @your_support_channel

---

## 🎯 Quick Commands Cheat Sheet

```bash
# Development
npm run dev                    # Start with hot reload
npm test                       # Run tests
npm run test:coverage          # Generate coverage report

# Production
npm start                      # Start application
pm2 start src/index.js         # Start with PM2
docker-compose up -d           # Start with Docker

# Admin (via Telegram)
/job_create                    # Create scheduled job
/job_list                      # View all jobs
/broadcast <msg>               # Send to channel
/show_config                   # View configuration
```

---

**Built with ❤️ for the crypto community**

🔗 [crypto.loopnet.tech](https://crypto.loopnet.tech)
