import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ticker: { type: String },
  type: { type: String },
  message: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed },
  deliveredAt: { type: Date },
  status: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending' }
});

export default mongoose.model('Alert', AlertSchema);
