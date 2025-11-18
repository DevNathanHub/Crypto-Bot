import express from 'express';
import fetchPrice from '../services/priceFetcher.js';

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

router.get('/prices', async (req, res) => {
  const { ticker = 'bitcoin' } = req.query;
  try {
    const price = await fetchPrice(ticker);
    res.json({ ticker, price });
  } catch (err) {
    res.status(500).json({ error: 'price_fetch_failed', detail: err.message });
  }
});

export default router;
