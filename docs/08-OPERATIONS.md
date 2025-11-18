# Operations Guide — Crypto Hub Bot

## Overview

This guide covers day-to-day operations, monitoring, troubleshooting, and maintenance of Crypto Hub Bot in production.

---

## Daily Operations

### Morning Checklist

```bash
# 1. Check application status
pm2 status crypto-hub-bot

# 2. Review overnight logs
pm2 logs crypto-hub-bot --lines 100 | grep -i error

# 3. Check database health
mongosh --eval "db.serverStatus().connections"

# 4. Verify channel posts
# Check Telegram channel for scheduled posts

# 5. Review payment transactions
# Check for pending transactions needing reconciliation
```

### Weekly Tasks

- Review error logs and identify patterns
- Check disk space usage
- Verify backup integrity
- Update dependencies (security patches)
- Review user growth metrics
- Analyze payment success rates

### Monthly Tasks

- Performance optimization review
- Cost analysis (API usage, hosting)
- Security audit
- Database maintenance (indexes, cleanup)
- Update documentation
- Plan feature releases

---

## Monitoring

### Key Metrics to Track

1. **Application Health**
   - Uptime percentage
   - Response time
   - Memory usage
   - CPU usage

2. **User Metrics**
   - Daily active users (DAU)
   - New registrations
   - Subscription conversions
   - Churn rate

3. **Bot Performance**
   - Command response time
   - Error rate per command
   - Channel post success rate

4. **Payment Metrics**
   - Transaction success rate
   - Average reconciliation time
   - Revenue by payment method

5. **API Metrics**
   - Gemini API usage (tokens)
   - CoinGecko API calls
   - Rate limit hits

### Prometheus + Grafana Setup

**Install Prometheus:**

```bash
# Download and install
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*

# Create config
cat > prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'crypto-hub-bot'
    static_configs:
      - targets: ['localhost:3000']
EOF

# Start Prometheus
./prometheus --config.file=prometheus.yml
```

**Add Metrics Endpoint:**

```javascript
// src/routes/metrics.js
import express from 'express';
import client from 'prom-client';

const router = express.Router();

// Create a Registry
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Custom metrics
const commandCounter = new client.Counter({
  name: 'bot_commands_total',
  help: 'Total number of bot commands executed',
  labelNames: ['command'],
  registers: [register]
});

const paymentCounter = new client.Counter({
  name: 'payments_total',
  help: 'Total number of payments',
  labelNames: ['provider', 'status'],
  registers: [register]
});

const geminiTokens = new client.Counter({
  name: 'gemini_tokens_total',
  help: 'Total Gemini API tokens used',
  registers: [register]
});

// Export metrics
router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export { router as metricsRouter, commandCounter, paymentCounter, geminiTokens };
```

**Use Metrics:**

```javascript
// In bot command handler
import { commandCounter } from './routes/metrics.js';

bot.command('start', async (ctx) => {
  commandCounter.inc({ command: 'start' });
  // ... handle command
});
```

### Grafana Dashboard

Create dashboard with panels for:
- Bot command frequency
- Payment success rate over time
- API token usage trend
- Error rate by type
- Response time percentiles

---

## Logging Strategy

### Log Levels

- **ERROR**: Critical issues requiring immediate attention
- **WARN**: Potential issues to investigate
- **INFO**: General application flow
- **DEBUG**: Detailed diagnostic information

### Winston Logger Setup

```javascript
// src/utils/logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760,
      maxFiles: 10
    })
  ]
});

// Console output in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export default logger;
```

### Structured Logging

```javascript
import logger from './utils/logger.js';

// Good: Structured data
logger.info('Payment processed', {
  userId: 12345,
  provider: 'mpesa',
  amount: 100,
  status: 'completed'
});

// Better: Include context
logger.error('Payment failed', {
  userId: 12345,
  provider: 'mpesa',
  amount: 100,
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
});
```

### Log Rotation

```bash
# Install logrotate
sudo apt install logrotate

# Configure rotation
sudo cat > /etc/logrotate.d/crypto-hub-bot << EOF
/opt/crypto-hub-bot/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    copytruncate
}
EOF
```

### Centralized Logging (Optional)

**ELK Stack (Elasticsearch, Logstash, Kibana):**

```javascript
// Install Winston Elasticsearch transport
npm install winston-elasticsearch

// Configure
import { ElasticsearchTransport } from 'winston-elasticsearch';

const esTransport = new ElasticsearchTransport({
  level: 'info',
  clientOpts: { node: 'http://localhost:9200' },
  index: 'crypto-hub-bot'
});

logger.add(esTransport);
```

---

## Alerting

### Alert Channels

