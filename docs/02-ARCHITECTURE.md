# Architecture Guide — Crypto Hub Bot

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Users & Channels                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Telegram    │  │  Telegram    │  │  External    │      │
│  │  Private Bot │  │  Channel     │  │  APIs        │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Node.js Express Server                   │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │   REST     │  │  Telegraf  │  │   Cron     │     │  │
│  │  │    API     │  │    Bot     │  │ Scheduler  │     │  │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘     │  │
│  └────────┼───────────────┼───────────────┼────────────┘  │
│           │               │               │                │
│  ┌────────▼───────────────▼───────────────▼────────────┐  │
│  │              Service Layer                           │  │
│  │  • Price Fetcher    • Channel Manager               │  │
│  │  • Gemini Client    • Payment Processor             │  │
│  │  • Analytics        • Telegram Bot                  │  │
│  └──────────────────────┬───────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   MongoDB    │  │  Redis Cache │  │  File Store  │      │
│  │  (Primary)   │  │  (Optional)  │  │  (Optional)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Services                           │
│  • CoinGecko API     • Gemini AI        • M-Pesa API        │
│  • Stripe            • Airtel Money     • Analytics         │
└─────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Entry Point (`src/index.js`)

**Responsibilities:**
- Connect to MongoDB
- Start Express server
- Initialize Telegram bot
- Start scheduler
- Handle graceful shutdown

**Flow:**
```javascript
main()
  → mongoose.connect()
  → startServer(PORT)
  → startTelegram()
  → startScheduler()
  → Register signal handlers (SIGINT, SIGTERM)
```

### 2. Express Server (`src/server.js`)

**Responsibilities:**
- HTTP API endpoints
- Health checks
- Webhook receivers (future: M-Pesa, Airtel callbacks)

**Routes:**
- `GET /` — API identifier
- `GET /api/health` — Health check
- `GET /api/prices?ticker=<ticker>` — Fetch price
- `POST /api/subscribe` — Create subscription (future)
- `POST /api/webhook/mpesa` — M-Pesa callback (future)

### 3. Telegram Bot (`src/services/telegramBot.js`)

**Responsibilities:**
- Bot lifecycle management
- User command registration
- Admin command registration
- Message sending to users/channels

**Commands Registered:**
- User: `/start`, `/help`, `/deposit`, `/confirm_deposit`
- Admin: `/job_*`, `/broadcast`, `/pin`, `/show_config`

**Key Functions:**
- `startTelegram()` — Initialize bot, register commands, launch
- `sendTelegramMessage(chatId, text)` — Send to user
- `sendToChannel(text)` — Send to configured channel

### 4. Scheduler Layer

#### A. Node-Cron Scheduler (`src/cron/scheduler.js`)

**MVP scheduler** — runs simple periodic tasks using `node-cron`.

**Jobs:**
- Every 1 min: Fetch BTC price → store in `PriceCache`
- Every 15 min: Generate short update → post to channel
- Daily 08:00 UTC: Generate digest → post to channel

**Limitations:**
- No timezone support (uses system time)
- In-process (not distributed)
- No retry/persistence

#### B. Channel Scheduler (`src/cron/channelScheduler.js`)

**Growth scheduler** — uses `cron` package with timezone support and DB-backed schedules.

**Features:**
- Loads jobs from MongoDB (`ScheduledJob` collection)
- Supports `Europe/London` timezone (handles DST)
- Retry/backoff on failures
- Dynamic add/pause/resume via admin commands

**Job Execution:**
```javascript
CronJob(cronTime, async () => {
  → Load job from DB
  → Generate content (Gemini if needed)
  → Post to channel via channelManager
  → Update job metadata (runCount, lastRunAt)
  → Log analytics
}, null, true, 'Europe/London')
```

### 5. Services

#### Price Fetcher (`src/services/priceFetcher.js`)
- Fetches spot prices from CoinGecko (free tier)
- Returns USD price for given ticker
- Timeout: 5s
- **Future**: Migrate to paid API (CoinAPI, Kaiko) for SLA

