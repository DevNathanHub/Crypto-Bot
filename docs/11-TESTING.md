# Testing Guide — Crypto Hub Bot

## Overview

This guide covers testing strategies, tools, and best practices for Crypto Hub Bot.

---

## Testing Stack

- **Jest** — Test framework and assertion library
- **Supertest** — HTTP API testing
- **MongoDB Memory Server** — In-memory database for tests
- **Nock** — HTTP mocking for external APIs

---

## Setup

### Install Dependencies

```bash
npm install --save-dev jest supertest mongodb-memory-server nock @jest/globals
```

### Jest Configuration

Create `jest.config.js`:

```javascript
export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/config.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 10000
};
```

### Test Setup File

Create `__tests__/setup.js`:

```javascript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

// Before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
});

// After each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});

// After all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

### Update package.json

```json
{
  "scripts": {
    "test": "NODE_OPTIONS=--experimental-vm-modules jest",
    "test:watch": "NODE_OPTIONS=--experimental-vm-modules jest --watch",
    "test:coverage": "NODE_OPTIONS=--experimental-vm-modules jest --coverage"
  }
}
```

---

## Unit Tests

### Testing Models

```javascript
// __tests__/models/User.test.js
import { jest } from '@jest/globals';
import User from '../../src/models/User.js';

describe('User Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid user', async () => {
      const userData = {
        telegramId: 123456789,
        name: 'John Doe',
        plan: 'free'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.telegramId).toBe(userData.telegramId);
      expect(savedUser.plan).toBe('free');
    });

    it('should require telegramId', async () => {
      const user = new User({ name: 'John' });
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should enforce unique telegramId', async () => {
      const userData = { telegramId: 123456789, name: 'John' };
      
      await User.create(userData);
      
      await expect(User.create(userData)).rejects.toThrow(/duplicate key/i);
    });

    it('should default plan to free', async () => {
      const user = await User.create({
        telegramId: 123456789,
        name: 'John'
      });

      expect(user.plan).toBe('free');
    });
  });

  describe('Methods', () => {
    it('should check if user is premium', async () => {
      const freeUser = await User.create({
        telegramId: 123456789,
        plan: 'free'
      });

      const premiumUser = await User.create({
        telegramId: 987654321,
        plan: 'premium'
      });

      expect(freeUser.isPremium()).toBe(false);
      expect(premiumUser.isPremium()).toBe(true);
    });
  });
});
```

### Testing Services

```javascript
// __tests__/services/priceFetcher.test.js
import { jest } from '@jest/globals';
import nock from 'nock';
import { fetchTopCoinPrices, fetchCoinPrice } from '../../src/services/priceFetcher.js';

describe('Price Fetcher Service', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('fetchTopCoinPrices', () => {
    it('should fetch prices for multiple coins', async () => {
      const mockResponse = {
        bitcoin: { usd: 50000, usd_24h_change: 2.5 },
        ethereum: { usd: 3000, usd_24h_change: -1.2 },
        binancecoin: { usd: 400, usd_24h_change: 0.5 }
      };

      nock('https://api.coingecko.com')
        .get('/api/v3/simple/price')
        .query(true)
        .reply(200, mockResponse);

      const prices = await fetchTopCoinPrices();

      expect(prices).toHaveProperty('btc');
      expect(prices.btc.usd).toBe(50000);
      expect(prices.eth.usd).toBe(3000);
    });

    it('should handle API errors gracefully', async () => {
      nock('https://api.coingecko.com')
        .get('/api/v3/simple/price')
        .query(true)
        .reply(500, { error: 'Internal Server Error' });

      const prices = await fetchTopCoinPrices();

      expect(prices).toEqual({});
    });

    it('should retry on network failure', async () => {
      nock('https://api.coingecko.com')
        .get('/api/v3/simple/price')
        .query(true)
        .replyWithError('Network error')
        .get('/api/v3/simple/price')
        .query(true)
        .reply(200, {
          bitcoin: { usd: 50000, usd_24h_change: 2.5 }
        });

      const prices = await fetchTopCoinPrices();

      expect(prices.btc).toBeDefined();
    });
  });

  describe('fetchCoinPrice', () => {
    it('should fetch single coin price', async () => {
      nock('https://api.coingecko.com')
        .get('/api/v3/simple/price')
        .query({ ids: 'bitcoin', vs_currencies: 'usd', include_24hr_change: 'true' })
        .reply(200, {
          bitcoin: { usd: 50000, usd_24h_change: 2.5 }
        });

      const price = await fetchCoinPrice('bitcoin');

      expect(price).toBeDefined();
      expect(price.usd).toBe(50000);
    });
  });
});
```

### Testing Utilities

```javascript
// __tests__/utils/paymentContacts.test.js
import { jest } from '@jest/globals';
import { getMobileContact } from '../../src/utils/paymentContacts.js';

