# Security Guide — Crypto Hub Bot

## Security Overview

This guide covers authentication, authorization, secrets management, data protection, compliance, and incident response.

---

## Threat Model

### Assets to Protect
1. **User data** (emails, phone numbers, payment info)
2. **API keys** (Telegram, Gemini, M-Pesa, Stripe)
3. **Crypto addresses** (deposit addresses, private keys if generated)
4. **Subscriber content** (premium signals, AI outputs)
5. **Infrastructure** (servers, databases, credentials)

### Threat Actors
- **External attackers** (hackers, bot scrapers)
- **Malicious users** (spam, abuse, fraud)
- **Insider threats** (rogue admins, compromised accounts)

### Attack Vectors
- API key exposure
- SQL/NoSQL injection
- Telegram bot hijacking
- Payment fraud
- DDoS attacks
- Social engineering

---

## Authentication & Authorization

### Telegram Bot Authentication

**Current Implementation:**
- User identity verified via Telegram's `ctx.from.id`
- No additional password/2FA

**Best Practices:**
- Trust Telegram's user ID as primary identifier
- Never store passwords for Telegram users
- Optionally link to email for account recovery

### Admin Authorization

**Current:**
```javascript
function isAdmin(ctx) {
  return String(ctx.from.id) === String(ADMIN_TELEGRAM_ID);
}
```

**Improvements:**
- Store admin list in database (support multiple admins)
- Add role-based permissions (super-admin, moderator, analyst)
- Implement 2FA for sensitive commands (via Telegram's built-in 2FA)

**Example Multi-Admin:**
```javascript
const admins = await Admin.find({ active: true }).lean();
const adminIds = admins.map(a => String(a.telegramId));
return adminIds.includes(String(ctx.from.id));
```

### API Authentication (Future)

For HTTP endpoints:

**JWT Tokens:**
```javascript
// Generate token
const token = jwt.sign({ userId, plan }, JWT_SECRET, { expiresIn: '1h' });

// Verify middleware
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}
```

**API Keys:**
```javascript
// For external integrations
const apiKey = crypto.randomBytes(32).toString('hex');
// Store hashed in DB
const hash = crypto.createHash('sha256').update(apiKey).digest('hex');

// Verification
function authenticateApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  // Compare with stored hash
}
```

---

## Secrets Management

### Environment Variables (Current)

**.env (Development):**
```env
TELEGRAM_BOT_TOKEN=abc123...
GEMINI_API_KEY=xyz789...
STRIPE_SECRET=sk_test_...
MPESA_CONSUMER_KEY=xxx
MPESA_CONSUMER_SECRET=yyy
```

**⚠️ Critical Rules:**
- **Never commit** `.env` to Git
- Add `.env` to `.gitignore`
- Use `.env.example` with placeholder values only

### Production Secrets Management

**Option 1: AWS Secrets Manager**
```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
  return JSON.parse(data.SecretString);
}

const secrets = await getSecret('crypto-hub-bot/prod');
const TELEGRAM_BOT_TOKEN = secrets.TELEGRAM_BOT_TOKEN;
```

**Option 2: HashiCorp Vault**
```javascript
const vault = require('node-vault')({
  endpoint: 'https://vault.example.com',
  token: process.env.VAULT_TOKEN
});

const secrets = await vault.read('secret/data/crypto-hub-bot');
const TELEGRAM_BOT_TOKEN = secrets.data.data.TELEGRAM_BOT_TOKEN;
```

**Option 3: Kubernetes Secrets**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: crypto-hub-secrets
type: Opaque
data:
  telegram-bot-token: <base64-encoded>
  gemini-api-key: <base64-encoded>
```

```javascript
// Read from mounted volume
const token = fs.readFileSync('/var/secrets/telegram-bot-token', 'utf8');
```

### Secret Rotation

**Schedule:**
- **API keys**: Rotate every 90 days
- **Database passwords**: Rotate every 30 days
- **JWT secrets**: Rotate every 180 days

**Process:**
1. Generate new secret
2. Update in secret store
3. Deploy app with new secret
4. Revoke old secret after 24h grace period

---

## Data Protection

### Encryption at Rest

**MongoDB:**
```bash
# Enable encryption (MongoDB Enterprise)
mongod --enableEncryption --encryptionKeyFile /path/to/keyfile
```

**Application-Level:**
```javascript
const crypto = require('crypto');

function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text, key) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Usage: encrypt sensitive fields before storing
user.phone = encrypt(user.phone, ENCRYPTION_KEY);
```

### Encryption in Transit

**TLS/HTTPS:**
- All external APIs use HTTPS
- MongoDB connections use TLS
- Internal services use TLS (service mesh)

**Nginx Config:**
```nginx
server {
  listen 443 ssl;
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
}
```

### PII Handling

**Minimize Collection:**
- Only collect data necessary for service
- Avoid storing full card numbers (use Stripe)

**Anonymization:**
```javascript
// Hash phone numbers for analytics
const hash = crypto.createHash('sha256').update(phone).digest('hex').substr(0, 16);
// Store hash instead of plaintext
```

**Data Retention:**
- Delete inactive accounts after 2 years
- Purge logs after 90 days
- Archive old transactions (not delete for compliance)

---

## Rate Limiting

### Telegram Bot

**Prevent Spam:**
```javascript
const rateLimiter = new Map();

