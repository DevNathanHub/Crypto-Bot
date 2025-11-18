import axios from 'axios';

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const ETHERSCAN_BASE = 'https://api.etherscan.io/api';

/**
 * Get current Ethereum gas prices
 */
async function getGasPrices() {
  try {
    const url = `${ETHERSCAN_BASE}?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data.status === '1') {
      const gas = response.data.result;
      return {
        safe: parseInt(gas.SafeGasPrice),
        proposed: parseInt(gas.ProposeGasPrice),
        fast: parseInt(gas.FastGasPrice),
        base_fee: parseFloat(gas.suggestBaseFee),
        timestamp: Date.now()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching gas prices:', error.message);
    return null;
  }
}

/**
 * Get recent large ETH transactions (whales)
 */
async function getRecentWhaleTransactions(minValue = 1000) {
  try {
    // Get latest block
    const blockUrl = `${ETHERSCAN_BASE}?module=proxy&action=eth_blockNumber&apikey=${ETHERSCAN_API_KEY}`;
    const blockResp = await axios.get(blockUrl, { timeout: 5000 });
    const latestBlock = parseInt(blockResp.data.result, 16);
    
    // Get recent block transactions
    const startBlock = latestBlock - 100; // Last ~100 blocks (~20 minutes)
    const txUrl = `${ETHERSCAN_BASE}?module=account&action=txlist&address=0x0000000000000000000000000000000000000000&startblock=${startBlock}&endblock=${latestBlock}&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    
    const txResp = await axios.get(txUrl, { timeout: 10000 });
    
    if (txResp.data.status === '1' && txResp.data.result) {
      const whaleTxs = txResp.data.result
        .filter(tx => {
          const valueInEth = parseInt(tx.value) / 1e18;
          return valueInEth >= minValue && tx.isError === '0';
        })
        .slice(0, 10)
        .map(tx => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: (parseInt(tx.value) / 1e18).toFixed(2),
          timestamp: parseInt(tx.timeStamp),
          blockNumber: parseInt(tx.blockNumber)
        }));
      
      return whaleTxs;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching whale transactions:', error.message);
    return [];
  }
}

/**
 * Get top ERC-20 token transfers in recent blocks
 */
async function getTopTokenTransfers(limit = 10) {
  try {
    // Get latest block
    const blockUrl = `${ETHERSCAN_BASE}?module=proxy&action=eth_blockNumber&apikey=${ETHERSCAN_API_KEY}`;
    const blockResp = await axios.get(blockUrl, { timeout: 5000 });
    const latestBlock = parseInt(blockResp.data.result, 16);
    
    const startBlock = latestBlock - 50;
    
    // Note: Etherscan free API has rate limits
    // In production, consider using a webhook service or paid plan
    // This is a simplified version
    
    return [];
  } catch (error) {
    console.error('Error fetching token transfers:', error.message);
    return [];
  }
}

/**
 * Get ETH balance for an address
 */
async function getEthBalance(address) {
  try {
    const url = `${ETHERSCAN_BASE}?module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data.status === '1') {
      const balance = parseInt(response.data.result) / 1e18;
      return balance;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching ETH balance:', error.message);
    return null;
  }
}

/**
 * Get ERC-20 token balance for an address
 */
async function getTokenBalance(contractAddress, walletAddress) {
  try {
    const url = `${ETHERSCAN_BASE}?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${walletAddress}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data.status === '1') {
      // Note: Need to divide by token decimals (usually 18 for USDT, but check contract)
      const balance = parseInt(response.data.result);
      return balance;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching token balance:', error.message);
    return null;
  }
}

/**
 * Verify USDT transaction on Ethereum
 * USDT Contract: 0xdac17f958d2ee523a2206206994597c13d831ec7
 */
async function verifyUSDTTransaction(txHash, expectedRecipient, minAmount) {
  try {
    const url = `${ETHERSCAN_BASE}?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data.result) {
      const receipt = response.data.result;
      
      // Check if transaction was successful
      if (receipt.status !== '0x1') {
        return { verified: false, reason: 'Transaction failed' };
      }
      
      // Parse logs to find Transfer event
      // ERC-20 Transfer event signature
      const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      
      const transferLog = receipt.logs.find(log => 
        log.topics[0] === transferTopic &&
        log.address.toLowerCase() === '0xdac17f958d2ee523a2206206994597c13d831ec7'
      );
      
      if (!transferLog) {
        return { verified: false, reason: 'No USDT transfer found' };
      }
      
      // Decode recipient (topics[2]) and amount (data)
      const recipient = '0x' + transferLog.topics[2].slice(26);
      const amount = parseInt(transferLog.data, 16) / 1e6; // USDT has 6 decimals
      
      if (recipient.toLowerCase() !== expectedRecipient.toLowerCase()) {
        return { verified: false, reason: 'Recipient mismatch' };
      }
      
      if (amount < minAmount) {
        return { verified: false, reason: 'Amount too low', actualAmount: amount };
      }
      
      return {
        verified: true,
        amount,
        from: '0x' + transferLog.topics[1].slice(26),
        to: recipient,
        blockNumber: parseInt(receipt.blockNumber, 16),
        confirmations: 'pending' // Would need to calculate based on latest block
      };
    }
    
    return { verified: false, reason: 'Transaction not found' };
  } catch (error) {
    console.error('Error verifying USDT transaction:', error.message);
    return { verified: false, reason: 'API error', error: error.message };
  }
}

export {
  getGasPrices,
  getRecentWhaleTransactions,
  getTopTokenTransfers,
  getEthBalance,
  getTokenBalance,
  verifyUSDTTransaction
};
