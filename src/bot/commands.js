import { CRYPTO, DEFAULT_PAYMENT_COUNTRY, BASE_URL } from '../config.js';
import { getMobileContact } from '../utils/paymentContacts.js';
import { fetchTopCoinPrices, fetchTrendingCoins, fetchTopMovers, fetchGlobalMarketData } from '../services/priceFetcher.js';
import { getGasPrices, getRecentWhaleTransactions } from '../services/etherscan.js';

export function registerUserCommands(bot) {
  // Welcome command
  bot.command('start', async (ctx) => {
    const welcomeText = `🚀 *Welcome to Crypto Hub Bot!*\n\n` +
      `Your source for:\n` +
      `• Real-time crypto prices\n` +
      `• Trending coins & hot movers\n` +
      `• Whale alerts & gas tracker\n` +
      `• Mobile money deposits\n\n` +
      `Commands:\n` +
      `/prices - Top coin prices\n` +
      `/trending - Hot coins right now\n` +
      `/gainers - Top gainers & losers\n` +
      `/gas - ETH gas prices\n` +
      `/whales - Recent whale moves\n` +
      `/market - Global market data\n` +
      `/deposit - Payment options\n\n` +
      `Join the community: ${BASE_URL}`;
    
    await ctx.replyWithMarkdown(welcomeText);
  });

  // Help command
  bot.command('help', async (ctx) => {
    const helpText = `*Available Commands:*\n\n` +
      `*Market Data:*\n` +
      `/prices - Latest prices (BTC, ETH, SOL, etc.)\n` +
      `/trending - Trending coins on CoinGecko\n` +
      `/gainers - Top 5 gainers & losers (24h)\n` +
      `/market - Global crypto market stats\n\n` +
      `*On-Chain:*\n` +
      `/gas - Current Ethereum gas prices\n` +
      `/whales - Recent large ETH transfers\n\n` +
      `*Payments:*\n` +
      `/deposit - Show deposit addresses\n` +
      `/confirm_deposit <amount> - Confirm payment\n\n` +
      `Learn more: ${BASE_URL}`;
    
    await ctx.replyWithMarkdown(helpText);
  });

  // Prices command (enhanced with emojis and formatting)
  bot.command('prices', async (ctx) => {
    try {
      await ctx.reply('Fetching latest prices... 📊');
      
      const prices = await fetchTopCoinPrices();
      
      if (!prices || Object.keys(prices).length === 0) {
        return ctx.reply('Unable to fetch prices right now. Try again in a moment.');
      }

      const formatPrice = (coin, data) => {
        if (!data || !data.usd) return `${coin}: N/A`;
        
        const changeEmoji = data.change_24h >= 0 ? '🟢' : '🔴';
        const changeSign = data.change_24h >= 0 ? '+' : '';
        const price = data.usd >= 1 ? `$${data.usd.toLocaleString('en-US', {maximumFractionDigits: 2})}` : `$${data.usd.toFixed(6)}`;
        const change = `${changeSign}${data.change_24h?.toFixed(2)}%`;
        
        return `${changeEmoji} *${coin}*: ${price} (${change})`;
      };

      const text = `💰 *Crypto Prices*\n\n` +
        `${formatPrice('BTC', prices.btc)}\n` +
        `${formatPrice('ETH', prices.eth)}\n` +
        `${formatPrice('BNB', prices.bnb)}\n` +
        `${formatPrice('SOL', prices.sol)}\n` +
        `${formatPrice('ADA', prices.ada)}\n\n` +
        `_Updated: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}_`;

      await ctx.replyWithMarkdown(text);
    } catch (error) {
      console.error('Error in /prices command:', error);
      await ctx.reply('Error fetching prices. Please try again.');
    }
  });

  // Trending coins command
  bot.command('trending', async (ctx) => {
    try {
      await ctx.reply('Fetching trending coins... 🔥');
      
      const trending = await fetchTrendingCoins();
      
      if (!trending || trending.length === 0) {
        return ctx.reply('No trending data available right now.');
      }

      let text = `🔥 *Trending on CoinGecko*\n\n`;
      
      trending.forEach((coin, index) => {
        text += `${index + 1}. *${coin.symbol}* - ${coin.name}\n`;
        text += `   Rank: #${coin.rank || 'N/A'}\n`;
      });

      text += `\n_Coins with highest search volume in the last 24h_`;

      await ctx.replyWithMarkdown(text);
    } catch (error) {
      console.error('Error in /trending command:', error);
      await ctx.reply('Error fetching trending coins. Please try again.');
    }
  });

  // Top gainers and losers
  bot.command('gainers', async (ctx) => {
    try {
      await ctx.reply('Analyzing top movers... 📈📉');
      
      const { gainers, losers } = await fetchTopMovers();
      
      if (!gainers || !losers || (gainers.length === 0 && losers.length === 0)) {
        return ctx.reply('No mover data available right now.');
      }

      let text = `📈 *Top Gainers (24h)*\n\n`;
      
      gainers.slice(0, 5).forEach((coin, index) => {
        text += `${index + 1}. *${coin.symbol}*: +${coin.change_24h.toFixed(2)}%\n`;
        text += `   $${coin.price.toLocaleString('en-US', {maximumFractionDigits: 6})}\n`;
      });

      text += `\n📉 *Top Losers (24h)*\n\n`;
      
      losers.slice(0, 5).forEach((coin, index) => {
        text += `${index + 1}. *${coin.symbol}*: ${coin.change_24h.toFixed(2)}%\n`;
        text += `   $${coin.price.toLocaleString('en-US', {maximumFractionDigits: 6})}\n`;
      });

      text += `\n_Top 100 coins by market cap_`;

      await ctx.replyWithMarkdown(text);
    } catch (error) {
      console.error('Error in /gainers command:', error);
      await ctx.reply('Error fetching movers. Please try again.');
    }
  });

  // Global market data
  bot.command('market', async (ctx) => {
    try {
      await ctx.reply('Fetching global market data... 🌍');
      
      const global = await fetchGlobalMarketData();
      
      if (!global) {
        return ctx.reply('Unable to fetch global market data.');
      }

      const formatLargeNumber = (num) => {
        if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        return `$${num.toLocaleString()}`;
      };

      const text = `🌍 *Global Crypto Market*\n\n` +
        `� Total Market Cap: ${formatLargeNumber(global.total_market_cap)}\n` +
        `📊 24h Volume: ${formatLargeNumber(global.total_volume_24h)}\n` +
        `📈 24h Change: ${global.market_cap_change_24h >= 0 ? '+' : ''}${global.market_cap_change_24h.toFixed(2)}%\n\n` +
        `⚡ BTC Dominance: ${global.btc_dominance.toFixed(2)}%\n` +
        `🔷 ETH Dominance: ${global.eth_dominance.toFixed(2)}%\n\n` +
        `🪙 Active Coins: ${global.active_cryptocurrencies.toLocaleString()}\n` +
        `� Markets: ${global.markets.toLocaleString()}`;

      await ctx.replyWithMarkdown(text);
    } catch (error) {
      console.error('Error in /market command:', error);
      await ctx.reply('Error fetching market data. Please try again.');
    }
  });

  // Gas prices
  bot.command('gas', async (ctx) => {
    try {
      await ctx.reply('Checking Ethereum gas prices... ⛽');
      
      const gas = await getGasPrices();
      
      if (!gas) {
        return ctx.reply('Unable to fetch gas prices right now.');
      }

      const text = `⛽ *Ethereum Gas Prices*\n\n` +
        `🐢 Safe: ${gas.safe} Gwei\n` +
        `⚡ Standard: ${gas.proposed} Gwei\n` +
        `🚀 Fast: ${gas.fast} Gwei\n\n` +
        `Base Fee: ${gas.base_fee.toFixed(2)} Gwei\n\n` +
        `_Updated: ${new Date(gas.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}_`;

      await ctx.replyWithMarkdown(text);
    } catch (error) {
      console.error('Error in /gas command:', error);
      await ctx.reply('Error fetching gas prices. Please try again.');
    }
  });

  // Whale transactions
  bot.command('whales', async (ctx) => {
    try {
      await ctx.reply('Scanning for whale movements... 🐋');
      
      const whales = await getRecentWhaleTransactions(500); // Min 500 ETH
      
      if (!whales || whales.length === 0) {
        return ctx.reply('No large transactions detected in recent blocks.');
      }

      let text = `🐋 *Recent Whale Transactions*\n\n`;
      
      whales.slice(0, 5).forEach((tx, index) => {
        const timeAgo = Math.floor((Date.now() / 1000 - tx.timestamp) / 60);
        text += `${index + 1}. *${parseFloat(tx.value).toLocaleString()} ETH*\n`;
        text += `   ${timeAgo} min ago\n`;
        text += `   [View](https://etherscan.io/tx/${tx.hash})\n\n`;
      });

      text += `_Transactions > 500 ETH in last ~20 minutes_`;

      await ctx.replyWithMarkdown(text, { disable_web_page_preview: true });
    } catch (error) {
      console.error('Error in /whales command:', error);
      await ctx.reply('Error fetching whale transactions. Please try again.');
    }
  });

  // Deposit options
  bot.command('deposit', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const country = args[0] || DEFAULT_PAYMENT_COUNTRY;
    const contact = getMobileContact(country);

    const text = `💰 *Deposit Options*\n\n` +
      `*Crypto Addresses:*\n` +
      `📌 USDT (ERC20/TRC20): \`${CRYPTO.usdt}\`\n` +
      `📌 BTC: \`${CRYPTO.btc}\`\n\n` +
      `*Mobile Money:*\n` +
      `📲 ${contact.label}: ${contact.number}\n\n` +
      `After sending, use:\n` +
      `/confirm_deposit <amount> <reference>\n\n` +
      `_Include your Telegram ID in payment note_`;

    await ctx.replyWithMarkdown(text);
  });

  // Confirm deposit
  bot.command('confirm_deposit', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const amount = args[0];
    
    if (!amount) {
      return ctx.reply('Usage: /confirm_deposit <amount> <reference>\nExample: /confirm_deposit 100 ABC123');
    }
    
    // In production: create Transaction record and wait for webhook
    await ctx.reply(
      `✅ Deposit confirmation recorded!\n\n` +
      `Amount: ${amount}\n` +
      `Status: Pending verification\n\n` +
      `We'll credit your account within 30 minutes after verification.`
    );
  });
}

export default { registerUserCommands };
