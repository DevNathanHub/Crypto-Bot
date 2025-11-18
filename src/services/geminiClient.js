// Enhanced Gemini client with real Google Generative AI integration
// See docs/06-GEMINI-AI.md for setup and usage

/**
 * Generate one-line market summary with enhanced data
 */
export function generateOneLineSummary(priceData, trendingCoins = [], globalData = null) {
  if (!priceData || !priceData.btc) {
    return '📊 Market data loading...';
  }

  const btcChange = priceData.btc.change_24h || 0;
  const ethChange = priceData.eth?.change_24h || 0;
  
  // Determine market sentiment
  const avgChange = (btcChange + ethChange) / 2;
  let sentiment = '';
  let emoji = '';
  
  if (avgChange > 5) {
    sentiment = 'surging';
    emoji = '🚀';
  } else if (avgChange > 2) {
    sentiment = 'climbing';
    emoji = '📈';
  } else if (avgChange > 0) {
    sentiment = 'holding gains';
    emoji = '💚';
  } else if (avgChange > -2) {
    sentiment = 'consolidating';
    emoji = '📊';
  } else if (avgChange > -5) {
    sentiment = 'pulling back';
    emoji = '📉';
  } else {
    sentiment = 'under pressure';
    emoji = '🔴';
  }

  const btcPrice = priceData.btc.usd >= 1000 
    ? `$${(priceData.btc.usd / 1000).toFixed(1)}K` 
    : `$${priceData.btc.usd.toFixed(0)}`;
  
  const ethPrice = priceData.eth?.usd 
    ? `$${priceData.eth.usd.toFixed(0)}`
    : 'N/A';

  // Add trending context if available
  let trendingText = '';
  if (trendingCoins && trendingCoins.length > 0) {
    const topTrending = trendingCoins[0];
    trendingText = ` | 🔥 ${topTrending.symbol} trending`;
  }

  // Add global market cap change if available
  let marketCapText = '';
  if (globalData && globalData.market_cap_change_24h) {
    const mcChange = globalData.market_cap_change_24h;
    marketCapText = ` | Market ${mcChange > 0 ? '+' : ''}${mcChange.toFixed(1)}%`;
  }

  return `${emoji} BTC ${btcPrice} (${btcChange > 0 ? '+' : ''}${btcChange.toFixed(1)}%) | ETH ${ethPrice} (${ethChange > 0 ? '+' : ''}${ethChange.toFixed(1)}%) — ${sentiment}${trendingText}${marketCapText}`;
}

/**
 * Generate engaging daily digest
 */
export function generateDailyDigest(priceData, movers, trending, globalData) {
  const summary = generateOneLineSummary(priceData, trending, globalData);
  
  let digest = `📊 *Daily Crypto Digest*\n\n${summary}\n\n`;

  // Add top movers
  if (movers && movers.gainers && movers.gainers.length > 0) {
    digest += `📈 *Top Gainer*: ${movers.gainers[0].symbol} +${movers.gainers[0].change_24h.toFixed(1)}%\n`;
  }
  
  if (movers && movers.losers && movers.losers.length > 0) {
    digest += `📉 *Top Loser*: ${movers.losers[0].symbol} ${movers.losers[0].change_24h.toFixed(1)}%\n`;
  }

  // Add global market context
  if (globalData) {
    const mcFormatted = globalData.total_market_cap >= 1e12 
      ? `$${(globalData.total_market_cap / 1e12).toFixed(2)}T`
      : `$${(globalData.total_market_cap / 1e9).toFixed(0)}B`;
    
    digest += `\n💰 Total Market Cap: ${mcFormatted}\n`;
    digest += `⚡ BTC Dominance: ${globalData.btc_dominance.toFixed(1)}%\n`;
  }

  digest += `\n_Stay ahead of the market at crypto.loopnet.tech_`;
  
  return digest;
}

/**
 * Generate whale alert message
 */