function checkRateLimit(userId, limit = 10, window = 60000) {
  const now = Date.now();
  const userRequests = rateLimiter.get(userId) || [];
  const recent = userRequests.filter(ts => now - ts < window);
  
  if (recent.length >= limit) {
    return false; // Rate limit exceeded
  }
  
  recent.push(now);
  rateLimiter.set(userId, recent);
  return true;
}

bot.use(async (ctx, next) => {
  if (!checkRateLimit(ctx.from.id)) {
    return ctx.reply('Too many requests. Please wait.');
  }
  await next();
});
```

### API Endpoints

**Express Rate Limit:**
```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', apiLimiter);
```

### Payment Webhooks

**Idempotency:**
```javascript
// Store processed webhook IDs
const processedWebhooks = new Set();

app.post('/api/webhook/mpesa', async (req, res) => {
  const webhookId = req.body.TransID;
  
  if (processedWebhooks.has(webhookId)) {
    return res.json({ ResultCode: 0, ResultDesc: 'Already processed' });
  }
  
  // Process...
  processedWebhooks.add(webhookId);
  
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});
```

---

## Input Validation & Sanitization

### User Input

**Never trust user input:**
```javascript
const validator = require('validator');

// Validate email
if (!validator.isEmail(email)) {
  return ctx.reply('Invalid email address');
}

// Sanitize ticker
const ticker = req.query.ticker.toLowerCase().replace(/[^a-z0-9]/g, '');

// Validate amount
const amount = parseFloat(req.body.amount);
if (isNaN(amount) || amount <= 0) {
  return res.status(400).json({ error: 'Invalid amount' });
}
```

### MongoDB Injection Prevention

**Use Mongoose schemas** (automatic escaping):
```javascript
// Safe
const user = await User.findOne({ email: userInput });

// Unsafe (if using raw queries)
// db.collection.findOne({ email: { $ne: null } }); // injection
```

### Command Injection Prevention

**Avoid `exec` with user input:**
```javascript
// ❌ Dangerous
const { exec } = require('child_process');
exec(`ping ${userInput}`); // Command injection risk

