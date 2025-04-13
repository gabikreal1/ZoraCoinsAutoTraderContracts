// scripts/test-contract.js
const { ethers } = require("hardhat");

async function main() {
  // Use existing contract or deploy a new one
  console.log("Getting contract instance...");
  
  // Check which network we're connected to
  const network = await ethers.provider.getNetwork();
  console.log("Connected to network:", network.name, "chainId:", network.chainId);
  
  // Base network addresses - ensure these are correct for the network you're using
  const WETH_ADDRESS = "0x4200000000000000000000000000000000000006"; // WETH on Base
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base
  const USDT_ADDRESS = "0x4D15a3A2286D883AF0AA1B3f21367843FAc63E07"; // USDT on Base (Tether)
  const DAI_ADDRESS = "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"; // DAI on Base
  const SWAP_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481"; // Uniswap V3 on Base
  const QUOTER = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a"; // Uniswap Quoter on Base
  
  console.log("Using WETH address:", WETH_ADDRESS);
  console.log("Using USDC address:", USDC_ADDRESS);
  console.log("Using USDT address:", USDT_ADDRESS);
  console.log("Using DAI address:", DAI_ADDRESS);
  
  // Setup signer first
  const [owner] = await ethers.getSigners();
  console.log("Owner address:", owner.address);
  
  // Use existing deployed contract
  const contractAddress = "0x536949996AE7e160a193DEf2e919B1C357fDF271"; // Replace with your contract address
  
  // Add Multi-Hop Swap Function for the contract
  const swapAbi = [
    "function executeSwap(address user, tuple(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint256 amountOutMinimum, uint256 deadline)) external returns (uint256 amountOut)",
    "function executeMultiHopSwap(address user, bytes path, uint256 amountIn, uint256 amountOutMinimum, uint256 deadline) external returns (uint256 amountOut)"
  ];
  
  // Create full contract ABI with all the functions we need
  const contractAbi = [
    ...swapAbi,
    "function getUserBalance(address user, address token) external view returns (uint256)",
    "function aiAgents(address) external view returns (bool)",
    "function swapRouter() external view returns (address)",
    "function registerUser() external",
    "function setAIAgent(address agent, bool approved) external",
    "function depositTokens(address token, uint256 amount) external",
    "function withdrawTokens(address token, uint256 amount) external"
  ];
  
  // Create contract instance with our custom ABI
  const contract = new ethers.Contract(contractAddress, contractAbi, owner);
  console.log("Using existing contract at:", contractAddress);
  
  // Helper function to check if user is an AI agent
  async function isAIAgent(address) {
    try {
      return await contract.aiAgents(address);
    } catch (error) {
      console.error("Error checking AI agent status:", error.message);
      return false;
    }
  }
  
  // Helper function to check if user is registered
  async function isUserRegistered(address) {
    try {
      // Just check if we can call contract functions as this user
      await contract.callStatic.getUserBalance(address, WETH_ADDRESS);
      return true;
    } catch (error) {
      if (error.message.includes("User not registered")) {
        return false;
      }
      console.error("Error checking user registration:", error.message);
      return false; 
    }
  }
  
  // Get token contracts with correct ABI
  console.log("Getting token contracts...");
  
  // Minimal ERC20 ABI with all the functions we need
  const erc20Abi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function transfer(address to, uint amount) returns (bool)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function deposit() external payable", // For WETH
  ];
  
  // Add ExactInput ABI for path-based routing
  const quoterAbi = [
    "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
    "function quoteExactInput(bytes path, uint256 amountIn) external returns (uint256 amountOut, uint160[] sqrtPriceX96AfterList, uint32[] initializedTicksCrossedList, uint256 gasEstimate)"
  ];
  
  // Try to verify network connection first
  try {
    console.log("Verifying network connection...");
    const block = await ethers.provider.getBlock("latest");
    console.log(`Connected to network. Latest block: ${block.number}, timestamp: ${new Date(block.timestamp * 1000).toLocaleString()}`);
  } catch (error) {
    console.error("Error connecting to network:", error.message);
    console.error("Please check your RPC endpoint and network configuration");
    process.exit(1);
  }
  
  // Verify contract is deployed
  try {
    console.log("Verifying contract deployment...");
    const code = await ethers.provider.getCode(contractAddress);
    if (code === "0x") {
      console.error("No contract deployed at address:", contractAddress);
      console.error("Please check the contract address or deploy the contract first");
      process.exit(1);
    }
    console.log("Contract verified at:", contractAddress);
  } catch (error) {
    console.error("Error verifying contract:", error.message);
    process.exit(1);
  }
  
  // Verify contract configuration
  try {
    console.log("\n--- Verifying Contract Configuration ---");
    const contractSwapRouter = await contract.swapRouter();
    console.log("Contract SwapRouter:", contractSwapRouter);
    console.log("Script SwapRouter:  ", SWAP_ROUTER);
    
    if (contractSwapRouter.toLowerCase() !== SWAP_ROUTER.toLowerCase()) {
      console.warn("⚠️ WARNING: Contract swap router doesn't match the script's swap router!");
    }
  } catch (error) {
    console.error("Error checking contract configuration:", error.message);
  }
  
  // Create token contracts
  const weth = new ethers.Contract(WETH_ADDRESS, erc20Abi, owner);
  const usdc = new ethers.Contract(USDC_ADDRESS, erc20Abi, owner);
  const usdt = new ethers.Contract(USDT_ADDRESS, erc20Abi, owner);
  const dai = new ethers.Contract(DAI_ADDRESS, erc20Abi, owner);
  
  // Create quoter contract
  const quoterContract = new ethers.Contract(QUOTER, quoterAbi, owner);
  
  // Skip wrapping ETH and approvals for testing - directly check if owner is an AI agent and registered user
  console.log("\n--- Checking AI Agent and User Registration ---");
  
  // Register as AI agent if not already
  try {
    const isAgent = await isAIAgent(owner.address);
    console.log("AI agent status:", isAgent);
    
    if (!isAgent) {
      console.log("Registering as AI agent...");
      const registerAIAgentTx = await contract.setAIAgent(owner.address, true);
      console.log("AI agent registration tx:", registerAIAgentTx.hash);
      await registerAIAgentTx.wait(1);
      console.log("AI agent registered successfully");
    } else {
      console.log("Already registered as AI agent");
    }
  } catch (error) {
    console.error("Error setting AI agent:", error.message);
  }
  
  // Register as user if not already registered
  try {
    const isRegistered = await isUserRegistered(owner.address);
    console.log("User registration status:", isRegistered);
    
    if (!isRegistered) {
      console.log("Registering as user...");
      const registerUserTx = await contract.registerUser();
      console.log("User registration tx:", registerUserTx.hash);
      await registerUserTx.wait(1);
      console.log("User registered successfully");
    } else {
      console.log("Already registered as user");
    }
  } catch (error) {
    console.error("Error registering user:", error.message);
    if (error.message.includes("User already registered")) {
      console.log("User was already registered");
    } else {
      console.error("Could not register user, but continuing...");
    }
  }
  
  // Check if we have any balance in the contract
  try {
    console.log("\n--- Checking Contract Balance ---");
    let contractBalance = await contract.getUserBalance(owner.address, WETH_ADDRESS);
    console.log("WETH balance in contract:", ethers.utils.formatEther(contractBalance));
    
    // Add code to deposit 0.0002 WETH before swapping
    console.log("\n--- Depositing Additional WETH ---");
    const depositAmount = ethers.utils.parseEther("0.0002");
    console.log(`Depositing ${ethers.utils.formatEther(depositAmount)} WETH to contract...`);
    
    try {
      // Check existing allowance first
      console.log("Checking existing allowance...");
      const currentAllowance = await weth.allowance(owner.address, contractAddress);
      console.log(`Current allowance: ${ethers.utils.formatEther(currentAllowance)} WETH`);
      
      // Only approve if needed
      if (currentAllowance.lt(depositAmount)) {
        console.log("Approving WETH spending...");
        const approveTx = await weth.approve(contractAddress, ethers.constants.MaxUint256); // Approve max amount to avoid future approvals
        console.log("Approve transaction hash:", approveTx.hash);
        const approveReceipt = await approveTx.wait(1);
        console.log("WETH approved in block:", approveReceipt.blockNumber);
      } else {
        console.log("Sufficient allowance already exists, skipping approval");
      }
      
      // Deposit WETH to contract
      const depositTx = await contract.depositTokens(WETH_ADDRESS, depositAmount);
      console.log("Deposit transaction hash:", depositTx.hash);
      
      // Wait for deposit with timeout
      console.log("Waiting for deposit confirmation...");
      const depositReceipt = await depositTx.wait(1);
      console.log("WETH deposited in block:", depositReceipt.blockNumber);
      console.log("Deposit successful!");
      
      // Check updated balance
      const updatedBalance = await contract.getUserBalance(owner.address, WETH_ADDRESS);
      console.log("Updated WETH balance in contract:", ethers.utils.formatEther(updatedBalance));
      
      // Update the contract balance for the swap
      contractBalance = updatedBalance;
    } catch (depositError) {
      console.error("Error in WETH deposit:", depositError.message);
      console.log("Continuing with existing balance...");
    }
    
    if (contractBalance.gt(0)) {
      console.log("We have some WETH in the contract! Can proceed with trading.");
      
      // Testing WETH to USDT swap based on the screenshot
      console.log("\n--- Testing Swap WETH to USDT ---");
      
      // Amount to swap - use entire balance
      const swapAmount = contractBalance;
      console.log(`Swapping ${ethers.utils.formatEther(swapAmount)} WETH to USDT...`);
      
      // Based on the screenshot, prioritize 0.05% fee tier
      const feeTiers = [500, 3000, 10000]; // Prioritize 0.05% fee tier shown in screenshot
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
      let successfulSwap = false;
      
      // First try WETH to USDT (based on screenshot)
      console.log("Checking WETH to USDT pool first (based on screenshot)...");
      
      for (const fee of feeTiers) {
        if (successfulSwap) break;
        
        try {
          console.log(`Testing WETH -> USDT with fee tier ${fee}...`);
          const quote = await quoterContract.callStatic.quoteExactInputSingle(
            WETH_ADDRESS,
            USDT_ADDRESS,
            fee,
            swapAmount,
            0
          );
          console.log(`Fee tier ${fee} is available for WETH -> USDT! Expected output: ${ethers.utils.formatUnits(quote.amountOut, 6)} USDT`);
          
          // Create trade parameters for WETH -> USDT
          const tradeParams = {
            tokenIn: WETH_ADDRESS,
            tokenOut: USDT_ADDRESS,
            fee: fee,
            amountIn: swapAmount,
            amountOutMinimum: 0,
            deadline: deadline
          };
          
          console.log("Executing swap from WETH to USDT...");
          console.log("Trade Params:", {
            tokenIn: tradeParams.tokenIn,
            tokenOut: tradeParams.tokenOut,
            fee: tradeParams.fee,
            amountIn: ethers.utils.formatEther(tradeParams.amountIn),
            deadline: new Date(tradeParams.deadline * 1000).toLocaleString()
          });
          
          try {
            const swapTx = await contract.executeSwap(owner.address, tradeParams, {
              gasLimit: 500000 // Set a manual gas limit
            });
            console.log("Swap transaction hash:", swapTx.hash);
            
            // Wait for swap confirmation
            console.log("Waiting for swap confirmation...");
            const swapReceipt = await swapTx.wait(1);
            
            // Find the TradeExecuted event in the logs
            const tradeEvent = swapReceipt.events.find(event => 
              event.event === 'TradeExecuted'
            );
            
            if (tradeEvent) {
              const amountOut = tradeEvent.args.amountOut;
              console.log(`Swap successful! Received ${ethers.utils.formatUnits(amountOut, 6)} USDT`);
              
              // Check updated balances
              const wethBalance = await contract.getUserBalance(owner.address, WETH_ADDRESS);
              const usdtBalance = await contract.getUserBalance(owner.address, USDT_ADDRESS);
              console.log(`Updated WETH balance: ${ethers.utils.formatEther(wethBalance)}`);
              console.log(`Updated USDT balance: ${ethers.utils.formatUnits(usdtBalance, 6)}`);
              
              successfulSwap = true;
              break;
            }
          } catch (swapError) {
            console.error("Error in WETH to USDT swap:", swapError.message);
          }
        } catch (quoteError) {
          console.log(`WETH -> USDT with fee tier ${fee} failed: ${quoteError.message}`);
        }
      }
      
      // If USDT swap didn't work, try USDC
      if (!successfulSwap) {
        console.log("\n--- USDT swap failed, trying WETH to USDC ---");
        
        for (const fee of feeTiers) {
          if (successfulSwap) break;
          
          try {
            console.log(`Testing WETH -> USDC with fee tier ${fee}...`);
            const quote = await quoterContract.callStatic.quoteExactInputSingle(
              WETH_ADDRESS,
              USDC_ADDRESS,
              fee,
              swapAmount,
              0
            );
            console.log(`Fee tier ${fee} is available for WETH -> USDC! Expected output: ${ethers.utils.formatUnits(quote.amountOut, 6)} USDC`);
            
            // Create trade parameters for WETH -> USDC
            const tradeParams = {
              tokenIn: WETH_ADDRESS,
              tokenOut: USDC_ADDRESS,
              fee: fee,
              amountIn: swapAmount,
              amountOutMinimum: 0,
              deadline: deadline
            };
            
            console.log("Executing swap from WETH to USDC...");
            console.log("Trade Params:", {
              tokenIn: tradeParams.tokenIn,
              tokenOut: tradeParams.tokenOut,
              fee: tradeParams.fee,
              amountIn: ethers.utils.formatEther(tradeParams.amountIn),
              deadline: new Date(tradeParams.deadline * 1000).toLocaleString()
            });
            
            try {
              const swapTx = await contract.executeSwap(owner.address, tradeParams, {
                gasLimit: 500000 // Set a manual gas limit
              });
              console.log("Swap transaction hash:", swapTx.hash);
              
              // Wait for swap confirmation
              console.log("Waiting for swap confirmation...");
              const swapReceipt = await swapTx.wait(1);
              
              // Find the TradeExecuted event in the logs
              const tradeEvent = swapReceipt.events.find(event => 
                event.event === 'TradeExecuted'
              );
              
              if (tradeEvent) {
                const amountOut = tradeEvent.args.amountOut;
                console.log(`Swap successful! Received ${ethers.utils.formatUnits(amountOut, 6)} USDC`);
                
                // Check updated balances
                const wethBalance = await contract.getUserBalance(owner.address, WETH_ADDRESS);
                const usdcBalance = await contract.getUserBalance(owner.address, USDC_ADDRESS);
                console.log(`Updated WETH balance: ${ethers.utils.formatEther(wethBalance)}`);
                console.log(`Updated USDC balance: ${ethers.utils.formatUnits(usdcBalance, 6)}`);
                
                successfulSwap = true;
                break;
              }
            } catch (swapError) {
              console.error("Error in WETH to USDC swap:", swapError.message);
            }
          } catch (quoteError) {
            console.log(`WETH -> USDC with fee tier ${fee} failed: ${quoteError.message}`);
          }
        }
      }
      
      // If neither USDT nor USDC worked, try DAI
      if (!successfulSwap) {
        console.log("\n--- USDT and USDC swaps failed, trying WETH to DAI ---");
        
        for (const fee of feeTiers) {
          if (successfulSwap) break;
          
          try {
            console.log(`Testing WETH -> DAI with fee tier ${fee}...`);
            const quote = await quoterContract.callStatic.quoteExactInputSingle(
              WETH_ADDRESS,
              DAI_ADDRESS,
              fee,
              swapAmount,
              0
            );
            console.log(`Fee tier ${fee} is available for WETH -> DAI! Expected output: ${ethers.utils.formatEther(quote.amountOut)} DAI`);
            
            // Create trade parameters for WETH -> DAI
            const tradeParams = {
              tokenIn: WETH_ADDRESS,
              tokenOut: DAI_ADDRESS,
              fee: fee,
              amountIn: swapAmount,
              amountOutMinimum: 0,
              deadline: deadline
            };
            
            console.log("Executing swap from WETH to DAI...");
            console.log("Trade Params:", {
              tokenIn: tradeParams.tokenIn,
              tokenOut: tradeParams.tokenOut,
              fee: tradeParams.fee,
              amountIn: ethers.utils.formatEther(tradeParams.amountIn),
              deadline: new Date(tradeParams.deadline * 1000).toLocaleString()
            });
            
            try {
              const swapTx = await contract.executeSwap(owner.address, tradeParams, {
                gasLimit: 500000 // Set a manual gas limit
              });
              console.log("Swap transaction hash:", swapTx.hash);
              
              // Wait for swap confirmation
              console.log("Waiting for swap confirmation...");
              const swapReceipt = await swapTx.wait(1);
              
              // Find the TradeExecuted event in the logs
              const tradeEvent = swapReceipt.events.find(event => 
                event.event === 'TradeExecuted'
              );
              
              if (tradeEvent) {
                const amountOut = tradeEvent.args.amountOut;
                console.log(`Swap successful! Received ${ethers.utils.formatEther(amountOut)} DAI`);
                
                // Check updated balances
                const wethBalance = await contract.getUserBalance(owner.address, WETH_ADDRESS);
                const daiBalance = await contract.getUserBalance(owner.address, DAI_ADDRESS);
                console.log(`Updated WETH balance: ${ethers.utils.formatEther(wethBalance)}`);
                console.log(`Updated DAI balance: ${ethers.utils.formatEther(daiBalance)}`);
                
                successfulSwap = true;
                break;
              }
            } catch (swapError) {
              console.error("Error in WETH to DAI swap:", swapError.message);
            }
          } catch (quoteError) {
            console.log(`WETH -> DAI with fee tier ${fee} failed: ${quoteError.message}`);
          }
        }
      }
      
      // If neither USDT nor USDC worked, try a multi-hop path: WETH -> USDC -> USDT
      if (!successfulSwap) {
        console.log("\n--- Trying multi-hop path: WETH -> USDC -> USDT ---");
        
        try {
          // Encode the path for multi-hop swap (WETH -> USDC -> USDT)
          // Format: tokenIn + fee + tokenOut + fee + tokenNext...
          const encodePath = (path, fees) => {
            if (path.length !== fees.length + 1) {
              throw new Error('path/fee lengths do not match');
            }
            
            let encoded = '0x';
            for (let i = 0; i < fees.length; i++) {
              // path[i] is tokenIn for this hop
              encoded += path[i].slice(2);  // remove 0x prefix
              
              // encode fee as hex and pad to 3 bytes (6 characters in hex)
              const fee = fees[i].toString(16).padStart(6, '0');
              encoded += fee;
            }
            
            // Finally add the last token
            encoded += path[path.length - 1].slice(2);
            return encoded;
          };
          
          // Encode a path WETH -> USDC -> USDT with 0.3% fee for both hops
          const pathWethUsdcUsdt = encodePath(
            [WETH_ADDRESS, USDC_ADDRESS, USDT_ADDRESS],
            [3000, 3000]  // 0.3% fee for each hop
          );
          
          console.log("Encoded path:", pathWethUsdcUsdt);
          
          // Try to get a quote for this path
          try {
            console.log("Checking if multi-hop path is available...");
            const multiHopQuote = await quoterContract.callStatic.quoteExactInput(
              pathWethUsdcUsdt,
              swapAmount
            );
            
            console.log(`Multi-hop path is available! Expected output: ${ethers.utils.formatUnits(multiHopQuote.amountOut, 6)} USDT`);
            
            // Implement multi-hop swap logic here if your contract supports it
            console.log("Contract doesn't have explicit multi-hop swap function. Using exactInput path directly...");
            
            // Check if your contract has an executeMultiHopSwap function
            try {
              console.log("Testing if contract supports multi-hop swaps...");
              // Try calling executeMultiHopSwap if it exists
              const multiHopSwapTx = await contract.executeMultiHopSwap(
                owner.address,
                pathWethUsdcUsdt,
                swapAmount,
                0, // amountOutMinimum
                deadline,
                {
                  gasLimit: 700000 // Higher gas limit for multi-hop swap
                }
              );
              
              console.log("Multi-hop swap transaction hash:", multiHopSwapTx.hash);
              const multiHopReceipt = await multiHopSwapTx.wait(1);
              console.log("Multi-hop swap successful! Check balances for results.");
              
              // Check updated balances
              const wethBalance = await contract.getUserBalance(owner.address, WETH_ADDRESS);
              const usdtBalance = await contract.getUserBalance(owner.address, USDT_ADDRESS);
              const usdcBalance = await contract.getUserBalance(owner.address, USDC_ADDRESS);
              
              console.log(`Updated WETH balance: ${ethers.utils.formatEther(wethBalance)}`);
              console.log(`Updated USDT balance: ${ethers.utils.formatUnits(usdtBalance, 6)}`);
              console.log(`Updated USDC balance: ${ethers.utils.formatUnits(usdcBalance, 6)}`);
              
              successfulSwap = true;
            } catch (multihopError) {
              console.error("Error in multi-hop swap or function doesn't exist:", multihopError.message);
              console.log("Your contract may need to implement multi-hop swapping for this to work.");
            }
          } catch (pathQuoteError) {
            console.error("Multi-hop path not available:", pathQuoteError.message);
          }
        } catch (pathError) {
          console.error("Error encoding path:", pathError.message);
        }
      }
      
      if (!successfulSwap) {
        console.error("All swap attempts failed. Please check contract and pool configuration.");
        
        // Check updated balances anyway
        try {
          const wethBalance = await contract.getUserBalance(owner.address, WETH_ADDRESS);
          const usdtBalance = await contract.getUserBalance(owner.address, USDT_ADDRESS);
          const usdcBalance = await contract.getUserBalance(owner.address, USDC_ADDRESS);
          const daiBalance = await contract.getUserBalance(owner.address, DAI_ADDRESS);
          
          console.log(`Current WETH balance: ${ethers.utils.formatEther(wethBalance)}`);
          console.log(`Current USDT balance: ${ethers.utils.formatUnits(usdtBalance, 6)}`);
          console.log(`Current USDC balance: ${ethers.utils.formatUnits(usdcBalance, 6)}`);
          console.log(`Current DAI balance: ${ethers.utils.formatEther(daiBalance)}`);
        } catch (balanceError) {
          console.error("Error checking balances:", balanceError.message);
        }
      }
    } else {
      console.log("No WETH balance in contract. Need to deposit first before trading.");
    }
  } catch (error) {
    console.error("Error checking contract balance:", error.message);
  }
  
  console.log("\nScript completed. Please review the logs for any issues.");
  process.exit(0); // Exit cleanly to prevent hanging
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });