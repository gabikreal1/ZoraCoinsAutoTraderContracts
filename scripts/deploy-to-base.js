// scripts/deploy-to-base.js
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying AISwapExecutorReactive to Base network...");

  // Base network addresses for Uniswap V3
  const SWAP_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481"; // Uniswap V3 SwapRouter on Base
  const QUOTER = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a"; // Uniswap Quoter on Base

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");

  // Get the contract factory
  const AISwapExecutor = await ethers.getContractFactory("AISwapExecutorReactive");
  
  // Deploy the contract with constructor arguments
  console.log("Deploying contract with parameters:");
  console.log("- SwapRouter:", SWAP_ROUTER);
  console.log("- Quoter:", QUOTER);
  
  const contract = await AISwapExecutor.deploy(SWAP_ROUTER, QUOTER);
  await contract.deployed();

  console.log("AISwapExecutorReactive deployed to:", contract.address);
  console.log("Transaction hash:", contract.deployTransaction.hash);

  // Wait for a few confirmations
  console.log("Waiting for confirmations...");
  await contract.deployTransaction.wait(5);
  console.log("Deployment confirmed with 5 blocks!");

  // Set deployer as AI agent
  console.log("Setting deployer as AI agent...");
  const setAIAgentTx = await contract.setAIAgent(deployer.address, true);
  await setAIAgentTx.wait(2);
  console.log("Deployer set as AI agent");

  // Register deployer as user
  console.log("Registering deployer as user...");
  const registerUserTx = await contract.registerUser();
  await registerUserTx.wait(2);
  console.log("Deployer registered as user");

  console.log("Deployment and setup completed successfully!");
  console.log("Contract address:", contract.address);
  console.log("");
  console.log("To verify the contract on Basescan, run:");
  console.log(`npx hardhat verify --network base ${contract.address} ${SWAP_ROUTER} ${QUOTER}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 