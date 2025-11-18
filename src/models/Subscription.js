import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ticker: { type: String, required: true },
  threshold: {
    type: { type: String, enum: ['above', 'below'], default: 'above' },
    value: { type: Number }
  },
  notifyChannels: [String],
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Subscription', SubscriptionSchema);
