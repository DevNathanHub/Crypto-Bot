import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  provider: String,
  phone: String,
  payee: String,
  amount: Number,
  currency: String,
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  reference: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Transaction', TransactionSchema);
