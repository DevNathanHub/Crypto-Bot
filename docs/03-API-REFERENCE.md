# API Reference — Crypto Hub Bot

## REST API Endpoints

### Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://api.crypto.loopnet.tech` (configure accordingly)

### Authentication
- Currently: No authentication for public endpoints
- Future: JWT tokens for protected endpoints

---

## Public Endpoints

### `GET /`
Returns API identifier.

**Response:**
```
Crypto Hub Bot API
```

---

### `GET /api/health`
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "ts": 1700000000000
}
```

**Status Codes:**
- `200` — Healthy
- `500` — Unhealthy

---

### `GET /api/prices`
Fetch current price for a cryptocurrency ticker.

**Query Parameters:**
- `ticker` (string, optional) — CoinGecko ticker ID (default: `bitcoin`)

**Example:**
```bash
curl "http://localhost:3000/api/prices?ticker=ethereum"
```

**Response:**
```json
{
  "ticker": "ethereum",
  "price": 2453.67
}
```

**Error Response:**
```json
{
  "error": "price_fetch_failed",
  "detail": "price_not_found"
}
```

**Status Codes:**
- `200` — Success
- `500` — Fetch failed

---

## Telegram Bot Commands

### User Commands

#### `/start`
Welcome message and onboarding.

**Response:**
```
Welcome to Crypto Hub Bot — send /help to get started
```

---

#### `/help`
Display available commands.

**Response:**
```
Use /subscribe <ticker> to get alerts
```

---

#### `/deposit [country]`
Show crypto addresses and mobile money numbers for deposits.

**Parameters:**
- `country` (optional) — Country code (KE, UG, MW). Defaults to `DEFAULT_PAYMENT_COUNTRY`.

**Example:**
```
/deposit
/deposit UG
```

**Response:**
```
Deposit options:

📌 *USDT (ERC20 / TRC20)*: `0x...`
📌 *BTC*: `bc1q...`

📲 *Mobile Money (M-Pesa Kenya)*: 254791792027

When you send, please include your Telegram ID or Order Ref in the payment note. Then send /confirm_deposit <amount> so we can reconcile.
```

---

#### `/confirm_deposit <amount>`
Confirm a mobile money or crypto deposit.

**Parameters:**
- `amount` (required) — Amount deposited

**Example:**
```
/confirm_deposit 1000
```

**Response:**
```
Thanks — we've recorded your confirmation for 1000. We'll reconcile after payment is received.
```

**Future:**
- Creates `Transaction` record
- Triggers reconciliation workflow

---

#### `/subscribe <ticker> <threshold>` (Future)
Set price alert for a ticker.

**Parameters:**
- `ticker` (required) — Crypto ticker (BTC, ETH, etc.)
- `threshold` (required) — Price threshold

**Example:**
```
/subscribe BTC 50000
```

---

### Admin Commands

**Note:** Admin commands only work for the user specified in `ADMIN_TELEGRAM_ID`.

---

#### `/show_config`
Display configured addresses and mobile numbers (safe — no secrets).

**Response:**
```
Configured addresses/numbers:

USDT: `0x...`
BTC:  `bc1q...`

M-Pesa (KE): 254791792027
Airtel (UG): 2567XXXXXXXX
Airtel (MW): 2657XXXXXXXX
```

---

#### `/job_create <name> || <cron> || <type> || <content>`
Create a new scheduled job.

**Parameters:**
- `name` — Human-readable job name
- `cron` — Cron expression (e.g., `0 9 * * *` for 9 AM daily)
- `type` — Content type (`alpha`, `digest`, `news`)
- `content` — Either static text or `gemini:<prompt>` for AI generation

**Example:**
```
/job_create MorningAlpha || 0 9 * * * || alpha || gemini:Write a short crypto alpha for BTC and ETH under 200 chars
```

**Response:**
```
Scheduled job created: 64a8f3b2c1d4e5f6a7b8c9d0
Name: MorningAlpha
Cron: 0 9 * * * (Europe/London)
```

---

#### `/job_list`
List all scheduled jobs.

**Response:**
```
*Scheduled Jobs*

ID: 64a8f3b2c1d4e5f6a7b8c9d0
Name: MorningAlpha
Cron: 0 9 * * * tz:Europe/London
Enabled: true
LastRun: 2025-11-17T09:00:00.000Z

---

