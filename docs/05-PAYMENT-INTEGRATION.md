# Payment Integration Guide — Crypto Hub Bot

## Overview

This guide covers integrating mobile money (M-Pesa, Airtel Money) and cryptocurrency payments into Crypto Hub Bot.

---

## Payment Methods Supported

1. **M-Pesa** (Kenya) — STK Push + C2B
2. **Airtel Money** (Uganda, Malawi, etc.) — Collections API
3. **Cryptocurrency** — USDT (ERC-20/TRC-20), BTC

---

## M-Pesa Integration (Kenya)

### Overview

M-Pesa provides two integration methods:
- **STK Push (Lipa Na M-Pesa)** — Initiate payment from your server
- **C2B (Customer to Business)** — User sends money manually, webhook confirms

### Prerequisites

1. **Safaricom Developer Account** — https://developer.safaricom.co.ke
2. **Daraja API Credentials**:
   - Consumer Key
   - Consumer Secret
   - Shortcode (Business Paybill or Till Number)
   - Passkey (for STK Push)
3. **Registered Callback URLs**:
   - Validation URL
   - Confirmation URL

### Environment Variables

```env
# M-Pesa Credentials
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_ENVIRONMENT=sandbox  # or 'production'

# Callback URLs
MPESA_CALLBACK_URL=https://yourdomain.com/api/webhook/mpesa/callback
MPESA_VALIDATION_URL=https://yourdomain.com/api/webhook/mpesa/validation
MPESA_CONFIRMATION_URL=https://yourdomain.com/api/webhook/mpesa/confirmation
```

---

### Implementation: STK Push

**Step 1: Get OAuth Token**

```javascript
// src/services/mpesa.js
import axios from 'axios';

const MPESA_BASE_URL = process.env.MPESA_ENVIRONMENT === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const response = await axios.get(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${auth}` }
    }
  );

  return response.data.access_token;
}
```

**Step 2: Initiate STK Push**

```javascript
async function initiateSTKPush({ phone, amount, accountReference, transactionDesc }) {
  const token = await getAccessToken();
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  
  const password = Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString('base64');

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: phone,  // Customer phone (254XXXXXXXXX)
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: accountReference || 'CryptoHub',
    TransactionDesc: transactionDesc || 'Payment'
  };

  const response = await axios.post(
    `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  return response.data;
}

export { getAccessToken, initiateSTKPush };
```

**Step 3: Handle STK Push Callback**

```javascript
// src/routes/webhooks.js
import express from 'express';
import Transaction from '../models/Transaction.js';

const router = express.Router();

router.post('/mpesa/callback', async (req, res) => {
  console.log('M-Pesa callback received:', JSON.stringify(req.body, null, 2));

  const { Body } = req.body;
  const { stkCallback } = Body;

  const resultCode = stkCallback.ResultCode;
  const checkoutRequestID = stkCallback.CheckoutRequestID;

  if (resultCode === 0) {
    // Payment successful
    const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
    const amount = callbackMetadata.find(item => item.Name === 'Amount')?.Value;
    const mpesaReceiptNumber = callbackMetadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
    const phone = callbackMetadata.find(item => item.Name === 'PhoneNumber')?.Value;

    // Update transaction
    await Transaction.updateOne(
      { reference: checkoutRequestID },
      {
        status: 'completed',
        mpesaReceiptNumber,
        completedAt: new Date()
      }
    );

    // Notify user
    // TODO: Send Telegram message to user

    console.log(`Payment successful: ${mpesaReceiptNumber}`);
  } else {
    // Payment failed
    await Transaction.updateOne(
      { reference: checkoutRequestID },
      { status: 'failed', failureReason: stkCallback.ResultDesc }
    );

    console.log(`Payment failed: ${stkCallback.ResultDesc}`);
  }

  // Acknowledge receipt
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

export default router;
```

**Step 4: Bot Integration**

```javascript
// src/bot/commands.js (extend existing)
import { initiateSTKPush } from '../services/mpesa.js';
import Transaction from '../models/Transaction.js';

bot.command('pay', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  const [amountStr, phone] = args;

  if (!amountStr || !phone) {
    return ctx.reply('Usage: /pay <amount> <phone>\nExample: /pay 100 254712345678');
  }

  const amount = parseInt(amountStr);
  if (isNaN(amount) || amount < 10) {
    return ctx.reply('Amount must be at least 10 KES');
  }

  try {
    // Create transaction record
    const transaction = await Transaction.create({
      userId: ctx.from.id,
      provider: 'mpesa',
      phone,
      amount,
      currency: 'KES',
      status: 'pending'
    });

    // Initiate STK push
    const result = await initiateSTKPush({
      phone,
      amount,
      accountReference: `USER${ctx.from.id}`,
      transactionDesc: 'Crypto Hub Subscription'
    });

    // Store checkout request ID
    transaction.reference = result.CheckoutRequestID;
    await transaction.save();

    ctx.reply(
      `Payment request sent to ${phone}.\n\n` +
      `Enter your M-Pesa PIN to complete the payment.\n` +
      `You'll receive a confirmation shortly.`
    );
  } catch (error) {
    console.error('STK Push error:', error);
    ctx.reply('Payment initiation failed. Please try again.');
  }
});
```

---

## Airtel Money Integration

### Prerequisites

1. **Airtel Developer Account** — https://developers.airtel.africa
2. **API Credentials**:
   - Client ID
   - Client Secret
   - API Key
3. **Callback URL** for payment notifications

### Environment Variables

```env
AIRTEL_CLIENT_ID=your_client_id
AIRTEL_CLIENT_SECRET=your_client_secret
AIRTEL_API_KEY=your_api_key
AIRTEL_ENVIRONMENT=staging  # or 'production'
AIRTEL_CALLBACK_URL=https://yourdomain.com/api/webhook/airtel/callback
```

---

### Implementation: Collection Request

**Step 1: Get OAuth Token**

```javascript
// src/services/airtel.js
import axios from 'axios';

