import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Contract ABIs (simplified for this example - in production use full ABIs)
const AI_SWAP_EXECUTOR_ABI = [
  "function registerUser() external",
  "function depositTokens(address token, uint256 amount) external",
  "function withdrawTokens(address token, uint256 amount) external",
  "function getUserBalance(address user, address token) external view returns (uint256)",
  "function setPriceThreshold(address tokenIn, address tokenOut, uint24 fee, uint256 thresholdPrice, bool isAbove) external returns (bytes32)",
  "function cancelPriceThreshold(bytes32 thresholdId) external",
  "event UserRegistered(address indexed user)",
  "event TokenDeposited(address indexed user, address indexed token, uint256 amount)",
  "event TokenWithdrawn(address indexed user, address indexed token, uint256 amount)",
  "event PriceThresholdSet(bytes32 indexed id, address indexed user, address indexed tokenIn, address tokenOut, uint24 fee, uint256 thresholdPrice, bool isAbove)",
  "event TradeExecuted(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, address executor)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

// Token metadata (for this example)
const TOKENS = {
  WETH: {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    symbol: "WETH",
    decimals: 18,
    name: "Wrapped Ether"
  },
  USDC: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    symbol: "USDC",
    decimals: 6,
    name: "USD Coin"
  },
  USDT: {
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    symbol: "USDT",
    decimals: 6,
    name: "Tether USD"
  }
};