export function generateWhaleAlert(transaction) {
  const value = parseFloat(transaction.value);
  const emoji = value > 10000 ? '🐳' : value > 5000 ? '🐋' : '🐟';
  
  return `${emoji} *WHALE ALERT*\n\n` +
    `${value.toLocaleString()} ETH moved\n` +
    `Value: ~$${(value * 3000).toLocaleString()} (est.)\n\n` +
    `[View on Etherscan](https://etherscan.io/tx/${transaction.hash})\n\n` +
    `_Track whales at crypto.loopnet.tech_`;
}

/**
 * Generate trending alert
 */
export function generateTrendingAlert(trendingCoins) {
  if (!trendingCoins || trendingCoins.length === 0) {
    return '🔥 No trending data available';
  }

  let message = `🔥 *TRENDING NOW*\n\n`;
  
  trendingCoins.slice(0, 3).forEach((coin, index) => {
    message += `${index + 1}. *${coin.symbol}* (${coin.name})\n`;
    message += `   Rank: #${coin.rank || 'N/A'}\n\n`;
  });

  message += `_See full list at crypto.loopnet.tech_`;
  
  return message;
}

/**
 * Generate market movers summary
 */
export function generateMoversSummary(gainers, losers) {
  let message = `📊 *24H MARKET MOVERS*\n\n`;

  if (gainers && gainers.length > 0) {
    message += `📈 *Top Gainers:*\n`;
    gainers.slice(0, 3).forEach((coin, index) => {
      message += `${index + 1}. ${coin.symbol} +${coin.change_24h.toFixed(1)}% ($${coin.price.toFixed(4)})\n`;
    });
    message += `\n`;
  }

  if (losers && losers.length > 0) {
    message += `📉 *Top Losers:*\n`;
    losers.slice(0, 3).forEach((coin, index) => {
      message += `${index + 1}. ${coin.symbol} ${coin.change_24h.toFixed(1)}% ($${coin.price.toFixed(4)})\n`;
    });
  }

  message += `\n_Trade smarter at crypto.loopnet.tech_`;
  
  return message;
}

/**
 * Legacy digest function for backward compatibility
 */
export async function summarizeDigest(data) {
  // data: { topMovers: [{ticker, change}], headlines: [] }
  const lines = (data.topMovers || []).map(
    (m) => `${m.ticker.toUpperCase()}: ${m.change}% — quick take`
  );
  return {
    summary: lines.join('\n'),
    confidence: 0.6,
    model: 'mock-gemini'
  };
}

/**
 * Generic generation with real Gemini API
 */