const AIRTEL_BASE_URL = process.env.AIRTEL_ENVIRONMENT === 'production'
  ? 'https://openapi.airtel.africa'
  : 'https://openapiuat.airtel.africa';

async function getAirtelToken() {
  const response = await axios.post(
    `${AIRTEL_BASE_URL}/auth/oauth2/token`,
    {
      client_id: process.env.AIRTEL_CLIENT_ID,
      client_secret: process.env.AIRTEL_CLIENT_SECRET,
      grant_type: 'client_credentials'
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.access_token;
}
```

**Step 2: Initiate Collection**

```javascript
async function initiateAirtelCollection({ phone, amount, country = 'UG', reference }) {
  const token = await getAirtelToken();
  const transactionId = `CRYPTOHUB_${Date.now()}`;

  const payload = {
    reference: reference || transactionId,
    subscriber: {
      country: country,
      currency: country === 'UG' ? 'UGX' : 'MWK',
      msisdn: phone  // 256XXXXXXXXX for Uganda
    },
    transaction: {
      amount: amount,
      country: country,
      currency: country === 'UG' ? 'UGX' : 'MWK',
      id: transactionId
    }
  };

  const response = await axios.post(
    `${AIRTEL_BASE_URL}/merchant/v1/payments/`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Country': country,
        'X-Currency': payload.transaction.currency,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}

export { getAirtelToken, initiateAirtelCollection };
```

**Step 3: Handle Callback**

```javascript
// src/routes/webhooks.js
router.post('/airtel/callback', async (req, res) => {
  console.log('Airtel callback:', JSON.stringify(req.body, null, 2));

  const { transaction } = req.body;
  
  if (transaction.status === 'TS') {
    // Transaction successful
    await Transaction.updateOne(
      { reference: transaction.id },
      {
        status: 'completed',
        airtelTransactionId: transaction.airtel_money_id,
        completedAt: new Date()
      }
    );

    // Notify user
    console.log(`Airtel payment successful: ${transaction.id}`);
  } else {
    await Transaction.updateOne(
      { reference: transaction.id },
      { status: 'failed', failureReason: transaction.message }
    );
  }

  res.json({ status: 'OK' });
});
```

---

## Cryptocurrency Payments

### Deposit Address Display

Already implemented in `src/bot/commands.js`:

```javascript
bot.command('deposit', async (ctx) => {
  const text = `Deposit options:\n\n` +
    `📌 *USDT (ERC20 / TRC20)*: \`${CRYPTO.usdt}\`\n` +
    `📌 *BTC*: \`${CRYPTO.btc}\`\n\n` +
    `Send your deposit and then use /confirm_deposit <amount> <txid>`;

  await ctx.replyWithMarkdown(text);
});
```

### Manual Reconciliation (Current)

Users send crypto, then confirm via bot:

```javascript
bot.command('confirm_deposit', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  const [amount, txid] = args;

  if (!amount || !txid) {
    return ctx.reply('Usage: /confirm_deposit <amount> <transaction_id>');
  }

  await Transaction.create({
    userId: ctx.from.id,
    provider: 'crypto',
    amount: parseFloat(amount),
    reference: txid,
    status: 'pending'
  });

  ctx.reply(
    'Your deposit has been recorded.\n\n' +
    'Our team will verify the transaction and credit your account within 30 minutes.'
  );

  // TODO: Alert admin for manual verification
});
```

### Automated Verification (Future)

**Option 1: Blockchain APIs**
- Use Etherscan API (USDT) or Blockchain.info (BTC)
- Poll for incoming transactions
- Match transaction amount and recipient address

**Option 2: Webhook Services**
- Use services like Alchemy, BlockCypher
- Receive webhooks for address activity
- Automatically reconcile transactions

**Example: Etherscan API Check**

```javascript
import axios from 'axios';

async function verifyUSDTDeposit(txHash, expectedAmount) {
  const response = await axios.get(
    'https://api.etherscan.io/api',
    {
      params: {
        module: 'account',
        action: 'tokentx',
        contractaddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
        address: process.env.CRYPTO_USDT_ADDRESS,
        apikey: process.env.ETHERSCAN_API_KEY
      }
    }
  );

  const tx = response.data.result.find(t => t.hash === txHash);
  if (!tx) return { verified: false, reason: 'Transaction not found' };

  const amount = parseInt(tx.value) / 1e6; // USDT has 6 decimals
  if (amount < expectedAmount) {
    return { verified: false, reason: 'Amount mismatch' };
  }

  return { verified: true, amount, confirmations: tx.confirmations };
}
```

---

## Transaction Reconciliation

### Manual Reconciliation (Admin)

```javascript
bot.command('reconcile', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('Unauthorized.');

  const pendingTransactions = await Transaction.find({ status: 'pending' })
    .populate('userId')
    .limit(20);

  if (!pendingTransactions.length) {
    return ctx.reply('No pending transactions.');
  }

  let message = '*Pending Transactions*\n\n';
  pendingTransactions.forEach((tx, i) => {
    message += `${i + 1}. ${tx.provider.toUpperCase()} - ${tx.amount} ${tx.currency}\n`;
    message += `   User: ${tx.userId?.name || 'Unknown'}\n`;
    message += `   Ref: ${tx.reference}\n`;
    message += `   /approve_${tx._id} or /reject_${tx._id}\n\n`;
  });

  ctx.replyWithMarkdown(message);
});

bot.hears(/^\/approve_(.+)$/, async (ctx) => {
  if (!isAdmin(ctx)) return;
  
  const txId = ctx.match[1];
  const tx = await Transaction.findById(txId);
  
  if (!tx) return ctx.reply('Transaction not found.');

  tx.status = 'completed';
  tx.completedAt = new Date();
  await tx.save();

  // Upgrade user plan
  await User.updateOne({ _id: tx.userId }, { plan: 'premium' });

  ctx.reply(`Transaction approved. User upgraded to premium.`);
});
```

---

## Testing Payments

### M-Pesa Sandbox

**Test Credentials:**
- Shortcode: 174379
- Initiator Name: testapi
- Security Credential: (provided in sandbox)
- Test phone: 254708374149

**Test Flow:**
```bash
# 1. Initiate STK push via bot
/pay 100 254708374149

# 2. In sandbox, transaction auto-completes after 30 seconds
# 3. Check callback logs
```

### Airtel Staging

Use Airtel's test environment with staging credentials.

---

## Security Best Practices

### Webhook Validation

**M-Pesa:**
```javascript
// Validate M-Pesa IP whitelist
const MPESA_IPS = ['196.201.214.200', '196.201.214.206'];

function validateMpesaWebhook(req, res, next) {
  const clientIp = req.ip || req.connection.remoteAddress;
  if (!MPESA_IPS.includes(clientIp)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

router.post('/mpesa/callback', validateMpesaWebhook, async (req, res) => {
  // ...
});
```

### Prevent Double-Spend

```javascript
// Use idempotency keys
const processed = await Transaction.findOne({ reference: mpesaReceiptNumber });
if (processed) {
  return res.json({ ResultCode: 0, ResultDesc: 'Already processed' });
}
```

### Amount Validation

```javascript
// Validate amount matches expected
if (Math.abs(tx.amount - callbackAmount) > 0.01) {
  // Log discrepancy
  console.error('Amount mismatch:', { expected: tx.amount, received: callbackAmount });
}
```

---

## Monitoring & Alerts

### Key Metrics

- Payment success rate
- Average reconciliation time
- Failed transactions (by reason)
- Revenue per payment method

### Alerts

```javascript
// Alert on high failure rate
const recentTx = await Transaction.find({
  createdAt: { $gte: new Date(Date.now() - 3600000) }
});

const failureRate = recentTx.filter(tx => tx.status === 'failed').length / recentTx.length;

if (failureRate > 0.2) {
  // Alert admin
  await sendAlert('Payments', `High failure rate: ${(failureRate * 100).toFixed(1)}%`);
}
```

---

## Next Steps

1. Set up payment provider accounts (M-Pesa, Airtel)
2. Implement webhook endpoints
3. Test in sandbox/staging
4. Monitor transaction flow
5. Set up reconciliation alerts
6. Consider automated crypto verification via blockchain APIs
