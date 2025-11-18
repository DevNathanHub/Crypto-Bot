import axios from 'axios';

const COINGECKO_BASE = process.env.COINGECKO_BASE || 'https://api.coingecko.com/api/v3';

// Simple CoinGecko wrapper for spot price in USD
export default async function fetchPrice(ticker = 'bitcoin') {
  try {
    const url = `${COINGECKO_BASE}/simple/price?ids=${encodeURIComponent(
      ticker
    )}&vs_currencies=usd`;
    const resp = await axios.get(url, { timeout: 5000 });
    const price = resp.data?.[ticker]?.usd;
    if (price == null) throw new Error('price_not_found');
    return price;
  } catch (err) {
    throw err;
  }
}

/**
 * Fetch top coin prices with detailed market data
 */
export async function fetchTopCoinPrices() {
  try {
    const ids = 'bitcoin,ethereum,binancecoin,solana,cardano';
    const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;
    
    const response = await axios.get(url, { timeout: 5000 });
    const data = response.data;

    return {
      btc: { 
        usd: data.bitcoin?.usd, 
        change_24h: data.bitcoin?.usd_24h_change,
        volume_24h: data.bitcoin?.usd_24h_vol,
        market_cap: data.bitcoin?.usd_market_cap
      },
      eth: { 
        usd: data.ethereum?.usd, 
        change_24h: data.ethereum?.usd_24h_change,
        volume_24h: data.ethereum?.usd_24h_vol,
        market_cap: data.ethereum?.usd_market_cap
      },
      bnb: { 
        usd: data.binancecoin?.usd, 
        change_24h: data.binancecoin?.usd_24h_change,
        volume_24h: data.binancecoin?.usd_24h_vol,
        market_cap: data.binancecoin?.usd_market_cap
      },
      sol: { 
        usd: data.solana?.usd, 
        change_24h: data.solana?.usd_24h_change,
        volume_24h: data.solana?.usd_24h_vol,
        market_cap: data.solana?.usd_market_cap
      },
      ada: { 
        usd: data.cardano?.usd, 
        change_24h: data.cardano?.usd_24h_change,
        volume_24h: data.cardano?.usd_24h_vol,
        market_cap: data.cardano?.usd_market_cap
      }
    };
  } catch (error) {
    console.error('Error fetching coin prices:', error.message);
    return {};
  }
}

/**
 * Fetch trending coins (hot right now on CoinGecko)
 */
export async function fetchTrendingCoins() {
  try {
    const url = `${COINGECKO_BASE}/search/trending`;
    const response = await axios.get(url, { timeout: 5000 });
    
    return response.data.coins.slice(0, 7).map(item => ({
      id: item.item.id,
      name: item.item.name,
      symbol: item.item.symbol.toUpperCase(),
      rank: item.item.market_cap_rank,
      price_btc: item.item.price_btc,
      score: item.item.score
    }));
  } catch (error) {
    console.error('Error fetching trending coins:', error.message);
    return [];
  }
}

/**
 * Fetch top gainers and losers (24h)
 */
export async function fetchTopMovers() {
  try {
    const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`;
    const response = await axios.get(url, { timeout: 10000 });
    
    const coins = response.data
      .filter(coin => coin.price_change_percentage_24h !== null && coin.market_cap_rank <= 100)
      .map(coin => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change_24h: coin.price_change_percentage_24h,
        volume: coin.total_volume,
        market_cap: coin.market_cap,
        rank: coin.market_cap_rank
      }));

    const gainers = coins
      .filter(c => c.change_24h > 0)
      .sort((a, b) => b.change_24h - a.change_24h)
      .slice(0, 5);
    
    const losers = coins
      .filter(c => c.change_24h < 0)
      .sort((a, b) => a.change_24h - b.change_24h)
      .slice(0, 5);

    return { gainers, losers };
  } catch (error) {
    console.error('Error fetching top movers:', error.message);
    return { gainers: [], losers: [] };
  }
}

/**
 * Fetch global market data (total market cap, BTC dominance, etc.)
 */
export async function fetchGlobalMarketData() {
  try {
    const url = `${COINGECKO_BASE}/global`;
    const response = await axios.get(url, { timeout: 5000 });
    const data = response.data.data;

    return {
      total_market_cap: data.total_market_cap.usd,
      total_volume_24h: data.total_volume.usd,
      btc_dominance: data.market_cap_percentage.btc,
      eth_dominance: data.market_cap_percentage.eth,
      market_cap_change_24h: data.market_cap_change_percentage_24h_usd,
      active_cryptocurrencies: data.active_cryptocurrencies,
      markets: data.markets
    };
  } catch (error) {
    console.error('Error fetching global market data:', error.message);
    return null;
  }
}

/**
 * Fetch detailed coin info
 */
export async function fetchCoinDetails(coinId) {
  try {
    const url = `${COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&community_data=true&developer_data=false`;
    const response = await axios.get(url, { timeout: 8000 });
    const data = response.data;

    return {
      id: data.id,
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      price: data.market_data.current_price.usd,
      change_24h: data.market_data.price_change_percentage_24h,
      change_7d: data.market_data.price_change_percentage_7d,
      market_cap: data.market_data.market_cap.usd,
      volume_24h: data.market_data.total_volume.usd,
      ath: data.market_data.ath.usd,
      ath_change: data.market_data.ath_change_percentage.usd
    };
  } catch (error) {
    console.error(`Error fetching details for ${coinId}:`, error.message);
    return null;
  }
}
