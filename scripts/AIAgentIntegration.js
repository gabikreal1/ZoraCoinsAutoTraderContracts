// const { ethers } = require("ethers");

// /**
//  * This is a sample script demonstrating how an AI agent would interact with the AISwapExecutorReactive contract
//  * In a real implementation, this logic would be part of your AI agent's decision-making system
//  */

// // Contract addresses (replace with your actual deployed addresses)
// const AI_SWAP_EXECUTOR_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
// const UNISWAP_QUOTER_ADDRESS = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"; // Mainnet

// // Token addresses (replace as needed for your network)
// const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
// const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

// // ABIs (simplified for this example)
// const AI_SWAP_EXECUTOR_ABI = [
//   "function executeSwap(address user, tuple(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint256 amountOutMinimum, uint256 deadline)) external returns (uint256)",
//   "event PriceThresholdTriggered(bytes32 indexed id, uint256 currentPrice, uint256 thresholdPrice)",
//   "event TradeExecuted(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, address executor)"
// ];

// const QUOTER_ABI = [
//   "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)"
// ];

// // Example AI Agent implementation
// class AITradingAgent {
//   constructor(provider, privateKey) {
//     this.provider = provider;
//     this.wallet = new ethers.Wallet(privateKey, provider);
    
//     // Initialize contract instances
//     this.aiSwapExecutor = new ethers.Contract(
//       AI_SWAP_EXECUTOR_ADDRESS,
//       AI_SWAP_EXECUTOR_ABI,
//       this.wallet
//     );
    
//     this.quoter = new ethers.Contract(
//       UNISWAP_QUOTER_ADDRESS,
//       QUOTER_ABI,
//       this.provider
//     );
    
//     // Listen for price threshold events
//     this.aiSwapExecutor.on("PriceThresholdTriggered", this.handlePriceThresholdTriggered.bind(this));
//   }
  
//   // Process price threshold triggers
//   async handlePriceThresholdTriggered(thresholdId, currentPrice, thresholdPrice) {
//     console.log(`Price threshold triggered: ${thresholdId}`);
//     console.log(`Current price: ${ethers.utils.formatUnits(currentPrice, 6)}`);
//     console.log(`Threshold price: ${ethers.utils.formatUnits(thresholdPrice, 6)}`);
    
//     // Here, your AI would make a decision on whether to execute a trade
//     // For this example, we'll automatically execute a trade
    
//     // Fetch the user from the event (in a real implementation, you'd query the contract)
//     const user = "0x123..."; // Example user address
    
//     await this.executeTrade(user, WETH_ADDRESS, USDC_ADDRESS, 3000, ethers.utils.parseEther("0.1"));
//   }
  
//   // Get a quote from Uniswap
//   async getQuote(tokenIn, tokenOut, fee, amountIn) {
//     try {
//       // Use callStatic to simulate the call without state changes
//       const quotedAmountOut = await this.quoter.callStatic.quoteExactInputSingle(
//         tokenIn,
//         tokenOut,
//         fee,
//         amountIn,
//         0 // sqrtPriceLimitX96
//       );
      
//       console.log(`Quote received: ${ethers.utils.formatUnits(quotedAmountOut, 6)} USDC`);
//       return quotedAmountOut;
//     } catch (error) {
//       console.error("Error getting quote:", error);
//       throw error;
//     }
//   }
  
//   // Execute a trade for a user
//   async executeTrade(user, tokenIn, tokenOut, fee, amountIn) {
//     try {
//       console.log(`Executing trade for user ${user}`);
//       console.log(`Trading ${ethers.utils.formatEther(amountIn)} ${tokenIn} for ${tokenOut}`);
      
//       // Get the current quote
//       const quotedAmountOut = await this.getQuote(tokenIn, tokenOut, fee, amountIn);
      
//       // Calculate slippage (0.5% in this example)
//       const amountOutMinimum = quotedAmountOut.mul(9950).div(10000);
      
//       // Set deadline to 30 minutes from now
//       const deadline = Math.floor(Date.now() / 1000) + 1800;
      
//       // Execute the swap
//       const tx = await this.aiSwapExecutor.executeSwap(
//         user,
//         {
//           tokenIn,
//           tokenOut,
//           fee,
//           amountIn,
//           amountOutMinimum,
//           deadline
//         }
//       );
      
//       console.log(`Transaction sent: ${tx.hash}`);
      
//       // Wait for transaction to be mined
//       const receipt = await tx.wait();
//       console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      
//       // Find and parse the TradeExecuted event
//       const tradeEvent = receipt.events.find(e => e.event === "TradeExecuted");
//       if (tradeEvent) {
//         const { amountIn, amountOut } = tradeEvent.args;
//         console.log(`Trade executed successfully!`);
//         console.log(`Input: ${ethers.utils.formatEther(amountIn)} WETH`);
//         console.log(`Output: ${ethers.utils.formatUnits(amountOut, 6)} USDC`);
//       }
      