1. **Telegram Bot** (to admin)
2. **Email** (critical issues)
3. **Slack/Discord** (team notifications)
4. **PagerDuty** (on-call rotation)

### Alert Service

```javascript
// src/services/alerting.js
import bot from './telegramBot.js';
import config from '../config.js';
import logger from '../utils/logger.js';

const ALERT_LEVELS = {
  INFO: '🔵',
  WARNING: '🟡',
  ERROR: '🔴',
  CRITICAL: '🚨'
};

async function sendAlert(level, title, message, metadata = {}) {
  const icon = ALERT_LEVELS[level] || '⚠️';
  
  const text = `${icon} *${level}: ${title}*\n\n${message}`;
  const details = Object.entries(metadata)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  try {
    await bot.telegram.sendMessage(
      config.ADMIN_TELEGRAM_ID,
      `${text}\n\n\`\`\`\n${details}\n\`\`\``,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Failed to send alert', { error: error.message });
  }
}

// Alert triggers
async function checkSystemHealth() {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

  if (heapUsedMB > 450) {
    await sendAlert(
      'WARNING',
      'High Memory Usage',
      `Heap memory: ${heapUsedMB.toFixed(0)}MB / 512MB`,
      { uptime: process.uptime() }
    );
  }
}

// Run health checks every 5 minutes
setInterval(checkSystemHealth, 5 * 60 * 1000);

export { sendAlert };
```

### Common Alert Scenarios

1. **Application Down**
   - Trigger: Health check fails
   - Action: Restart application, notify admin

2. **Database Connection Lost**
   - Trigger: MongoDB connection error
   - Action: Attempt reconnection, alert if persistent

3. **High Error Rate**
   - Trigger: >10 errors in 5 minutes
   - Action: Alert admin, investigate logs

4. **Payment Failure Spike**
   - Trigger: >30% payment failures in 1 hour
   - Action: Check payment provider status

5. **API Rate Limit**
   - Trigger: Rate limit hit on external API
   - Action: Reduce request frequency, alert

6. **Disk Space Low**
   - Trigger: <10% disk space remaining
   - Action: Clean logs, alert admin

---

## Performance Optimization

### Database Optimization

**1. Add Indexes:**

```javascript
// src/models/User.js
userSchema.index({ telegramId: 1 }, { unique: true });
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ plan: 1, status: 1 });
userSchema.index({ createdAt: -1 });

// src/models/Transaction.js
transactionSchema.index({ userId: 1, status: 1 });
transactionSchema.index({ reference: 1 }, { unique: true });
transactionSchema.index({ createdAt: -1 });
```

**2. Query Optimization:**

```javascript
// Bad: Loads all fields
const users = await User.find({ plan: 'premium' });

// Good: Select only needed fields
const users = await User.find({ plan: 'premium' })
  .select('telegramId name plan')
  .lean();
```

**3. Pagination:**

```javascript
// For large datasets
const page = parseInt(req.query.page) || 1;
const limit = 50;

const transactions = await Transaction.find()
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit)
  .lean();
```

**4. Connection Pooling:**

```javascript
// src/db/connection.js
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000
};

await mongoose.connect(config.MONGO_URI, options);
```

### API Rate Limiting

```javascript
// src/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Apply to routes
app.use('/api/', apiLimiter);
```

### Caching

```javascript
// src/services/cache.js
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes default

async function getCachedPrices() {
  const cacheKey = 'prices:latest';
  
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const prices = await fetchTopCoinPrices();
  cache.set(cacheKey, prices);
  
  return prices;
}

export { cache, getCachedPrices };
```

---

## Database Maintenance

### Backup & Restore

**Automated Daily Backup:**

```bash
#!/bin/bash
# /opt/scripts/backup-mongodb.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
MONGO_URI="mongodb://user:pass@localhost:27017"
DATABASE="crypto_hub"

mkdir -p $BACKUP_DIR

# Create backup
mongodump --uri="$MONGO_URI/$DATABASE" --out="$BACKUP_DIR/backup_$DATE"

# Compress
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" -C "$BACKUP_DIR" "backup_$DATE"
rm -rf "$BACKUP_DIR/backup_$DATE"

# Upload to S3 (optional)
# aws s3 cp "$BACKUP_DIR/backup_$DATE.tar.gz" s3://my-backups/mongodb/

# Keep only last 7 days locally
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.tar.gz"
```

**Restore from Backup:**

```bash
# Extract backup
tar -xzf backup_20250117_020000.tar.gz

# Restore database
mongorestore --uri="mongodb://user:pass@localhost:27017" \
  --db=crypto_hub \
  backup_20250117_020000/crypto_hub