describe('Payment Contacts Utility', () => {
  it('should return M-Pesa contact for Kenya', () => {
    const contact = getMobileContact('KE');

    expect(contact.provider).toBe('M-Pesa');
    expect(contact.number).toMatch(/^254\d{9}$/);
  });

  it('should return Airtel contact for Uganda', () => {
    const contact = getMobileContact('UG');

    expect(contact.provider).toBe('Airtel Money');
    expect(contact.number).toMatch(/^256\d{9}$/);
  });

  it('should return Airtel contact for Malawi', () => {
    const contact = getMobileContact('MW');

    expect(contact.provider).toBe('Airtel Money');
    expect(contact.number).toMatch(/^265\d{9}$/);
  });

  it('should use default country for unknown code', () => {
    const contact = getMobileContact('US');

    expect(contact).toBeDefined();
    expect(contact.provider).toMatch(/M-Pesa|Airtel Money/);
  });

  it('should normalize E.164 format', () => {
    const contact = getMobileContact('KE');

    expect(contact.number).not.toContain('+');
    expect(contact.number).not.toContain(' ');
    expect(contact.number).not.toContain('-');
  });
});
```

---

## Integration Tests

### Testing API Endpoints

```javascript
// __tests__/routes/api.test.js
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import apiRouter from '../../src/routes/api.js';
import User from '../../src/models/User.js';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

describe('API Routes', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/prices', () => {
    it('should return crypto prices', async () => {
      const response = await request(app)
        .get('/api/prices')
        .expect(200);

      expect(response.body).toHaveProperty('btc');
      expect(response.body.btc).toHaveProperty('usd');
    });
  });

  describe('POST /api/subscribe', () => {
    it('should create subscription', async () => {
      const subscriptionData = {
        telegramId: 123456789,
        email: 'test@example.com',
        plan: 'premium'
      };

      const response = await request(app)
        .post('/api/subscribe')
        .send(subscriptionData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('subscription');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .send({
          telegramId: 123456789,
          email: 'invalid-email',
          plan: 'premium'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
```

### Testing Bot Commands

```javascript
// __tests__/bot/commands.test.js
import { jest } from '@jest/globals';
import { Telegraf } from 'telegraf';
import User from '../../src/models/User.js';

// Mock Telegraf
const mockReply = jest.fn();
const mockReplyWithMarkdown = jest.fn();

const createMockContext = (command, from = {}) => ({
  message: {
    text: command,
    from: { id: 123456789, ...from }
  },
  from: { id: 123456789, ...from },
  reply: mockReply,
  replyWithMarkdown: mockReplyWithMarkdown
});

describe('Bot Commands', () => {
  beforeEach(() => {
    mockReply.mockClear();
    mockReplyWithMarkdown.mockClear();
  });

  describe('/start command', () => {
    it('should greet new users', async () => {
      const ctx = createMockContext('/start', { first_name: 'John' });

      // Import and execute command handler
      const { handleStart } = await import('../../src/bot/commands.js');
      await handleStart(ctx);

      expect(mockReply).toHaveBeenCalledWith(
        expect.stringContaining('Welcome')
      );
    });

    it('should create user in database', async () => {
      const ctx = createMockContext('/start', {
        id: 987654321,
        first_name: 'Jane'
      });

      const { handleStart } = await import('../../src/bot/commands.js');
      await handleStart(ctx);

      const user = await User.findOne({ telegramId: 987654321 });
      expect(user).toBeDefined();
      expect(user.name).toBe('Jane');
    });
  });

  describe('/prices command', () => {
    it('should return formatted prices', async () => {
      const ctx = createMockContext('/prices');

      const { handlePrices } = await import('../../src/bot/commands.js');
      await handlePrices(ctx);

      expect(mockReplyWithMarkdown).toHaveBeenCalledWith(
        expect.stringContaining('BTC')
      );
    });
  });

  describe('/deposit command', () => {
    it('should show crypto addresses', async () => {
      const ctx = createMockContext('/deposit');

      const { handleDeposit } = await import('../../src/bot/commands.js');
      await handleDeposit(ctx);

      expect(mockReplyWithMarkdown).toHaveBeenCalledWith(
        expect.stringContaining('USDT')
      );
      expect(mockReplyWithMarkdown).toHaveBeenCalledWith(
        expect.stringContaining('BTC')
      );
    });
  });
});
```

---

## Mocking External APIs

### Mocking Gemini API

```javascript
// __tests__/services/geminiClient.test.js
import { jest } from '@jest/globals';

// Mock @google/generative-ai module
const mockGenerateContent = jest.fn();

jest.unstable_mockModule('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: mockGenerateContent
    }))
  }))
}));

