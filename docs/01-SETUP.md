# Setup Guide — Crypto Hub Bot

This guide walks through local development setup and initial configuration.

## Prerequisites

- **Node.js** 20+ (verify: `node --version`)
- **MongoDB** 5+ (local or hosted — MongoDB Atlas, etc.)
- **Telegram Bot Token** (get from [@BotFather](https://t.me/BotFather))
- **Telegram Channel** (optional but recommended for channel automation)
- **Git** for version control

## Step 1: Clone Repository

```bash
git clone <your-repo-url> crypto-hub-bot
cd crypto-hub-bot
```

## Step 2: Install Dependencies

```bash
npm install
```

This installs:
- express
- mongoose
- telegraf
- node-cron
- cron (timezone-aware scheduling)
- axios
- dotenv

## Step 3: Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# MongoDB connection
MONGO_URI=mongodb://localhost:27017/crypto-hub

# Server
PORT=3000

# Telegram
TELEGRAM_BOT_TOKEN=<your-bot-token>
TELEGRAM_CHANNEL_ID=@yourchannel_or_-1001234567890
ADMIN_TELEGRAM_ID=<your-telegram-user-id>

# Crypto addresses
CRYPTO_USDT_ADDRESS=0xYourTetherAddress
CRYPTO_BTC_ADDRESS=bc1qyourbtcaddress

# Mobile money (E.164 format — no leading +)
MPESA_NUMBER_KE=254791792027
AIRTEL_NUMBER_UG=2567XXXXXXXX
AIRTEL_NUMBER_MW=2657XXXXXXXX
DEFAULT_PAYMENT_COUNTRY=KE

# AI
GEMINI_API_KEY=<optional-for-now>

# Payments (future)
STRIPE_SECRET=<stripe-key>
```

### How to Get Values

#### TELEGRAM_BOT_TOKEN
1. Open Telegram and find [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow prompts
3. Copy the token provided

#### TELEGRAM_CHANNEL_ID
- If using `@username`: set `TELEGRAM_CHANNEL_ID=@yourchannelname`
- If numeric ID: use tools like [@getidsbot](https://t.me/getidsbot) to get the channel ID (format: `-1001234567890`)
- Make sure your bot is added as an administrator to the channel

#### ADMIN_TELEGRAM_ID
- Message [@userinfobot](https://t.me/userinfobot) to get your numeric user ID
- Set this value so admin commands work only for you

#### MONGO_URI
- **Local**: `mongodb://localhost:27017/crypto-hub`
- **Atlas**: Get connection string from MongoDB Atlas dashboard (replace `<password>` and database name)

#### Crypto Addresses
- Use your actual USDT (ERC-20 or TRC-20) and BTC addresses for deposits
- Users will see these when they run `/deposit`

#### Mobile Money Numbers
- Use E.164 format (country code + number, no `+` or spaces)
- Example Kenya M-Pesa: `0791792027` → `254791792027`

## Step 4: Start MongoDB

### Local MongoDB
```bash
# Start MongoDB daemon
mongod --dbpath ./data
```

### MongoDB Atlas (Cloud)
- No local startup needed
- Ensure IP whitelist allows your dev machine
- Update `MONGO_URI` with Atlas connection string

## Step 5: Run the Application

### Development Mode (with auto-restart)
```bash
npm run dev
```

This starts the server with nodemon watching for file changes.

### Production Mode
```bash
npm start
```

## Step 6: Verify Setup

### Check Server
Open browser or curl:
```bash
curl http://localhost:3000
# Expected: "Crypto Hub Bot API"
```

### Check API Health
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","ts":...}
```

### Check Telegram Bot
1. Open Telegram
2. Find your bot (search by username)
3. Send `/start`
4. Expected response: "Welcome to Crypto Hub Bot — send /help to get started"

### Test Admin Commands (as admin user)
```
/show_config
```
Expected: Display of configured addresses and mobile numbers.

### Test Deposit Command
```
/deposit
```
Expected: Crypto addresses and mobile money number displayed.

## Step 7: Initial Data Setup (Optional)

### Create Test User
You can manually insert a test user in MongoDB:

```js
// Connect to mongo shell
mongosh

use crypto-hub

db.users.insertOne({
  email: "test@example.com",
  name: "Test User",
  plan: "free",
  createdAt: new Date()
})
```

### Create Test Scheduled Job
Use the admin command in Telegram:

```
/job_create TestJob || */30 * * * * || alpha || gemini:Write a short crypto alpha for BTC
```

This creates a job that runs every 30 minutes.

## Troubleshooting

### MongoDB Connection Fails
- Verify MongoDB is running: `mongod --version`
- Check `MONGO_URI` is correct
- Check firewall/network if using remote MongoDB

### Bot Doesn't Respond
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check bot isn't blocked or restricted
- Ensure bot is added to channel as admin (if using channel features)
- Check server logs for errors

### Admin Commands Don't Work
- Verify `ADMIN_TELEGRAM_ID` matches your Telegram user ID
- Get your ID from [@userinfobot](https://t.me/userinfobot)

### Channel Posts Fail
- Verify bot is admin in the channel
- Check `TELEGRAM_CHANNEL_ID` format (numeric or @username)
- Ensure bot has "Post Messages" permission

### Port Already in Use
```bash
# Change PORT in .env or kill existing process
lsof -ti:3000 | xargs kill -9
```

## Next Steps

After setup is complete:
1. Read [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) to understand system design
2. Review [03-API-REFERENCE.md](./03-API-REFERENCE.md) for available endpoints and commands
3. Configure scheduled jobs using [04-SCHEDULER-GUIDE.md](./04-SCHEDULER-GUIDE.md)
4. Integrate payments via [05-PAYMENT-INTEGRATION.md](./05-PAYMENT-INTEGRATION.md)

## Development Tips

### Hot Reload
- Use `npm run dev` (nodemon watches `src/` directory)
- Changes auto-restart the server

### Debugging
```bash
# Enable verbose logging
DEBUG=* npm run dev

# Or use Node inspector
node --inspect src/index.js
```

### Reset Database (Development)
```bash
mongosh
use crypto-hub
db.dropDatabase()
```

### Test Cron Jobs Manually
Use admin commands to force-run jobs:
```
/job_run <jobId>
```

### View Logs
```bash
# If using PM2
pm2 logs crypto-hub-bot

# If running directly
# Logs appear in terminal
```

## Security Checklist

- [ ] `.env` is in `.gitignore` (never commit secrets)
- [ ] `ADMIN_TELEGRAM_ID` is set to your user ID only
- [ ] MongoDB is not exposed publicly (use auth + firewall)
- [ ] Crypto addresses are correct (test with small amounts first)
- [ ] Mobile money numbers verified

## Ready to Deploy?

See [07-DEPLOYMENT.md](./07-DEPLOYMENT.md) for production deployment options.