#### Gemini Client (`src/services/geminiClient.js`)
- **Current**: Placeholder/mock
- `summarizeDigest(data)` — Generate one-liners
- `generate(prompt, opts)` — Generic generation
- **Future**: Real Gemini API integration with auth, caching, audit logs

#### Channel Manager (`src/services/channelManager.js`)
- `postToChannel(telegram, channelId, content, options)` — Post with retry
- `updateMessageAnalytics(messageId, { views, clicks, reactions })` — Update stats
- Retry logic: exponential backoff (default 3 attempts)

#### Telegram Bot Service (`src/services/telegramBot.js`)
- See section 3 above

#### Payment Service (`src/services/payments.js`)
- `createTransactionForMpesa(userId, amount, phone)` — Create transaction record
- **Future**: STK push initiation, webhook reconciliation

#### Analytics (`src/services/analytics.js`)
- `recordMessage({ title, content, type, geminiPrompt })` — Log channel messages

### 6. Data Models

#### User (`src/models/User.js`)
```javascript
{
  email: String,
  name: String,
  channels: Mixed,  // { telegramId, discordId }
  plan: 'free' | 'premium',
  preferences: Mixed,
  createdAt: Date
}
```

#### Subscription (`src/models/Subscription.js`)
```javascript
{
  userId: ObjectId,
  ticker: String,
  threshold: { type: 'above' | 'below', value: Number },
  notifyChannels: [String],
  active: Boolean
}
```

#### PriceCache (`src/models/PriceCache.js`)
```javascript
{
  ticker: String,
  price: Number,
  timestamp: Date
}
```

#### Alert (`src/models/Alert.js`)
```javascript
{
  userId: ObjectId,
  ticker: String,
  type: String,
  message: String,
  deliveredAt: Date,
  status: 'pending' | 'delivered' | 'failed'
}
```

#### ScheduledJob (`src/models/ScheduledJob.js`)
```javascript
{
  name: String,
  cron: String,  // cron expression
  timezone: String,  // default 'Europe/London'
  channelId: String,
  payload: Mixed,  // { type, content, geminiPrompt, ... }
  enabled: Boolean,
  lastRunAt: Date,
  runCount: Number,
  retryPolicy: { retries: Number, backoffSec: Number }
}
```

#### ChannelMessage (`src/models/ChannelMessage.js`)
```javascript
{
  title: String,
  content: String,
  type: String,
  postedAt: Date,
  geminiPrompt: String,
  telegramMessageId: Number,
  analytics: { views: Number, clicks: Number, reactions: Number }
}
```

#### Transaction (`src/models/Transaction.js`)
```javascript
{
  userId: ObjectId,
  provider: String,  // 'mpesa', 'airtel', 'crypto'
  phone: String,
  payee: String,  // merchant number
  amount: Number,
  currency: String,
  status: 'pending' | 'completed' | 'failed',
  reference: String
}
```

## Data Flow Examples

### Price Alert Flow

```
1. User runs /subscribe BTC 50000
   → Create Subscription { userId, ticker: 'bitcoin', threshold: { type: 'above', value: 50000 } }

2. Every minute: scheduler fetches BTC price
   → priceFetcher.fetchPrice('bitcoin')
   → Store in PriceCache

3. Scheduler evaluates thresholds
   → Query active Subscriptions
   → Compare current price vs threshold
   → If triggered: create Alert, send via sendTelegramMessage()
```

### Channel Post Flow

```
1. Scheduler triggers (every 15 min or daily digest)
   → Load recent PriceCache entries
   → Calculate changes
   → Call Gemini.summarizeDigest(data)
   → Format message with CTA

2. Post to channel
   → channelManager.postToChannel(telegram, channelId, content)
   → Retry on failure (exponential backoff)
   → Store ChannelMessage record

3. Analytics (future)
   → Track views via Telegram API
   → Track clicks via shortlinks
```

