import mongoose from 'mongoose';

const ChannelMessageSchema = new mongoose.Schema({
  title: String,
  content: String,
  type: String,
  postedAt: Date,
  geminiPrompt: String,
  telegramMessageId: Number,
  telegramChatId: String,
  analytics: {
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    reactions: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('ChannelMessage', ChannelMessageSchema);
