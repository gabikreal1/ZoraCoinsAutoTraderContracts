require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

// Load environment variables
const INFURA_API_KEY = process.env.INFURA_API_KEY || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0000000000000000000000000000000000000000000000000000000000000000";

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.7.6", // Needed for Uniswap V3 compatibility
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
        blockNumber: 15968581, // Use a specific block for repeatability
      },
    },
    
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY],
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY],
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY],
      gasPrice: 20000000000, // 20 gwei
    },
    zora: {
      url: "https://rpc.zora.energy",
      accounts: [PRIVATE_KEY],
    },
    "zora-sepolia": {
      url: "https://sepolia.rpc.zora.energy",
      accounts: [PRIVATE_KEY],
    },
    reactive: {
      url: "https://kopli-rpc.rnk.dev/",
      accounts: ["0xee4531e98ade999bfe6afa3dc6454adb2d927fb2b691ced9be872cf05ebed8f5"]
    },
    base: {
      url: "https://mainnet.base.org",
      accounts: ["0xee4531e98ade999bfe6afa3dc6454adb2d927fb2b691ced9be872cf05ebed8f5"],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
}; 