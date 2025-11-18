import mongoose from 'mongoose';

const ScheduledJobSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cron: { type: String, required: true },
  timezone: { type: String, default: 'Europe/London' },
  channelId: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  enabled: { type: Boolean, default: true },
  lastRunAt: Date,
  nextRunAt: Date,
  runCount: { type: Number, default: 0 },
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  concurrencyKey: String,
  retryPolicy: {
    retries: { type: Number, default: 2 },
    backoffSec: { type: Number, default: 30 }
  }
});

export default mongoose.model('ScheduledJob', ScheduledJobSchema);