```

### Cleanup Old Data

```javascript
// src/scripts/cleanup.js
import mongoose from 'mongoose';
import ChannelMessage from '../models/ChannelMessage.js';
import Transaction from '../models/Transaction.js';
import logger from '../utils/logger.js';

async function cleanupOldData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Delete old channel messages
  const deletedMessages = await ChannelMessage.deleteMany({
    postedAt: { $lt: thirtyDaysAgo }
  });

  // Archive old completed transactions (move to archive collection)
  const oldTransactions = await Transaction.find({
    status: 'completed',
    completedAt: { $lt: thirtyDaysAgo }
  }).lean();

  if (oldTransactions.length > 0) {
    // Save to archive collection
    const ArchiveTransaction = mongoose.model('ArchivedTransaction', Transaction.schema);
    await ArchiveTransaction.insertMany(oldTransactions);

    // Delete from main collection
    await Transaction.deleteMany({
      _id: { $in: oldTransactions.map(t => t._id) }
    });
  }

  logger.info('Cleanup completed', {
    deletedMessages: deletedMessages.deletedCount,
    archivedTransactions: oldTransactions.length
  });
}

// Run cleanup
cleanupOldData()
  .then(() => process.exit(0))
  .catch(err => {
    logger.error('Cleanup failed', { error: err.message });
    process.exit(1);
  });
```

**Schedule Cleanup:**

```bash
# Run weekly on Sunday at 3 AM
0 3 * * 0 cd /opt/crypto-hub-bot && node src/scripts/cleanup.js >> /var/log/cleanup.log 2>&1
```

---

## Troubleshooting Guide

### Application Won't Start

**Symptoms:**
- Process exits immediately
- "Port already in use" error
- MongoDB connection error

**Diagnosis:**

```bash
# Check if port is in use
sudo lsof -i :3000

# Check MongoDB status
sudo systemctl status mongod

# Check environment variables
cat .env

# Check logs
pm2 logs crypto-hub-bot --lines 50
```

**Solutions:**

```bash
# Kill process on port 3000
kill $(lsof -t -i:3000)

# Start MongoDB
sudo systemctl start mongod

# Verify .env is complete
diff .env.example .env
```

---

### High Memory Usage

**Symptoms:**
- Application uses >500MB RAM
- Process crashes with "Out of memory"

**Diagnosis:**

```bash
# Check memory usage
pm2 monit

# Get heap snapshot
node --expose-gc --inspect src/index.js
# In Chrome DevTools, take heap snapshot
```

**Solutions:**

```javascript
// Implement memory limit
pm2 start src/index.js --max-memory-restart 500M

// Check for memory leaks
// Ensure no global caches grow unbounded
// Close database connections properly
// Clear intervals/timeouts when done
```

---

### Bot Not Responding

**Symptoms:**
- Commands don't trigger responses
- Channel posts not appearing

**Diagnosis:**

```bash
# Test bot connection
curl https://api.telegram.org/bot<TOKEN>/getMe

# Check bot logs
grep -i "telegram" logs/combined.log | tail -20

# Verify webhook (if using)
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

**Solutions:**

```bash
# Restart bot
pm2 restart crypto-hub-bot

# Delete webhook (if stuck)
curl https://api.telegram.org/bot<TOKEN>/deleteWebhook

# Verify BOT_TOKEN in .env
echo $TELEGRAM_BOT_TOKEN
```

---

### Payment Webhook Not Received

**Symptoms:**
- Payments marked as pending forever
- No callback logs

**Diagnosis:**

```bash
# Check webhook endpoint is accessible
curl -X POST https://yourdomain.com/api/webhook/mpesa/callback \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'

# Check nginx logs
sudo tail -f /var/log/nginx/access.log

# Verify webhook URL in M-Pesa dashboard
```

**Solutions:**

```bash
# Ensure HTTPS is configured
sudo certbot --nginx -d yourdomain.com

# Check firewall allows port 443
sudo ufw allow 443

# Test webhook URL with M-Pesa sandbox
```

---

### Gemini API Errors

**Symptoms:**
- "Invalid API key" error
- Rate limit exceeded
- Empty responses

**Diagnosis:**

```bash
# Test API key
curl -X POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$GEMINI_API_KEY \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'

# Check usage quota
# Visit: https://aistudio.google.com/app/apikey
```

**Solutions:**

```javascript
// Verify API key in .env
// Implement rate limiting
// Add fallback content
// Cache responses
```

---

### Database Performance Issues

**Symptoms:**
- Slow query responses
- High CPU on MongoDB
- Timeouts

**Diagnosis:**

```javascript
// Enable MongoDB profiling
mongosh
use crypto_hub
db.setProfilingLevel(2) // Log all operations
db.system.profile.find().limit(10).sort({ ts: -1 })
```

