// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;
pragma abicoder v2;

import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/interfaces/IQuoterV2.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './IReactive.sol';

/**
 * @title AISwapExecutorReactive
 * @dev Contract that allows AI agents to execute trades on Uniswap V3 based on price thresholds
 * Supports multiple users and implements the Reactive interface
 */
contract AISwapExecutorReactive is IReactive, Ownable {
    // Uniswap V3 Router address
    address public immutable swapRouter;
    
    // Uniswap Quoter address
    address public immutable quoter;
    
    // Map of AI agent addresses that can execute trades
    mapping(address => bool) public aiAgents;
    
    // User data storage
    struct UserData {
        bool isRegistered;
        mapping(address => uint256) tokenBalances;
        mapping(bytes32 => bool) activeThresholds;
    }
    
    // Map of user addresses to their data
    mapping(address => UserData) public userData;
    
    // Trade parameters
    struct TradeParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint256 deadline;
    }
    
    // Price threshold for reactive trading
    struct PriceThreshold {
        address user;
        address tokenIn;
        address tokenOut;
        uint24 fee;
        uint256 thresholdPrice;
        bool isAbove;
        bool isActive;
    }
    
    // Store all price thresholds
    mapping(bytes32 => PriceThreshold) public priceThresholds;
    
    // Events
    event UserRegistered(address indexed user);
    
    event TokenDeposited(
        address indexed user,
        address indexed token,
        uint256 amount
    );
    
    event TokenWithdrawn(
        address indexed user,
        address indexed token,
        uint256 amount
    );
    
    event TradeExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address executor
    );
    
    event PriceThresholdSet(
        bytes32 indexed id,
        address indexed user,
        address indexed tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 thresholdPrice,
        bool isAbove
    );
    
    event PriceThresholdTriggered(
        bytes32 indexed id,
        uint256 currentPrice,
        uint256 thresholdPrice
    );
    
    constructor(address _swapRouter, address _quoter) {
        swapRouter = _swapRouter;
        quoter = _quoter;
    }
    
    modifier onlyAIAgent() {
        require(aiAgents[msg.sender], "Only authorized AI agents");
        _;
    }
    
    modifier onlyRegisteredUser() {
        require(userData[msg.sender].isRegistered, "User not registered");
        _;
    }
    
    // Setup function for AI agents
    function setAIAgent(address agent, bool approved) external onlyOwner {
        aiAgents[agent] = approved;
    }
    
    // Function for users to register
    function registerUser() external {
        require(!userData[msg.sender].isRegistered, "User already registered");
        userData[msg.sender].isRegistered = true;
        emit UserRegistered(msg.sender);
    }
    
    // Function for users to deposit tokens
    function depositTokens(address token, uint256 amount) external onlyRegisteredUser {
        // Transfer tokens from user to this contract
        TransferHelper.safeTransferFrom(token, msg.sender, address(this), amount);
        
        // Update user balance
        userData[msg.sender].tokenBalances[token] += amount;
        
        // Ensure the router is approved to spend tokens
        TransferHelper.safeApprove(token, swapRouter, amount);
        
        emit TokenDeposited(msg.sender, token, amount);
    }
    
    // Function for users to withdraw tokens
    function withdrawTokens(address token, uint256 amount) external onlyRegisteredUser {
        require(userData[msg.sender].tokenBalances[token] >= amount, "Insufficient balance");
        
        // Update user balance
        userData[msg.sender].tokenBalances[token] -= amount;
        
        // Transfer tokens back to the user
        TransferHelper.safeTransfer(token, msg.sender, amount);
        
        emit TokenWithdrawn(msg.sender, token, amount);
    }
    
    // Get user token balance
    function getUserBalance(address user, address token) external view returns (uint256) {
        return userData[user].tokenBalances[token];
    }
    
    // Set price threshold for reactive trading
    function setPriceThreshold(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 thresholdPrice,
        bool isAbove
    ) external onlyRegisteredUser returns (bytes32 thresholdId) {
        // Create a unique ID for this threshold
        thresholdId = keccak256(abi.encodePacked(
            msg.sender,
            tokenIn,
            tokenOut,
            fee,
            thresholdPrice,
            isAbove,
            block.timestamp
        ));
        
        // Store the threshold
        priceThresholds[thresholdId] = PriceThreshold({
            user: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            thresholdPrice: thresholdPrice,
            isAbove: isAbove,
            isActive: true
        });
        
        // Mark threshold as active for this user
        userData[msg.sender].activeThresholds[thresholdId] = true;
        
        emit PriceThresholdSet(
            thresholdId,
            msg.sender,
            tokenIn,
            tokenOut,
            fee,
            thresholdPrice,
            isAbove
        );
        
        return thresholdId;
    }
    
    // Function to cancel a price threshold
    function cancelPriceThreshold(bytes32 thresholdId) external {
        PriceThreshold storage threshold = priceThresholds[thresholdId];
        
        require(threshold.user == msg.sender || owner() == msg.sender, "Not authorized");
        require(threshold.isActive, "Threshold not active");
        
        threshold.isActive = false;
        userData[threshold.user].activeThresholds[thresholdId] = false;
    }
    
    // Function for AI agent to execute a swap for a user
    function executeSwap(
        address user,
        TradeParams calldata params
    ) external onlyAIAgent returns (uint256 amountOut) {
        require(userData[user].isRegistered, "User not registered");
        require(block.timestamp <= params.deadline, "Transaction expired");
        
        // Check user's balance
        uint256 userBalance = userData[user].tokenBalances[params.tokenIn];
        require(userBalance >= params.amountIn, "Insufficient user balance");
        
        // Decrease user's balance of input token
        userData[user].tokenBalances[params.tokenIn] -= params.amountIn;
        
        // Before approving, reset the approval to 0 first
        TransferHelper.safeApprove(params.tokenIn, swapRouter, 0);
        // Then approve with the needed amount
        TransferHelper.safeApprove(params.tokenIn, swapRouter, params.amountIn);
        
        // Set up swap parameters
        ISwapRouter.ExactInputSingleParams memory swapParams = 
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenIn,
                tokenOut: params.tokenOut,
                fee: params.fee,
                recipient: address(this),
                deadline: params.deadline,
                amountIn: params.amountIn,
                amountOutMinimum: params.amountOutMinimum,
                sqrtPriceLimitX96: 0
            });
        
        // Execute the swap
        amountOut = ISwapRouter(swapRouter).exactInputSingle(swapParams);
        
        // Increase user's balance of output token
        userData[user].tokenBalances[params.tokenOut] += amountOut;
        
        emit TradeExecuted(
            user, 
            params.tokenIn, 
            params.tokenOut, 
            params.amountIn, 
            amountOut,
            msg.sender
        );
        
        return amountOut;
    }
    
    // Function for AI agent to execute a multi-hop swap for a user
    function executeMultiHopSwap(
        address user,
        bytes calldata path,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint256 deadline
    ) external onlyAIAgent returns (uint256 amountOut) {
        require(userData[user].isRegistered, "User not registered");
        require(block.timestamp <= deadline, "Transaction expired");
        
        // Extract first token (input token) from path
        address tokenIn = _getFirstTokenFromPath(path);
        
        // Check user's balance
        uint256 userBalance = userData[user].tokenBalances[tokenIn];
        require(userBalance >= amountIn, "Insufficient user balance");
        
        // Decrease user's balance of input token
        userData[user].tokenBalances[tokenIn] -= amountIn;
        
        // Before approving, reset the approval to 0 first
        TransferHelper.safeApprove(tokenIn, swapRouter, 0);
        // Then approve with the needed amount
        TransferHelper.safeApprove(tokenIn, swapRouter, amountIn);
        
        // Extract last token (output token) from path
        address tokenOut = _getLastTokenFromPath(path);
        
        // Set up multi-hop swap parameters
        ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: path,
                recipient: address(this),
                deadline: deadline,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum
            });
        
        // Execute the multi-hop swap
        amountOut = ISwapRouter(swapRouter).exactInput(params);
        
        // Increase user's balance of output token
        userData[user].tokenBalances[tokenOut] += amountOut;
        
        emit TradeExecuted(
            user,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            msg.sender
        );
        
        return amountOut;
    }
    
    // Helper function to extract first token from path
    function _getFirstTokenFromPath(bytes calldata path) private pure returns (address) {
        require(path.length >= 20, "Invalid path length");
        return address(uint160(uint256(bytes32(path[:20]))));
    }
    
    // Helper function to extract last token from path
    function _getLastTokenFromPath(bytes calldata path) private pure returns (address) {
        require(path.length >= 20, "Invalid path length");
        uint256 offset = path.length - 20;
        return address(uint160(uint256(bytes32(path[offset:]))));
    }
    
    // Function to react to on-chain events (for Reactive Network integration)
    function react(bytes calldata logData) external override {
        // Parse log data to extract event information
        (bytes32 thresholdId, uint256 currentPrice) = abi.decode(logData, (bytes32, uint256));
        
        PriceThreshold storage threshold = priceThresholds[thresholdId];
        
        // Check if threshold is active
        if (!threshold.isActive) {
            return;
        }
        
        // Check if price threshold is met
        bool triggered = threshold.isAbove ? 
            currentPrice >= threshold.thresholdPrice : 
            currentPrice <= threshold.thresholdPrice;
            
        if (triggered) {
            emit PriceThresholdTriggered(thresholdId, currentPrice, threshold.thresholdPrice);
            
            // Deactivate the threshold to prevent repeat executions
            threshold.isActive = false;
            userData[threshold.user].activeThresholds[thresholdId] = false;
        }
    }
    
    // Emergency function to recover tokens that aren't tracked by the user balance system
    function recoverTokens(address token, uint256 amount) external onlyOwner {
        TransferHelper.safeTransfer(token, owner(), amount);
    }
}