// ✅ Safe: use libraries instead
const axios = require('axios');
await axios.get(`https://api.example.com/ping?host=${encodeURIComponent(userInput)}`);
```

---

## Audit Logging

### What to Log

**Security Events:**
- Admin command executions
- Failed authentication attempts
- Payment transactions
- Data exports (GDPR)
- Configuration changes

**Example:**
```javascript
async function logAdminAction(userId, action, details) {
  await AuditLog.create({
    userId,
    action,
    details,
    timestamp: new Date(),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
}

// Usage
bot.command('job_create', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('Unauthorized.');
  
  // ... create job ...
  
  await logAdminAction(ctx.from.id, 'job_create', { jobName, cron });
});
```

### Log Retention

- **Security logs**: 1 year minimum
- **Transaction logs**: 7 years (compliance)
- **Access logs**: 90 days

---

## Backup & Disaster Recovery

### MongoDB Backups

**Automated Backups:**
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
mongodump --uri="$MONGO_URI" --out="/backups/mongo-$DATE"
aws s3 cp "/backups/mongo-$DATE" "s3://crypto-hub-backups/mongo-$DATE" --recursive
```

**Backup Schedule:**
- Full backup: Daily at 02:00 UTC
- Incremental: Every 6 hours
- Retention: 30 days (daily), 1 year (monthly)

**Recovery Test:**
- Restore to staging monthly
- Document recovery steps
- RTO: 4 hours, RPO: 1 hour

### Application State

**Scheduled Jobs:**
- Jobs stored in MongoDB (backed up)
- CronJob instances recreated on restart

**Session State:**
- Stateless design (no sticky sessions)
- User state in DB only

---

## Compliance

### GDPR (EU Users)

**User Rights:**
1. **Right to Access**: Provide data export
2. **Right to Deletion**: Delete user data on request
3. **Right to Portability**: Export in machine-readable format

**Implementation:**
```javascript
bot.command('export_data', async (ctx) => {
  const userId = ctx.from.id;
  const user = await User.findOne({ telegramId: userId }).lean();
  const subscriptions = await Subscription.find({ userId }).lean();
  const transactions = await Transaction.find({ userId }).lean();
  
  const data = { user, subscriptions, transactions };
  const json = JSON.stringify(data, null, 2);
  
  // Send as file
  ctx.replyWithDocument({ source: Buffer.from(json), filename: 'my_data.json' });
});

bot.command('delete_account', async (ctx) => {
  const userId = ctx.from.id;
  await User.deleteOne({ telegramId: userId });
  await Subscription.deleteMany({ userId });
  await Transaction.deleteMany({ userId });
  ctx.reply('Your account has been deleted.');
});
```

### PCI DSS (Payment Card Data)

**Never store:**
- Full credit card numbers
- CVV codes

**Use Stripe:**
- Stripe handles PCI compliance
- Only store Stripe customer IDs
- Never pass card data through your servers

### KYC/AML (Future)

For large transactions:
- Verify user identity (Onfido, Jumio)
- Check sanctions lists
- Monitor for suspicious activity
- Report large transactions (jurisdiction-dependent)

---

## Incident Response

### Detection

**Monitoring:**
- Failed login attempts (>5 in 1 min)
- Unusual API usage patterns
- Database access from unknown IPs
- Payment failures spike

**Alerting:**
```javascript
// Example: Alert on suspicious activity
if (failedLoginAttempts > 5) {
  await sendAlert('Security', `Suspicious login attempts from ${ip}`);
}
```

### Response Plan

**Severity Levels:**
1. **Critical** (P0): Data breach, API key leaked, DDoS
2. **High** (P1): Service outage, payment issues
3. **Medium** (P2): Elevated errors, slow performance
4. **Low** (P3): Minor bugs, feature requests

**Response Steps:**
1. **Identify**: What's the impact?
2. **Contain**: Stop the bleeding (revoke keys, block IPs)
3. **Eradicate**: Fix the root cause
4. **Recover**: Restore normal operations
5. **Lessons Learned**: Post-mortem doc

**Example: API Key Leaked**
1. Revoke compromised key immediately
2. Generate new key
3. Update production secrets
4. Deploy updated app
5. Audit logs for unauthorized access
6. Notify affected users if data exposed

---

## Security Checklist

### Development
- [ ] Secrets in .env (not in code)
- [ ] .env in .gitignore
- [ ] Input validation on all user inputs
- [ ] Rate limiting on bot commands
- [ ] Parameterized queries (Mongoose)

### Deployment
- [ ] TLS certificates installed
- [ ] MongoDB auth enabled
- [ ] Firewall rules configured (allow only necessary ports)
- [ ] Secrets in vault/secrets manager
- [ ] Automated backups scheduled

### Operations
- [ ] Security logs monitored
- [ ] Alerts configured (PagerDuty)
- [ ] Incident response plan documented
- [ ] Backup restore tested
- [ ] Penetration test completed

---

## Tools & Resources

**Security Scanners:**
- [npm audit](https://docs.npmjs.com/cli/audit) — Check dependencies for vulnerabilities
- [Snyk](https://snyk.io) — Continuous vulnerability scanning
- [OWASP ZAP](https://www.zaproxy.org) — Web app pen testing

**Secret Scanning:**
- [GitGuardian](https://www.gitguardian.com) — Detect secrets in commits
- [TruffleHog](https://github.com/trufflesecurity/trufflehog) — Find leaked credentials

**Monitoring:**
- [Sentry](https://sentry.io) — Error tracking
- [Datadog](https://www.datadoghq.com) — Infrastructure monitoring

---

## Next Steps

1. Review [08-OPERATIONS.md](./08-OPERATIONS.md) for monitoring setup
2. Implement rate limiting on bot commands
3. Set up automated backups
4. Schedule security audit
