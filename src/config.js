import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 3000;
export const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crypto-hub';
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

// Support multiple channels (JSON array or comma-separated)
let channelIds = process.env.TELEGRAM_CHANNEL_IDS || process.env.TELEGRAM_CHANNEL_ID || '';

// Try parsing as JSON array first
try {
  if (channelIds.startsWith('[')) {
    channelIds = JSON.parse(channelIds);
  } else if (typeof channelIds === 'string') {
    // Parse as comma-separated string
    channelIds = channelIds.split(',').map(id => id.trim()).filter(Boolean);
  }
} catch (err) {
  console.error('[Config] Failed to parse TELEGRAM_CHANNEL_IDS, falling back to empty array:', err.message);
  channelIds = [];
}

export const TELEGRAM_CHANNEL_IDS = Array.isArray(channelIds) ? channelIds : [channelIds].filter(Boolean);
export const TELEGRAM_CHANNEL_ID = TELEGRAM_CHANNEL_IDS[0] || ''; // For backward compatibility

export const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '';
export const BASE_URL = process.env.BASE_URL || 'https://crypto.loopnet.tech';

// Crypto deposit addresses
export const CRYPTO = {
	usdt: process.env.CRYPTO_USDT_ADDRESS || '',
	btc: process.env.CRYPTO_BTC_ADDRESS || ''
};

// Mobile money numbers in E.164 (no leading +)
export const MOBILE_NUMBERS = {
	mpesa_ke: process.env.MPESA_NUMBER_KE || '',
	airtel_ug: process.env.AIRTEL_NUMBER_UG || '',
	airtel_mw: process.env.AIRTEL_NUMBER_MW || ''
};

export const DEFAULT_PAYMENT_COUNTRY = process.env.DEFAULT_PAYMENT_COUNTRY || 'KE';
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const STRIPE_SECRET = process.env.STRIPE_SECRET || '';
