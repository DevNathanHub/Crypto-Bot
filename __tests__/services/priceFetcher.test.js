import { jest } from '@jest/globals';
import nock from 'nock';
import { fetchTopCoinPrices, fetchCoinPrice } from '../../src/services/priceFetcher.js';

describe('Price Fetcher Service', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('fetchTopCoinPrices', () => {
    it('should fetch prices for top cryptocurrencies', async () => {
      const mockResponse = {
        bitcoin: { 
          usd: 50000, 
          usd_24h_change: 2.5 
        },
        ethereum: { 
          usd: 3000, 
          usd_24h_change: -1.2 
        },
        binancecoin: { 
          usd: 400, 
          usd_24h_change: 0.5 
        },
        solana: { 
          usd: 150, 
          usd_24h_change: 5.2 
        },
        cardano: { 
          usd: 0.50, 
          usd_24h_change: -0.8 
        }
      };

      nock('https://api.coingecko.com')
        .get('/api/v3/simple/price')
        .query(true)
        .reply(200, mockResponse);

      const prices = await fetchTopCoinPrices();

      expect(prices).toHaveProperty('btc');
      expect(prices).toHaveProperty('eth');
      expect(prices).toHaveProperty('bnb');
      
      expect(prices.btc.usd).toBe(50000);
      expect(prices.btc.change_24h).toBe(2.5);
      
      expect(prices.eth.usd).toBe(3000);
      expect(prices.eth.change_24h).toBe(-1.2);
    });

    it('should handle API errors gracefully', async () => {
      nock('https://api.coingecko.com')
        .get('/api/v3/simple/price')
        .query(true)
        .reply(500, { error: 'Internal Server Error' });

      const prices = await fetchTopCoinPrices();

      // Should return empty object or cached data
      expect(prices).toBeDefined();
      expect(typeof prices).toBe('object');
    });

    it('should handle network failures', async () => {
      nock('https://api.coingecko.com')
        .get('/api/v3/simple/price')
        .query(true)
        .replyWithError('Network connection failed');

      const prices = await fetchTopCoinPrices();

      expect(prices).toBeDefined();
      expect(typeof prices).toBe('object');
    });

    it('should format response correctly', async () => {
      const mockResponse = {
        bitcoin: { usd: 50000, usd_24h_change: 2.5 }
      };

      nock('https://api.coingecko.com')
        .get('/api/v3/simple/price')
        .query(true)
        .reply(200, mockResponse);

      const prices = await fetchTopCoinPrices();

      expect(prices.btc).toHaveProperty('usd');
      expect(prices.btc).toHaveProperty('change_24h');
      expect(typeof prices.btc.usd).toBe('number');
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
      expect(price.change_24h).toBe(2.5);
    });

    it('should return null for invalid coin', async () => {
      nock('https://api.coingecko.com')
        .get('/api/v3/simple/price')
        .query(true)
        .reply(200, {});

      const price = await fetchCoinPrice('invalid-coin');

      expect(price).toBeNull();
    });

    it('should handle API rate limiting', async () => {
      nock('https://api.coingecko.com')
        .get('/api/v3/simple/price')
        .query(true)
        .reply(429, { error: 'Rate limit exceeded' });

      const price = await fetchCoinPrice('bitcoin');

      expect(price).toBeNull();
    });
  });
});
