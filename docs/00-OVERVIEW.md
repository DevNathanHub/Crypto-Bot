# Crypto Hub Bot — Project Overview

## Vision

Crypto Hub Bot is a Telegram-based cryptocurrency intelligence and trading signal platform that delivers:
- Real-time price alerts and market signals
- AI-generated daily digests and research
- Multi-channel content distribution (Telegram channel + private bot)
- Mobile money and crypto payment integration (M-Pesa, Airtel Money, USDT, BTC)
- Subscription monetization via https://crypto.loopnet.tech

## Target Users

1. **Retail traders** — want curated, high-relevance updates without noise
2. **Content creators & influencers** — need ready-to-post market commentary
3. **Institutional teams** — require auditable research with SLA guarantees

## Three Variants

### MVP (Version A) — Signal & Digest
- **Focus**: Fast time-to-market with price alerts and daily digest
- **Stack**: Node.js, Express, MongoDB, node-cron, Telegraf, Gemini placeholder
- **Timeline**: 2-3 weeks to launch
- **Monetization**: Free (3 tickers) + Premium ($5/mo unlimited)

### Growth (Version B) — Social + Content Engine
- **Focus**: Viral content generation, multi-channel automation
- **Stack**: BullMQ + Redis for async jobs, full Gemini integration, social API connectors
- **Timeline**: 4-6 weeks to full feature set
- **Monetization**: Creator Plan ($15/mo), Pro ($49/mo), enterprise API

### Enterprise (Version C) — Research + Compliance
- **Focus**: Institutional-grade with audit logs, multi-tenant, RBAC
- **Stack**: Kubernetes microservices, Keycloak/Auth0, ClickHouse analytics
- **Timeline**: 8-12 weeks for full platform
- **Monetization**: Seat-based licensing, professional services

## Current Implementation Status

This repository contains the **MVP foundation** with extensions toward Growth features:
- ✅ Express API + MongoDB models
- ✅ Node-cron scheduler with London timezone support
- ✅ Telegram bot with admin commands (schedule management)
- ✅ Channel automation (posts every 15 min + daily digest)
- ✅ Payment contact helpers (M-Pesa, Airtel, crypto addresses)
- ✅ Transaction model for reconciliation
- 🚧 Gemini AI (placeholder — needs real integration)
- 🚧 Payment webhooks (M-Pesa STK push, Airtel callbacks)
- 🚧 Analytics dashboard
- 🚧 Stripe billing integration

## Key Features

### For Users
- `/start` — onboarding with welcome message
- `/deposit` — show crypto addresses and mobile money numbers
- `/subscribe <ticker>` — set price alert thresholds
- `/help` — command reference

### For Admins
- **`/seed_jobs`** — **seed 13 automated content jobs (marketing, strategies, whale alerts, trending, movers)**
- `/job_create` — schedule channel posts (cron + Gemini prompt)
- `/job_list` — view all scheduled jobs
- `/job_pause` / `/job_resume` — control job execution
- `/job_reschedule` — change job timing
- `/job_run` — force-send a job immediately
- `/broadcast` — send ad-hoc message to channel
- `/pin` — pin a message in the channel
- `/show_config` — display configured addresses/numbers (safe)
- `/clear_jobs` — delete all scheduled jobs (requires confirmation)

### Automated Workflows

**Use `/seed_jobs` to auto-create 13 jobs:**

- **Every 5 min**: Marketing messages (150% gains, automation benefits)
- **Every 5 min**: Trading strategy tips (whale tracking, DCA, arbitrage)
- **Every 10 min**: Whale transaction alerts (1000+ ETH transfers)
- **Every 15 min**: Trending coins (CoinGecko hot list)
- **Every 15 min**: Quick market updates (BTC/ETH pulse)
- **Every 30 min**: Top movers (gainers/losers)
- **Every hour**: Market alpha (technical analysis)
- **Every 3 hours**: Motivation posts (mobile money success stories)
- **Daily 8:00 AM**: Complete market digest
- **Daily 9:00 AM**: Morning greeting
- **Daily 2:00 PM**: Afternoon check-in
- **Daily 8:00 PM**: Night wrap