const { generateOneLineSummary } = await import('../../src/services/geminiClient.js');

describe('Gemini Client', () => {
  beforeEach(() => {
    mockGenerateContent.mockClear();
  });

  it('should generate market summary', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Bitcoin surges past $50K as bulls dominate the market.'
      }
    });

    const priceData = {
      btc: { usd: 50000, change_24h: 5 },
      eth: { usd: 3000, change_24h: 3 }
    };

    const summary = await generateOneLineSummary(priceData);

    expect(summary).toContain('Bitcoin');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('should return fallback on API error', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API Error'));

    const priceData = {
      btc: { usd: 50000, change_24h: 5 }
    };

    const summary = await generateOneLineSummary(priceData);

    expect(summary).toBeDefined();
    expect(summary).toContain('BTC');
  });
});
```

### Mocking M-Pesa API

```javascript
// __tests__/services/mpesa.test.js
import { jest } from '@jest/globals';
import nock from 'nock';
import { initiateSTKPush } from '../../src/services/mpesa.js';

describe('M-Pesa Service', () => {
  beforeEach(() => {
    // Mock OAuth token endpoint
    nock('https://sandbox.safaricom.co.ke')
      .get('/oauth/v1/generate')
      .query(true)
      .reply(200, { access_token: 'mock_token' });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should initiate STK push successfully', async () => {
    nock('https://sandbox.safaricom.co.ke')
      .post('/mpesa/stkpush/v1/processrequest')
      .reply(200, {
        MerchantRequestID: 'mock-merchant-123',
        CheckoutRequestID: 'mock-checkout-456',
        ResponseCode: '0',
        ResponseDescription: 'Success'
      });

    const result = await initiateSTKPush({
      phone: '254712345678',
      amount: 100,
      accountReference: 'TEST123',
      transactionDesc: 'Test Payment'
    });

    expect(result.ResponseCode).toBe('0');
    expect(result.CheckoutRequestID).toBeDefined();
  });

  it('should handle API errors', async () => {
    nock('https://sandbox.safaricom.co.ke')
      .post('/mpesa/stkpush/v1/processrequest')
      .reply(400, { errorMessage: 'Invalid request' });

    await expect(initiateSTKPush({
      phone: '254712345678',
      amount: 100
    })).rejects.toThrow();
  });
});
```

---

## E2E Testing

### Testing Complete User Flows

```javascript
// __tests__/e2e/subscription-flow.test.js
import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import User from '../../src/models/User.js';
import Transaction from '../../src/models/Transaction.js';

