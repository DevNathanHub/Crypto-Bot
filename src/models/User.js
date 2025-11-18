import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  channels: { type: mongoose.Schema.Types.Mixed },
  plan: { type: String, enum: ['free', 'premium'], default: 'free' },
  preferences: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', UserSchema);