**Solutions:**

```bash
# Add missing indexes
# Optimize queries (use .lean(), select fields)
# Increase connection pool size
# Consider sharding for large datasets
```

---

## Disaster Recovery

### Recovery Scenarios

**1. Complete Server Failure**

```bash
# On new server
# 1. Install dependencies
sudo apt update && sudo apt install nodejs npm mongodb-org nginx

# 2. Clone repository
git clone https://github.com/yourusername/crypto-hub-bot.git

# 3. Restore database from backup
mongorestore --uri="mongodb://localhost:27017" backup_latest/

# 4. Configure environment
cp .env.backup .env

# 5. Start application
npm install
pm2 start src/index.js --name crypto-hub-bot
```

**2. Database Corruption**

```bash
# Repair database
mongod --repair --dbpath /var/lib/mongodb

# Or restore from backup
mongorestore --drop --uri="mongodb://localhost:27017" backup_latest/
```

**3. Accidental Data Deletion**

```javascript
// Restore specific collection from backup
mongorestore --uri="mongodb://localhost:27017" \
  --nsInclude="crypto_hub.users" \
  backup_20250117_020000/
```

### Runbook Template

```markdown
# Incident Response Runbook

## Incident: [Name]

**Severity:** Critical / High / Medium / Low

### Detection
- How to detect: [Alert/Monitor]
- Symptoms: [What users see]

### Investigation
1. Check logs: [Commands]
2. Verify services: [Commands]
3. Check metrics: [Dashboard link]

### Resolution
1. Immediate action: [Steps]
2. Root cause fix: [Steps]
3. Verification: [How to confirm fixed]

### Prevention
- [Action to prevent recurrence]

### Post-Mortem
- Timeline:
- Root cause:
- Lessons learned:
- Action items:
```

---

## Security Operations

### Security Monitoring

```javascript
// Track suspicious activity
async function logSuspiciousActivity(userId, action, metadata) {
  logger.warn('Suspicious activity detected', {
    userId,
    action,
    metadata,
    timestamp: new Date().toISOString()
  });

  // Alert admin
  await sendAlert('WARNING', 'Suspicious Activity', 
    `User ${userId} performed: ${action}`);
}

// Example: Detect rapid payment attempts
bot.command('pay', async (ctx) => {
  const recentAttempts = await Transaction.countDocuments({
    userId: ctx.from.id,
    createdAt: { $gte: new Date(Date.now() - 60000) }
  });

  if (recentAttempts > 5) {
    await logSuspiciousActivity(ctx.from.id, 'Rapid payment attempts', {
      count: recentAttempts
    });
    return ctx.reply('Too many payment attempts. Please try again later.');
  }

  // Process payment...
});
```

### Secrets Rotation

```bash
# Rotate Telegram Bot Token
# 1. Generate new token via @BotFather
# 2. Update .env
# 3. Restart application
pm2 restart crypto-hub-bot

# Rotate Database Password
# 1. Change password in MongoDB
mongosh
use admin
db.changeUserPassword("crypto_hub_user", "new_password")
# 2. Update .env
# 3. Restart application
```

---

## Scaling Strategies

### Vertical Scaling

```bash
# Upgrade server resources
# - More RAM (512MB → 2GB)
# - More CPU (1 core → 2 cores)

# Increase PM2 instances
pm2 scale crypto-hub-bot 2
```

### Horizontal Scaling

**Load Balancer (Nginx):**

```nginx
upstream crypto_hub_backend {
    least_conn;
    server app1.internal:3000;
    server app2.internal:3000;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://crypto_hub_backend;
    }
}
```

**Separate Workers:**

```javascript
// Run cron jobs on dedicated worker instance
// main.js (web instance)
if (process.env.INSTANCE_TYPE === 'web') {
  startExpressServer();
  startTelegramBot();
}

// worker.js (cron instance)
if (process.env.INSTANCE_TYPE === 'worker') {
  startScheduler();
  startPriceFetcher();
}
```

---

## Contact & Escalation

### On-Call Rotation

- **Primary:** [Admin Name] - [Contact]
- **Secondary:** [Backup Admin] - [Contact]
- **Escalation:** [CTO/Senior Dev] - [Contact]

### Support Channels

- **User Support:** Telegram bot commands (/help, /support)
- **Technical Issues:** Email support@crypto.loopnet.tech
- **Emergency:** On-call phone

---

## Next Steps

1. Set up monitoring and alerting
2. Configure log aggregation
3. Create runbooks for common incidents
4. Test disaster recovery procedures
5. Schedule regular maintenance windows
6. Review and optimize performance monthly