// Component for AI Trading Interface
export default function AITradingInterface() {
  // Contract address - replace with your deployed contract address
  const contractAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
  
  // State variables
  const [account, setAccount] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [balances, setBalances] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeThresholds, setActiveThresholds] = useState([]);
  const [trades, setTrades] = useState([]);
  
  // Form state
  const [depositToken, setDepositToken] = useState(TOKENS.WETH.address);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawToken, setWithdrawToken] = useState(TOKENS.WETH.address);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [thresholdTokenIn, setThresholdTokenIn] = useState(TOKENS.WETH.address);
  const [thresholdTokenOut, setThresholdTokenOut] = useState(TOKENS.USDC.address);
  const [thresholdFee, setThresholdFee] = useState(3000);
  const [thresholdPrice, setThresholdPrice] = useState('');
  const [thresholdAbove, setThresholdAbove] = useState(false);
  
  // Connect wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setIsLoading(true);
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        
        setAccount(address);
        setProvider(provider);
        setSigner(signer);
        
        // Initialize contract
        const aiSwapContract = new ethers.Contract(
          contractAddress,
          AI_SWAP_EXECUTOR_ABI,
          signer
        );
        setContract(aiSwapContract);
        
        // Check if user is registered
        checkRegistration(aiSwapContract, address);
        
        // Load balances
        loadBalances(aiSwapContract, address);
        
        // Set up event listeners
        setupEventListeners(aiSwapContract, address);
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error connecting wallet:", error);
        setIsLoading(false);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };
  
  // Check if user is registered
  const checkRegistration = async (contract, address) => {
    try {
      // For simplicity, we're assuming any successful call means the user is registered
      // In a real implementation, you might want to add a specific function to check this
      const balance = await contract.getUserBalance(address, TOKENS.WETH.address);
      setIsRegistered(true);
    } catch (error) {
      setIsRegistered(false);
    }
  };
  
  // Load user token balances
  const loadBalances = async (contract, address) => {
    const newBalances = {};
    
    for (const [symbol, token] of Object.entries(TOKENS)) {
      try {
        const balance = await contract.getUserBalance(address, token.address);
        newBalances[symbol] = ethers.utils.formatUnits(balance, token.decimals);
      } catch (error) {
        console.error(`Error loading ${symbol} balance:`, error);
        newBalances[symbol] = '0';
      }
    }
    
    setBalances(newBalances);
  };
  
  // Set up event listeners
  const setupEventListeners = (contract, userAddress) => {
    // Listen for trade executions for this user
    contract.on("TradeExecuted", 
      (user, tokenIn, tokenOut, amountIn, amountOut, executor) => {
        if (user.toLowerCase() === userAddress.toLowerCase()) {
          // Find token symbols
          const tokenInSymbol = Object.entries(TOKENS).find(
            ([_, t]) => t.address.toLowerCase() === tokenIn.toLowerCase()
          )?.[0] || 'Unknown';
          
          const tokenOutSymbol = Object.entries(TOKENS).find(
            ([_, t]) => t.address.toLowerCase() === tokenOut.toLowerCase()
          )?.[0] || 'Unknown';
          
          // Format amounts
          const tokenInDecimals = TOKENS[tokenInSymbol]?.decimals || 18;
          const tokenOutDecimals = TOKENS[tokenOutSymbol]?.decimals || 18;
          
          const formattedAmountIn = ethers.utils.formatUnits(amountIn, tokenInDecimals);
          const formattedAmountOut = ethers.utils.formatUnits(amountOut, tokenOutDecimals);
          
          // Add to trades list
          setTrades(prev => [
            {
              id: Date.now(),
              tokenIn: tokenInSymbol,
              tokenOut: tokenOutSymbol,
              amountIn: formattedAmountIn,
              amountOut: formattedAmountOut,
              timestamp: new Date().toLocaleString()
            },
            ...prev
          ]);
          
          // Refresh balances
          loadBalances(contract, userAddress);
        }
      }
    );
    
    // Listen for threshold events
    contract.on("PriceThresholdSet", 
      (id, user, tokenIn, tokenOut, fee, price, isAbove) => {
        if (user.toLowerCase() === userAddress.toLowerCase()) {
          const tokenInSymbol = Object.entries(TOKENS).find(
            ([_, t]) => t.address.toLowerCase() === tokenIn.toLowerCase()
          )?.[0] || 'Unknown';
          
          const tokenOutSymbol = Object.entries(TOKENS).find(
            ([_, t]) => t.address.toLowerCase() === tokenOut.toLowerCase()
          )?.[0] || 'Unknown';
          
          const tokenOutDecimals = TOKENS[tokenOutSymbol]?.decimals || 18;
          const formattedPrice = ethers.utils.formatUnits(price, tokenOutDecimals);
          
          setActiveThresholds(prev => [
            {
              id: id,
              tokenIn: tokenInSymbol,
              tokenOut: tokenOutSymbol,
              fee: fee,
              price: formattedPrice,
              isAbove: isAbove,
              timestamp: new Date().toLocaleString()
            },
            ...prev
          ]);
        }
      }
    );
  };
  
  // Register user
  const registerUser = async () => {
    if (!contract) return;
    
    try {
      setIsLoading(true);
      const tx = await contract.registerUser();
      await tx.wait();
      setIsRegistered(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Error registering user:", error);
      setIsLoading(false);
    }
  };
  
  // Deposit tokens
  const handleDeposit = async () => {
    if (!contract || !signer || !depositToken || !depositAmount) return;
    
    try {
      setIsLoading(true);
      
      // Find token info
      const token = Object.values(TOKENS).find(t => t.address === depositToken);
      if (!token) {
        throw new Error("Token not found");
      }
      
      // Create token contract instance
      const tokenContract = new ethers.Contract(
        token.address,
        ERC20_ABI,
        signer
      );
      
      // Parse amount with correct decimals
      const amount = ethers.utils.parseUnits(depositAmount, token.decimals);
      
      // First approve the AI contract to spend tokens
      const approveTx = await tokenContract.approve(contractAddress, amount);
      await approveTx.wait();
      
      // Then deposit tokens
      const depositTx = await contract.depositTokens(token.address, amount);
      await depositTx.wait();
      
      // Refresh balances
      loadBalances(contract, account);
      
      // Reset form
      setDepositAmount('');
      setIsLoading(false);
    } catch (error) {
      console.error("Error depositing tokens:", error);
      setIsLoading(false);
    }
  };
  
  // Withdraw tokens
  const handleWithdraw = async () => {
    if (!contract || !withdrawToken || !withdrawAmount) return;
    
    try {
      setIsLoading(true);
      
      // Find token info
      const token = Object.values(TOKENS).find(t => t.address === withdrawToken);
      if (!token) {
        throw new Error("Token not found");
      }
      
      // Parse amount with correct decimals
      const amount = ethers.utils.parseUnits(withdrawAmount, token.decimals);
      
      // Withdraw tokens
      const tx = await contract.withdrawTokens(token.address, amount);
      await tx.wait();
      
      // Refresh balances
      loadBalances(contract, account);
      
      // Reset form
      setWithdrawAmount('');
      setIsLoading(false);
    } catch (error) {
      console.error("Error withdrawing tokens:", error);
      setIsLoading(false);
    }
  };
  
  // Set price threshold
  const handleSetThreshold = async () => {
    if (!contract || !thresholdTokenIn || !thresholdTokenOut || !thresholdPrice) return;
    
    try {
      setIsLoading(true);
      
      // Find token info
      const tokenOut = Object.values(TOKENS).find(t => t.address === thresholdTokenOut);
      if (!tokenOut) {
        throw new Error("Token not found");
      }
      
      // Parse price with correct decimals
      const price = ethers.utils.parseUnits(thresholdPrice, tokenOut.decimals);
      
      // Set price threshold
      const tx = await contract.setPriceThreshold(
        thresholdTokenIn,
        thresholdTokenOut,
        thresholdFee,
        price,
        thresholdAbove
      );
      
      await tx.wait();
      
      // Reset form
      setThresholdPrice('');
      setIsLoading(false);
    } catch (error) {
      console.error("Error setting threshold:", error);
      setIsLoading(false);
    }
  };
  
  // Cancel threshold
  const handleCancelThreshold = async (thresholdId) => {
    if (!contract) return;
    
    try {
      setIsLoading(true);
      
      const tx = await contract.cancelPriceThreshold(thresholdId);
      await tx.wait();
      
      // Remove from list
      setActiveThresholds(prev => prev.filter(t => t.id !== thresholdId));
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error canceling threshold:", error);
      setIsLoading(false);
    }
  };
  
  // Render the UI
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">AI Trading Platform</h1>
      
      {!account ? (
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={connectWallet}
          disabled={isLoading}
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <>
          <div className="mb-6">
            <p>Connected Account: {account}</p>
            {!isRegistered ? (
              <button
                className="px-4 py-2 mt-2 bg-green-500 text-white rounded hover:bg-green-600"
                onClick={registerUser}
                disabled={isLoading}
              >
                {isLoading ? 'Registering...' : 'Register as User'}
              </button>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Balances */}
                <div className="bg-gray-100 p-4 rounded">
                  <h2 className="text-xl font-bold mb-4">Your Balances</h2>
                  <ul>
                    {Object.entries(balances).map(([symbol, balance]) => (
                      <li key={symbol} className="mb-2">
                        <span className="font-semibold">{symbol}:</span> {balance}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Deposit */}
                <div className="bg-gray-100 p-4 rounded">
                  <h2 className="text-xl font-bold mb-4">Deposit Tokens</h2>
                  <div className="mb-4">
                    <label className="block mb-2">Token</label>
                    <select
                      className="w-full p-2 border rounded"
                      value={depositToken}
                      onChange={(e) => setDepositToken(e.target.value)}
                    >
                      {Object.entries(TOKENS).map(([symbol, token]) => (
                        <option key={symbol} value={token.address}>
                          {symbol}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block mb-2">Amount</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded"
                      placeholder="0.0"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                  </div>
                  <button
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full"
                    onClick={handleDeposit}
                    disabled={isLoading || !depositAmount}
                  >
                    {isLoading ? 'Processing...' : 'Deposit'}
                  </button>
                </div>
                
                {/* Withdraw */}
                <div className="bg-gray-100 p-4 rounded">
                  <h2 className="text-xl font-bold mb-4">Withdraw Tokens</h2>
                  <div className="mb-4">
                    <label className="block mb-2">Token</label>
                    <select
                      className="w-full p-2 border rounded"
                      value={withdrawToken}
                      onChange={(e) => setWithdrawToken(e.target.value)}
                    >
                      {Object.entries(TOKENS).map(([symbol, token]) => (
                        <option key={symbol} value={token.address}>
                          {symbol}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block mb-2">Amount</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded"
                      placeholder="0.0"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                  </div>
                  <button
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 w-full"
                    onClick={handleWithdraw}
                    disabled={isLoading || !withdrawAmount}
                  >
                    {isLoading ? 'Processing...' : 'Withdraw'}
                  </button>
                </div>
                
                {/* Set Price Threshold */}
                <div className="bg-gray-100 p-4 rounded">
                  <h2 className="text-xl font-bold mb-4">Set Price Threshold</h2>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block mb-2">Token In</label>
                      <select
                        className="w-full p-2 border rounded"
                        value={thresholdTokenIn}
                        onChange={(e) => setThresholdTokenIn(e.target.value)}
                      >
                        {Object.entries(TOKENS).map(([symbol, token]) => (
                          <option key={symbol} value={token.address}>
                            {symbol}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block mb-2">Token Out</label>
                      <select
                        className="w-full p-2 border rounded"
                        value={thresholdTokenOut}
                        onChange={(e) => setThresholdTokenOut(e.target.value)}
                      >
                        {Object.entries(TOKENS).map(([symbol, token]) => (
                          <option key={symbol} value={token.address}>
                            {symbol}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block mb-2">Fee Tier</label>
                    <select
                      className="w-full p-2 border rounded"
                      value={thresholdFee}
                      onChange={(e) => setThresholdFee(Number(e.target.value))}
                    >
                      <option value={500}>0.05% (Low)</option>
                      <option value={3000}>0.3% (Medium)</option>
                      <option value={10000}>1% (High)</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block mb-2">Price Threshold</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded"
                      placeholder="0.0"
                      value={thresholdPrice}
                      onChange={(e) => setThresholdPrice(e.target.value)}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={thresholdAbove}
                        onChange={(e) => setThresholdAbove(e.target.checked)}
                      />
                      Execute when price goes above threshold
                    </label>
                  </div>
                  <button
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 w-full"
                    onClick={handleSetThreshold}
                    disabled={isLoading || !thresholdPrice}
                  >
                    {isLoading ? 'Processing...' : 'Set Threshold'}
                  </button>
                </div>
                
                {/* Active Thresholds */}
                <div className="bg-gray-100 p-4 rounded col-span-1 md:col-span-2">
                  <h2 className="text-xl font-bold mb-4">Active Price Thresholds</h2>
                  {activeThresholds.length === 0 ? (
                    <p>No active thresholds</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Pair
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Price
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Condition
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Set At
                            </th>
                            <th className="px-6 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {activeThresholds.map((threshold) => (
                            <tr key={threshold.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {threshold.tokenIn}/{threshold.tokenOut}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {threshold.price}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {threshold.isAbove ? 'Above' : 'Below'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {threshold.timestamp}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <button
                                  className="text-red-600 hover:text-red-900"
                                  onClick={() => handleCancelThreshold(threshold.id)}
                                  disabled={isLoading}
                                >
                                  Cancel
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                
                {/* Recent Trades */}
                <div className="bg-gray-100 p-4 rounded col-span-1 md:col-span-2">
                  <h2 className="text-xl font-bold mb-4">Recent Trades</h2>
                  {trades.length === 0 ? (
                    <p>No trades executed yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Trade
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount In
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount Out
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Time
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {trades.map((trade) => (
                            <tr key={trade.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {trade.tokenIn} → {trade.tokenOut}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {trade.amountIn} {trade.tokenIn}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {trade.amountOut} {trade.tokenOut}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {trade.timestamp}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
} 