**See:** `docs/12-CHANNEL-AUTOMATION-BLUEPRINT.md`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ (ESM) |
| Framework | Express |
| Database | MongoDB (Mongoose) |
| Job Scheduling | node-cron + CronJob (timezone-aware) |
| Bot Framework | Telegraf |
| AI | Gemini API (placeholder) |
| Payments | M-Pesa, Airtel Money, Crypto (USDT/BTC) |
| Deployment | PM2 / Docker / Kubernetes |

## Repository Structure

```
├── src/
│   ├── index.js                 # Entry point
│   ├── server.js                # Express app
│   ├── config.js                # Environment config
│   ├── models/                  # Mongoose schemas
│   │   ├── User.js
│   │   ├── Subscription.js
│   │   ├── PriceCache.js
│   │   ├── Alert.js
│   │   ├── ScheduledJob.js
│   │   ├── ChannelMessage.js
│   │   └── Transaction.js
│   ├── services/                # Business logic
│   │   ├── priceFetcher.js
│   │   ├── geminiClient.js
│   │   ├── telegramBot.js
│   │   ├── channelManager.js
│   │   ├── analytics.js
│   │   └── payments.js
│   ├── cron/                    # Scheduled jobs
│   │   ├── scheduler.js         # Node-cron (MVP)
│   │   └── channelScheduler.js  # CronJob with timezone
│   ├── bot/                     # Bot commands
│   │   ├── admin.js
│   │   └── commands.js
│   ├── routes/                  # API endpoints
│   │   └── api.js
│   └── utils/
│       └── paymentContacts.js
├── docs/                        # This directory
├── scripts/
│   └── sample_prompt_templates.md
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Documentation Index

1. **[00-OVERVIEW.md](./00-OVERVIEW.md)** — This file
2. **[01-SETUP.md](./01-SETUP.md)** — Installation and configuration
3. **[02-ARCHITECTURE.md](./02-ARCHITECTURE.md)** — System design and data flow
4. **[03-API-REFERENCE.md](./03-API-REFERENCE.md)** — REST endpoints and bot commands
5. **[04-SCHEDULER-GUIDE.md](./04-SCHEDULER-GUIDE.md)** — Cron jobs and channel automation
6. **[05-PAYMENT-INTEGRATION.md](./05-PAYMENT-INTEGRATION.md)** — M-Pesa, Airtel, crypto flows
7. **[06-GEMINI-AI.md](./06-GEMINI-AI.md)** — AI content generation and prompts
8. **[07-DEPLOYMENT.md](./07-DEPLOYMENT.md)** — Production deployment (PM2, Docker, K8s)
9. **[08-OPERATIONS.md](./08-OPERATIONS.md)** — Monitoring, backups, incident response
10. **[09-ROADMAP.md](./09-ROADMAP.md)** — Sprint plans and feature timeline
11. **[10-SECURITY.md](./10-SECURITY.md)** — Auth, secrets, compliance, auditing
12. **[11-TESTING.md](./11-TESTING.md)** — Jest tests and CI/CD
13. **[12-CHANNEL-AUTOMATION-BLUEPRINT.md](./12-CHANNEL-AUTOMATION-BLUEPRINT.md)** — **Complete content automation guide (13 jobs, templates, prompts)**

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> crypto-hub-bot
cd crypto-hub-bot
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your keys

# 3. Start MongoDB (local or remote)
# mongod --dbpath ./data

# 4. Run dev server
npm run dev

# 5. Test bot in Telegram
# Message your bot: /start
```

## Support & Resources

- Main site: https://crypto.loopnet.tech
- Enterprise inquiries: https://crypto.loopnet.tech/enterprise
- Telegram channel: (configure TELEGRAM_CHANNEL_ID)
- Admin contact: (set ADMIN_TELEGRAM_ID)

## License

Proprietary — all rights reserved.