export async function generate(prompt, options = {}) {
  try {
    // Import the new @google/genai SDK
    const { GoogleGenAI } = await import('@google/genai');

    // The client gets the API key from the environment variable `GEMINI_API_KEY`
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        temperature: options.temperature || parseFloat(process.env.GEMINI_TEMPERATURE) || 0.8,
        maxOutputTokens: options.maxTokens || parseInt(process.env.GEMINI_MAX_TOKENS) || 500,
        topP: options.topP || 0.9,
        topK: options.topK || 40
      }
    });

    // Handle different response structures
    if (response && response.text) {
      return response.text.trim();
    } else if (response && response.response && response.response.text) {
      return response.response.text().trim();
    } else if (response && typeof response === 'string') {
      return response.trim();
    }
    
    throw new Error('Invalid response structure from Gemini API');

  } catch (error) {
    console.error('Gemini API error:', error.message || error);

    // Enhanced fallback responses based on prompt type
    if (prompt.includes('strategy') || prompt.includes('Strategy')) {
      const strategies = [
        '⚡ *Strategy Drop: Whale Watching*\n\nTrack wallets accumulating 3+ times in 24h. Enter small (1-3%), exit on first pump. Bot automates tracking.\n\n_Full guide → crypto.loopnet.tech_',
        '🧠 *Smart-DCA Hack*\n\nInstead of daily buys: Buy only red days, sell only green. Let emotion-free automation handle timing.\n\n_Automate now → crypto.loopnet.tech_',
        '🔥 *30-Second Alpha*\n\nWhen stablecoin inflows spike, alts pump 10-30%. Bot tracks USDT/USDC flows 24/7 for you.\n\n_Join smart money → crypto.loopnet.tech_',
        '💎 *Arbitrage Simplified*\n\nSame coin, different exchanges = instant profit. Example: BTC $95K Binance, $95.3K Kraken. Bot spots these gaps.\n\n_Start earning → crypto.loopnet.tech_'
      ];
      return strategies[Math.floor(Math.random() * strategies.length)];
    }

    if (prompt.includes('pitch') || prompt.includes('marketing') || prompt.includes('automated')) {
      const marketing = [
        '🚀 *150%+ Daily Gains Without Charts*\n\nCrypto Hub Bot automates everything: trades, signals, risk, execution. USDT/BTC accepted globally.\n\n_Start with your phone → crypto.loopnet.tech_',
        '📣 *No Borders With Crypto*\n\nNigeria, Ghana, South Africa, Egypt—150%+ daily gains. USDT/BTC deposits work anywhere. M-Pesa for Kenya/Uganda.\n\n_Join now → crypto.loopnet.tech_',
        '💰 *Africa to Asia—Crypto Connects All*\n\nUSDT/BTC deposits: Global coverage. Mobile money: 15+ African countries. Auto-trading 24/7.\n\n_Sign up → crypto.loopnet.tech_',
        '🎯 *Zero to Pro Globally*\n\nMorocco, Tunisia, Algeria, Libya—crypto has no borders. Bot handles everything. USDT/BTC or mobile money.\n\n_Start → crypto.loopnet.tech_',
        '🌍 *Cross-Border Made Easy*\n\nSend from Malawi → Receive in Kenya M-Pesa. Or use USDT/BTC worldwide. 150%+ automated gains.\n\n_Join → crypto.loopnet.tech_'
      ];
      return marketing[Math.floor(Math.random() * marketing.length)];
    }

    if (prompt.includes('alpha') || prompt.includes('market update')) {
      return '🚀 *MARKET ALPHA*\n\nBTC consolidating above key support. ETH showing strength. Volume building—watch for breakout.\n\n_Real-time alerts → crypto.loopnet.tech_';
    }

    if (prompt.includes('motivation') || prompt.includes('inspiring') || prompt.includes('mobile')) {
      const motivation = [
        '💰 *$5 → $20 Daily Flips—Global*\n\nUSDT/BTC: Any country. M-Pesa: Kenya/Uganda/Tanzania. Airtel: 15+ countries. Your phone = ATM.\n\n_Begin → crypto.loopnet.tech_',
        '📱 *No Laptop, No Borders*\n\nTraders from Ghana, Rwanda, Zambia, Egypt earning daily. Crypto (USDT) or mobile money. 150%+ growth.\n\n_Join → crypto.loopnet.tech_',
        '🚀 *The Formula Works Everywhere*\n\nAlpha + Automation + Crypto = Wealth. Nigeria, Cameroon, Senegal, Morocco—all supported.\n\n_Start → crypto.loopnet.tech_',
        '🏦 *Banks Give 3% Annually*\n\nCrypto targets 150%+ DAILY. South Africa, Angola, Mozambique, Ethiopia—deposit USDT anywhere.\n\n_Take control → crypto.loopnet.tech_',
        '🌍 *Cross-Border Freedom*\n\nMalawi → Kenya M-Pesa. Or USDT/BTC worldwide. Bot compounds gains 24/7.\n\n_Join global network → crypto.loopnet.tech_'
      ];
      return motivation[Math.floor(Math.random() * motivation.length)];
    }

    if (prompt.includes('QUICK_UPDATE')) {
      return '💎 Markets consolidating. BTC holding $90K+ support. ETH steady. Volume normalizing—next move brewing.\n\n_Track live → crypto.loopnet.tech_';
    }

    // Generic fallback with better formatting
    console.warn('[Gemini] Using fallback response for prompt:', prompt.substring(0, 50) + '...');
    return '🤖 *Crypto Hub Update*\n\nMarkets moving. Opportunities forming. Bot is scanning for alpha.\n\n_Stay ahead → crypto.loopnet.tech_';
  }
}

/**
 * Generate dynamic global content with rotating regions and topics
 * This creates unique content every time without being repetitive
 */
