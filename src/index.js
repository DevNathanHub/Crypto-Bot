import mongoose from 'mongoose';
import { MONGO_URI, PORT } from './config.js';
import startServer from './server.js';
import startScheduler from './cron/scheduler.js';
import startTelegram from './services/telegramBot.js';

async function main() {
  // MongoDB connection with timeout and retry
  try {
    console.log('[MongoDB] Connecting to database...');
    await mongoose.connect(MONGO_URI, { 
      dbName: 'crypto-hub',
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      connectTimeoutMS: 10000 // 10 seconds connection timeout
    });
    console.log('[MongoDB] Connected successfully');
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
    console.error('[MongoDB] Please check your MONGO_URI and internet connection');
    process.exit(1);
  }

  const server = startServer(PORT);
  
  // Start Telegram with error handling (won't crash app if it fails)
  console.log('[Telegram] Starting bot...');
  startTelegram();
  
  // Start scheduler
  console.log('[Scheduler] Starting cron jobs...');
  startScheduler();

  process.on('SIGINT', async () => {
    console.log('\n[App] Shutting down gracefully...');
    await mongoose.disconnect();
    server.close(() => {
      console.log('[App] Shutdown complete');
      process.exit(0);
    });
  });
}

console.log('[App] Starting Crypto Hub Bot...');
console.log('[App] Node version:', process.version);
console.log('[App] Environment: development\n');

main();