### Payment Flow (M-Pesa)

```
1. User runs /deposit
   → Bot replies with MPESA_NUMBER_KE

2. User sends money via M-Pesa
   → Includes Telegram ID in note

3. User runs /confirm_deposit 1000
   → Create Transaction { userId, provider: 'mpesa', amount: 1000, status: 'pending' }

4. M-Pesa webhook arrives (future)
   → Verify signature
   → Match transaction by phone/reference
   → Update Transaction status to 'completed'
   → Credit user account / upgrade plan
```

## Scaling Considerations

### Current MVP Limitations
- Single-process (no horizontal scaling)
- No distributed locking (duplicate jobs if multiple instances)
- In-memory cron jobs (lost on restart)

### Growth Enhancements
- **BullMQ + Redis**: Queue-based job processing with retries
- **Distributed locks**: Redlock or Redis-based mutex
- **Load balancer**: Multiple Express instances behind nginx/ALB
- **Database read replicas**: Separate read/write connections

### Enterprise Requirements
- **Microservices**: Separate services for API, scheduler, bot, webhooks
- **Kubernetes**: Auto-scaling, health checks, rolling updates
- **Multi-tenant**: Tenant isolation, resource quotas
- **Audit logs**: Append-only event store with signatures

## Configuration Management

All configuration via environment variables (see `src/config.js`):

```javascript
// Database
MONGO_URI

// Server
PORT

// Telegram
TELEGRAM_BOT_TOKEN
TELEGRAM_CHANNEL_ID
ADMIN_TELEGRAM_ID

// Payments
CRYPTO_USDT_ADDRESS
CRYPTO_BTC_ADDRESS
MPESA_NUMBER_KE
AIRTEL_NUMBER_UG
DEFAULT_PAYMENT_COUNTRY

// AI
GEMINI_API_KEY

// Billing
STRIPE_SECRET
```

**Best Practices:**
- Use `.env` for local dev (never commit)
- Use secret managers for production (AWS Secrets Manager, Vault)
- Rotate sensitive credentials regularly

## Error Handling Strategy

### Application-Level
- Graceful shutdown on SIGINT/SIGTERM
- MongoDB connection retry with exponential backoff
- Express error middleware (log + 500 response)

### Service-Level
- Try/catch in all async functions
- Log errors with context (user ID, job ID, etc.)
- Return error objects: `{ ok: false, error: { message, code } }`

### Job-Level
- Retry failed jobs (configurable retries + backoff)
- Mark jobs as failed after max retries
- Alert admin on critical failures

## Security Architecture

### Authentication
- Bot: Telegram user ID validation
- Admin: `ADMIN_TELEGRAM_ID` whitelist
- API: (future) JWT tokens for HTTP endpoints

### Authorization
- User commands: any authenticated user
- Admin commands: `isAdmin(ctx)` check
- Scheduled jobs: server-side only (no user trigger)

### Data Protection
- Secrets stored in env vars (not in code)
- MongoDB auth enabled in production
- TLS for all external API calls
- No logging of sensitive data (tokens, private keys)

## Monitoring & Observability

### Logging
- Console logs with context
- Structured logging (future: Winston, Bunyan)
- Log levels: error, warn, info, debug

### Metrics (Future)
- Prometheus metrics endpoint
- Custom metrics: jobs run, alerts sent, API latency
- Grafana dashboards

### Health Checks
- `GET /api/health` — Basic liveness
- MongoDB connection status
- Telegram bot status

### Alerting (Future)
- PagerDuty / Opsgenie for critical failures
- Slack notifications for job failures
- Email alerts for payment reconciliation issues

## Next Steps

- Read [03-API-REFERENCE.md](./03-API-REFERENCE.md) for endpoint details
- Review [04-SCHEDULER-GUIDE.md](./04-SCHEDULER-GUIDE.md) for cron job management
- Understand [05-PAYMENT-INTEGRATION.md](./05-PAYMENT-INTEGRATION.md) for payment flows