ID: 64a8f3b2c1d4e5f6a7b8c9d1
Name: EveningDigest
Cron: 0 20 * * * tz:Europe/London
Enabled: true
LastRun: never
```

---

#### `/job_pause <jobId>`
Pause a scheduled job (stops execution, keeps in DB).

**Example:**
```
/job_pause 64a8f3b2c1d4e5f6a7b8c9d0
```

**Response:**
```
Job 64a8f3b2c1d4e5f6a7b8c9d0 paused.
```

---

#### `/job_resume <jobId>`
Resume a paused job.

**Example:**
```
/job_resume 64a8f3b2c1d4e5f6a7b8c9d0
```

**Response:**
```
Job 64a8f3b2c1d4e5f6a7b8c9d0 resumed.
```

---

#### `/job_reschedule <jobId> || <newCron>`
Change cron expression for an existing job.

**Example:**
```
/job_reschedule 64a8f3b2c1d4e5f6a7b8c9d0 || 0 10 * * *
```

**Response:**
```
Job 64a8f3b2c1d4e5f6a7b8c9d0 rescheduled to 0 10 * * *
```

---

#### `/job_run <jobId>`
Force-execute a job immediately (bypasses schedule).

**Example:**
```
/job_run 64a8f3b2c1d4e5f6a7b8c9d0
```

**Response:**
```
Job executed and posted.
```

**Use Case:**
- Test job output before scheduling
- Trigger ad-hoc posts

---

#### `/broadcast <message>`
Send an ad-hoc message to the configured Telegram channel.

**Example:**
```
/broadcast 🚀 New VIP spots open! Sign up at https://crypto.loopnet.tech
```

**Response:**
```
Broadcast sent.
```

---

#### `/pin <chatId> <messageId>`
Pin a message in a chat/channel.

**Parameters:**
- `chatId` — Telegram chat ID (can be channel ID)
- `messageId` — Telegram message ID

**Example:**
```
/pin -1001234567890 12345
```

**Response:**
```
Pinned message.
```

---

## Cron Expression Reference

Used in `/job_create` and `job_reschedule`.

### Format
```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7, 0 or 7 = Sunday)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

### Examples

| Expression | Description |
|------------|-------------|
| `0 9 * * *` | Every day at 09:00 |
| `0 9,21 * * *` | Every day at 09:00 and 21:00 |
| `*/15 * * * *` | Every 15 minutes |
| `0 0 * * 1` | Every Monday at midnight |
| `0 8 1 * *` | 1st of every month at 08:00 |

**Timezone:** Jobs use `Europe/London` timezone (handles BST/GMT transitions automatically).

---

## Error Codes

### Common HTTP Errors

| Status | Code | Description |
|--------|------|-------------|
| 400 | `bad_request` | Invalid parameters |
| 401 | `unauthorized` | Admin-only command without auth |
| 404 | `not_found` | Resource not found |
| 500 | `internal_error` | Server error |

### Bot-Specific Errors

| Error | Description |
|-------|-------------|
| `telegram_not_initialized` | Bot not started |
| `telegram_channel_id_not_set` | `TELEGRAM_CHANNEL_ID` missing |
| `job_not_found` | Scheduled job ID invalid |
| `price_fetch_failed` | External API failure |

---

## Rate Limits

### Current
- No rate limits (MVP)

### Future
- **Public API**: 100 req/min per IP
- **Admin commands**: 30 req/min per user
- **Channel posts**: Max 20 posts/hour (Telegram limits)

---

## Webhooks (Future)

### M-Pesa Webhook
**Endpoint:** `POST /api/webhook/mpesa`

**Purpose:** Receive M-Pesa payment confirmations.

**Payload:**
```json
{
  "TransactionType": "Pay Bill",
  "TransID": "QKA1B2C3D4",
  "TransAmount": "1000.00",
  "BusinessShortCode": "174379",
  "BillRefNumber": "user123",
  "MSISDN": "254791792027",
  "TransTime": "20231117120000"
}
```

**Response:**
```json
{
  "ResultCode": 0,
  "ResultDesc": "Accepted"
}
```

---

### Airtel Money Webhook
**Endpoint:** `POST /api/webhook/airtel`

**Purpose:** Receive Airtel Money payment confirmations.

---

## SDK / Client Libraries (Future)

### JavaScript/Node.js
```javascript
const CryptoHubClient = require('@crypto-hub/client');

const client = new CryptoHubClient({
  apiKey: 'your-api-key'
});

const price = await client.prices.get('bitcoin');
console.log(price); // { ticker: 'bitcoin', price: 45000 }
```

---

## Postman Collection

Import the following into Postman for testing:

```json
{
  "info": { "name": "Crypto Hub Bot API" },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/health"
      }
    },
    {
      "name": "Get Price",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/prices?ticker=bitcoin"
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    }
  ]
}
```

---

## OpenAPI Specification (Future)

Generate OpenAPI spec for automated client generation:

```yaml
openapi: 3.0.0
info:
  title: Crypto Hub Bot API
  version: 0.1.0
paths:
  /api/health:
    get:
      summary: Health check
      responses:
        '200':
          description: Healthy
```

---

## Support

For API issues or questions:
- Telegram: Contact admin (`ADMIN_TELEGRAM_ID`)
- Email: support@crypto.loopnet.tech
- Docs: https://crypto.loopnet.tech/docs
