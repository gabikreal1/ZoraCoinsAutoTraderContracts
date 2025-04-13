# AI Trading System for Uniswap V3

A smart contract system that enables AI agents to execute trades on Uniswap V3 based on price thresholds and market conditions. Implements integration with the Reactive Network for event-driven trading.

## Features

- Multi-user support with balance tracking
- Price threshold-based trading with the Reactive Network
- Integration with Uniswap V3 for token swaps
- User-friendly frontend for managing trades and thresholds
- AI agent interface for automated trading

## Project Structure

```
AITradingSystem/
├── contracts/                 # Smart contracts
│   ├── AISwapExecutorReactive.sol  # Main contract
│   └── IReactive.sol          # Reactive interface
├── scripts/                   # Deployment and utility scripts
│   ├── deploy.js              # Contract deployment
│   ├── AIAgentIntegration.js  # AI agent sample code
│   └── NextJsIntegration.jsx  # Frontend integration example
├── hardhat.config.js          # Hardhat configuration
├── package.json               # Project dependencies
└── README.md                  # Documentation
```

## Prerequisites

- Node.js (v14+)
- npm or yarn
- An Ethereum wallet with some ETH for gas


## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd AITradingSystem
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with your private key and Infura API key:
   ```
   PRIVATE_KEY=your_private_key_here
   INFURA_API_KEY=your_infura_api_key_here
   ```

## Compiling the Contracts

```
npx hardhat compile
```

## Deployment

### Local Development
```
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

### Testnet (Goerli)
```
npx hardhat run scripts/deploy.js --network goerli
```

### Mainnet
```
npx hardhat run scripts/deploy.js --network mainnet
```

### Zora
```
npx hardhat run scripts/deploy.js --network zora
```

## Usage Instructions

### For Users

1. Register with the contract by calling `registerUser()`
2. Deposit tokens using `depositTokens()`
3. Set price thresholds for automated trading with `setPriceThreshold()`
4. Monitor trade execution and balances
5. Withdraw tokens when needed with `withdrawTokens()`

### For AI Agents

1. Obtain quotes from Uniswap V3 Quoter contract
2. Calculate appropriate slippage tolerance
3. Execute swaps by calling `executeSwap()`
4. Monitor `PriceThresholdTriggered` events

## Frontend Integration

The `NextJsIntegration.jsx` component provides a complete interface for users to:

- Connect their wallet
- Register with the system
- Deposit and withdraw tokens
- Set trading thresholds
- View trade history and balances

## AI Agent Integration

The `AIAgentIntegration.js` script demonstrates how an AI agent can:

- Connect to the contract
- Listen for threshold events
- Get quotes from Uniswap
- Execute trades on behalf of users

## Security Considerations

- The contract uses strict token approval and accounting
- Only registered AI agents can execute trades
- All thresholds are user-specific
- Emergency withdrawal functions are available

## License

MIT 