//       return receipt;
//     } catch (error) {
//       console.error("Error executing trade:", error);
//       throw error;
//     }
//   }
// }

// // Example usage
// async function runAIAgent() {
//   // Replace with your provider URL and private key
//   const provider = new ethers.providers.JsonRpcProvider("YOUR_RPC_URL");
//   const privateKey = "YOUR_PRIVATE_KEY"; // AI agent's private key
  
//   const aiAgent = new AITradingAgent(provider, privateKey);
  
//   // Example: manually trigger a trade for testing
//   const user = "0x123..."; // User address
//   await aiAgent.executeTrade(
//     user,
//     WETH_ADDRESS,
//     USDC_ADDRESS,
//     3000, // 0.3% fee pool
//     ethers.utils.parseEther("0.1") // 0.1 WETH
//   );
// }

// // Uncomment to run the example
// // runAIAgent().catch(console.error); 
// scripts/simplified-test-contract.js
const { ethers } = require("hardhat");

async function main() {
  console.log("Starting simplified contract test script...");
  
  // Use existing contract or deploy a new one
  console.log("Getting contract instance...");
  
  // Base network addresses - ensure these are correct for the network you're using
  const WETH_ADDRESS = "0x4200000000000000000000000000000000000006"; // WETH on Base
  const contractAddress = "0xE5c5c115245ebd37125057Cf9F8c6e477E7432E0"; // Your contract address
  
  console.log("Using WETH address:", WETH_ADDRESS);
  console.log("Using contract address:", contractAddress);
  
  // Setup
  const [owner] = await ethers.getSigners();
  console.log("Owner address:", owner.address);
  
  // Minimal ERC20 ABI with only necessary functions
  const erc20Abi = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function transfer(address to, uint amount) returns (bool)",
  ];
  
  // Get contract instances
  const AISwapExecutor = await ethers.getContractFactory("AISwapExecutorReactive");
  const contract = AISwapExecutor.attach(contractAddress);
  const weth = new ethers.Contract(WETH_ADDRESS, erc20Abi, owner);
  
  // ===== DIRECT DEPOSIT APPROACH =====
  console.log("\n--- Direct WETH Approval and Deposit ---");
  
  try {
    const smallAmount = ethers.utils.parseEther("0.00005"); // Reduced amount
    console.log(`Will attempt to approve and deposit ${ethers.utils.formatEther(smallAmount)} WETH`);
    
    // Skip checking allowance - just approve directly with high gas limit
    console.log("Approving WETH spending...");
    const approveTx = await weth.approve(
      contractAddress, 
      smallAmount.mul(2), // Just approve what we need
      { 
        gasLimit: 300000, // Higher gas limit
        gasPrice: ethers.utils.parseUnits("1.5", "gwei") // Explicit gas price
      }
    );
    console.log("Approve transaction hash:", approveTx.hash);
    
    // Don't wait for approval confirmation - continue immediately
    console.log("Continuing without waiting for approval confirmation...");
    
    // Alternative approach: try direct transfer to contract if deposit fails
    console.log("\n--- Alternative: Direct WETH Transfer ---");
    console.log("Attempting direct WETH transfer to contract...");
    
    try {
      // Try transferring directly to contract - not ideal but might work
      const transferTx = await weth.transfer(
        contractAddress, 
        smallAmount,
        { 
          gasLimit: 300000,
          gasPrice: ethers.utils.parseUnits("1.5", "gwei")
        }
      );
      console.log("Transfer transaction hash:", transferTx.hash);
      console.log("Note: Direct transfer may not credit your account in the contract!");
      console.log("Check your contract balance after transfer confirmation.");
    } catch (transferError) {
      console.error("Error in direct transfer:", transferError.message);
    }
    
    // Try deposit anyway (may work even if allowance check failed)
    console.log("\n--- Attempting Contract Deposit ---");
    console.log("Depositing WETH to contract via depositTokens...");
    
    const depositTx = await contract.depositTokens(
      WETH_ADDRESS, 
      smallAmount,
      { 
        gasLimit: 500000, // Much higher gas limit
        gasPrice: ethers.utils.parseUnits("1.5", "gwei")
      }
    );
    console.log("Deposit transaction hash:", depositTx.hash);
    console.log("Deposit transaction sent - check explorer for confirmation");
  } catch (error) {
    console.error("Error in deposit flow:", error.message);
  }
  
  console.log("\nScript completed. Check transaction status in explorer.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });