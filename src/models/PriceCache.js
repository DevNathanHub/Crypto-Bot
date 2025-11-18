import mongoose from 'mongoose';

const PriceCacheSchema = new mongoose.Schema({
  ticker: { type: String, required: true, index: true },
  price: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now, index: true }
});

export default mongoose.model('PriceCache', PriceCacheSchema);