export function generateDynamicGlobalContent(type = 'general') {
    const regions = [
      { name: 'Europe', countries: ['UK', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Sweden'], payment: 'SEPA, crypto' },
      { name: 'Asia-Pacific', countries: ['Singapore', 'Japan', 'South Korea', 'Hong Kong', 'India', 'Australia'], payment: 'crypto, local methods' },
      { name: 'Middle East', countries: ['UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain'], payment: 'crypto, bank transfers' },
      { name: 'Americas', countries: ['USA', 'Canada', 'Brazil', 'Mexico', 'Argentina', 'Chile'], payment: 'crypto, cards' },
      { name: 'Africa', countries: ['Nigeria', 'South Africa', 'Kenya', 'Egypt', 'Morocco', 'Ghana'], payment: 'M-Pesa, Airtel, crypto' },
      { name: 'Southeast Asia', countries: ['Philippines', 'Indonesia', 'Vietnam', 'Thailand', 'Malaysia'], payment: 'crypto, local banking' }
    ];

    const topics = [
      'automated trading beats manual',
      '24/7 market coverage while you sleep',
      'small capital start ($5-$50)',
      'compound interest magic',
      'hedge against inflation',
      'cross-border payment freedom',
      'no KYC delays',
      'instant deposits and withdrawals',
      'AI-powered market analysis',
      'whale wallet tracking',
      'MEV protection',
      'gas optimization',
      'multi-exchange arbitrage',
      'passive income generation'
    ];

    const randomRegion = regions[Math.floor(Math.random() * regions.length)];
    const randomCountries = randomRegion.countries.slice(0, 3 + Math.floor(Math.random() * 2)).join(', ');
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];

    if (type === 'marketing') {
      return `🌍 *${randomRegion.name} Traders*\n\nFrom ${randomCountries}—crypto automation is changing the game. Key advantage: ${randomTopic}.\n\nAccepted: ${randomRegion.payment}\nPotential: 150%+ daily\n\n_Join thousands → crypto.loopnet.tech_`;
    }

    if (type === 'motivation') {
      return `💪 *Success Story: ${randomRegion.name}*\n\nTraders in ${randomCountries} are winning with automation. Secret? ${randomTopic}.\n\nStart small. Think big. Scale fast.\n\n_Your turn → crypto.loopnet.tech_`;
    }

    if (type === 'strategy') {
      const strategies = ['Range trading', 'Trend following', 'Arbitrage hunting', 'Whale copying', 'Funding rate farming'];
      const randomStrategy = strategies[Math.floor(Math.random() * strategies.length)];
      return `⚡ *Strategy Alpha*\n\n"${randomStrategy}" works across all markets. Popular in ${randomCountries}.\n\nKey insight: ${randomTopic}\n\n_Automate it → crypto.loopnet.tech_`;
    }

    // General
    return `🚀 *Global Update*\n\n${randomCountries} traders reporting strong results. Focus: ${randomTopic}.\n\nPayments: ${randomRegion.payment}\nAutomation: 24/7\n\n_Join global network → crypto.loopnet.tech_`;
}

/**
 * Generate unique marketing update using rotated prompts
 */
export async function generateMarketingUpdate() {
  try {
    // Import prompts
    const { GEMINI_PROMPTS } = await import('../data/contentTemplates.js');

    // Rotate through marketing prompts
    if (!global.marketingPromptIndex) global.marketingPromptIndex = 0;
    const prompts = GEMINI_PROMPTS.marketing;
    const prompt = prompts[global.marketingPromptIndex % prompts.length];
    global.marketingPromptIndex++;

    // Generate with Gemini
    const content = await generate(prompt, { maxTokens: 150, temperature: 0.8 });

    return content;
  } catch (error) {
    console.error('Marketing generation failed:', error);
    // Fallback to dynamic global content
    return generateDynamicGlobalContent('marketing');
  }
}

export default {
  generateOneLineSummary,
  generateDailyDigest,
  generateWhaleAlert,
  generateTrendingAlert,
  generateMoversSummary,
  summarizeDigest,
  generate,
  generateDynamicGlobalContent,
  generateMarketingUpdate
};