describe('E2E: Subscription Flow', () => {
  it('should complete full subscription journey', async () => {
    const telegramId = 123456789;

    // 1. User starts bot
    const user = await User.create({
      telegramId,
      name: 'Test User',
      plan: 'free'
    });

    expect(user.plan).toBe('free');

    // 2. User initiates payment
    const transaction = await Transaction.create({
      userId: user._id,
      provider: 'mpesa',
      phone: '254712345678',
      amount: 500,
      currency: 'KES',
      status: 'pending',
      reference: 'TEST123'
    });

    expect(transaction.status).toBe('pending');

    // 3. Webhook confirms payment
    await request(app)
      .post('/api/webhook/mpesa/callback')
      .send({
        Body: {
          stkCallback: {
            ResultCode: 0,
            CheckoutRequestID: 'TEST123',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 500 },
                { Name: 'MpesaReceiptNumber', Value: 'ABC123' },
                { Name: 'PhoneNumber', Value: '254712345678' }
              ]
            }
          }
        }
      })
      .expect(200);

    // 4. Verify transaction updated
    const updatedTx = await Transaction.findById(transaction._id);
    expect(updatedTx.status).toBe('completed');

    // 5. Verify user upgraded (manual step in real app)
    await User.updateOne({ _id: user._id }, { plan: 'premium' });
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.plan).toBe('premium');
  });
});
```

---

## Test Coverage

### Run Coverage Report

```bash
npm run test:coverage
```

### Coverage Report Example

```
-----------------------|---------|----------|---------|---------|
File                   | % Stmts | % Branch | % Funcs | % Lines |
-----------------------|---------|----------|---------|---------|
All files              |   85.23 |    78.45 |   82.67 |   85.89 |
 models/               |   92.15 |    85.33 |   90.00 |   92.15 |
  User.js              |   95.00 |    88.89 |   92.31 |   95.00 |
  Transaction.js       |   89.29 |    81.82 |   87.50 |   89.29 |
 services/             |   81.42 |    74.29 |   78.57 |   82.14 |
  priceFetcher.js      |   88.24 |    80.00 |   85.71 |   88.24 |
  geminiClient.js      |   74.60 |    68.57 |   71.43 |   75.00 |
 utils/                |   95.00 |    90.00 |   95.00 |   95.00 |
  paymentContacts.js   |   95.00 |    90.00 |   95.00 |   95.00 |
-----------------------|---------|----------|---------|---------|
```

### Improving Coverage

```javascript
// Add tests for uncovered branches
it('should handle edge case', () => {
  // Test previously uncovered if/else branch
});

// Add tests for error paths
it('should handle exceptions', async () => {
  // Test catch blocks
});
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Run Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v3

    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm test

    - name: Generate coverage
      run: npm run test:coverage

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

---

## Best Practices

### 1. Test Organization

```
__tests__/
├── setup.js              # Global test setup
├── unit/
│   ├── models/
│   ├── services/
│   └── utils/
├── integration/
│   ├── api/
│   └── bot/
└── e2e/
    └── flows/
```

### 2. Test Naming

```javascript
// ✅ Good: Descriptive test names
it('should create user with default free plan', () => {});
it('should reject duplicate telegramId', () => {});

// ❌ Bad: Vague test names
it('works', () => {});
it('test user creation', () => {});
```

### 3. Arrange-Act-Assert Pattern

```javascript
it('should calculate total price', () => {
  // Arrange
  const items = [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 1 }
  ];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(250);
});
```

### 4. Isolated Tests

```javascript
// Each test should be independent
beforeEach(async () => {
  // Clean database
  await User.deleteMany({});
});

it('test 1', async () => {
  // This test doesn't affect test 2
});

it('test 2', async () => {
  // Fresh state for this test
});
```

### 5. Mock External Dependencies

```javascript
// Don't make real API calls in tests
jest.mock('axios');
axios.get.mockResolvedValue({ data: mockData });
```

---

## Debugging Tests

### Run Single Test

```bash
npm test -- User.test.js
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="should create user"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

---

## Performance Testing

### Load Testing with Artillery

```bash
npm install --save-dev artillery
```

Create `artillery.yml`:

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"

scenarios:
  - name: "Health check"
    flow:
      - get:
          url: "/api/health"
  
  - name: "Get prices"
    flow:
      - get:
          url: "/api/prices"
```

Run load test:

```bash
npx artillery run artillery.yml
```

---

## Next Steps

1. Install testing dependencies
2. Create test directory structure
3. Write unit tests for models
4. Write integration tests for API
5. Set up GitHub Actions CI
6. Achieve >80% code coverage
7. Add E2E tests for critical flows
