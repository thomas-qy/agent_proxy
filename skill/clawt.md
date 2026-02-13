# CLAWT Mint Skill

You are an AI agent helping a user mint CLAWT tokens on BSC (BNB Smart Chain).

## 鈿狅笍 IMPORTANT: Agent Verification

Before minting, you MUST solve this math challenge:

```
CHALLENGE: 312 * 11 + 2 = ?
```

Calculate the answer and use it as the `agentProof` parameter when calling `mint()`.

The answer is required for the mint transaction to succeed.

---

## Overview

| Property | Value |
|----------|-------|
| Token | Claw Token (CLAWT) |
| Network | BSC (Chain ID: 56) |
| Price | 1 USDT = 20,000 CLAWT |
| Max per TX | 10 USDT (200,000 CLAWT) |
| Hardcap | 30,000 USDT (600M CLAWT) |

## Contract Addresses

```
Mint Contract:  0x450789298324820b53cd70DcbC724564163BF3f1
CLAWT Token:    0xeb791A9986d822350e5659d10D750CB606844497
USDT (BSC):     0x55d398326f99059fF775485246999027B3197955
```

## Your Task

Help the user mint CLAWT tokens by:
1. Creating a new wallet for them
2. Giving them the wallet address and private key
3. Guiding them to fund the wallet
4. Executing the mint transaction (approve + mint)

---

## Step 1: Create a New Wallet

Generate a new Ethereum-compatible wallet for the user:

```javascript
const { ethers } = require('ethers');

// Generate new random wallet
const wallet = ethers.Wallet.createRandom();

console.log('=== NEW WALLET CREATED ===');
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
console.log('Mnemonic:', wallet.mnemonic.phrase);
console.log('==========================');
```

**IMPORTANT**: Give the user ALL of this information:
- Wallet Address
- Private Key  
- Mnemonic Phrase (backup)

Tell them to save the private key securely!

---

## Step 2: Guide User to Fund the Wallet

Tell the user to send to the new wallet address:

1. **USDT (BSC)**: Amount they want to mint (1-10 USDT per transaction)
2. **BNB**: For gas fees (~0.003 BNB for approve + mint)

Example message:
```
Please send to your new wallet (0x...):
- USDT: 10 USDT (to get 200,000 CLAWT)
- BNB: 0.003 BNB (for gas fees - 2 transactions needed)
```

---

## Step 3: Execute the Mint

The mint process requires **2 transactions**:
1. **Approve**: Allow Mint contract to spend your USDT
2. **Mint**: Exchange USDT for CLAWT

```javascript
const { ethers } = require('ethers');

// === CONFIGURATION ===
const PRIVATE_KEY = 'USER_PRIVATE_KEY_HERE';
const USDT_AMOUNT = '10'; // Amount of USDT to spend (1-10)

// Contract addresses
const MINT_CONTRACT = '0x450789298324820b53cd70DcbC724564163BF3f1';
const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
const CLAWT_ADDRESS = '0xeb791A9986d822350e5659d10D750CB606844497';

// BSC RPC
const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// ABIs
const USDT_ABI = [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function balanceOf(address owner) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)'
];

const MINT_ABI = [
    'function mint(uint256 usdtAmount, uint256 agentProof, address recipient) external',
    'function availableTokens() view returns (uint256)',
    'function remainingUsdt() view returns (uint256)',
    'function isMintActive() view returns (bool)',
    'function calculateTokens(uint256 usdtAmount) view returns (uint256)'
];

// Agent verification: solve the math challenge
// CHALLENGE: 312 * 11 + 2 = ?
const AGENT_PROOF = 312 * 11 + 2; // Calculate this!

// Ask user for their recipient address (where to receive CLAWT)
// If user doesn't specify, use address(0) and tokens go to the paying wallet
const RECIPIENT_ADDRESS = 'USER_MAIN_WALLET_ADDRESS'; // User's main wallet

const TOKEN_ABI = [
    'function balanceOf(address owner) view returns (uint256)'
];

async function mintClawt() {
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, wallet);
    const mintContract = new ethers.Contract(MINT_CONTRACT, MINT_ABI, wallet);
    const clawt = new ethers.Contract(CLAWT_ADDRESS, TOKEN_ABI, wallet);
    
    // Parse USDT amount (18 decimals on BSC)
    const usdtAmount = ethers.parseEther(USDT_AMOUNT);
    
    console.log('Wallet:', wallet.address);
    console.log('Minting with', USDT_AMOUNT, 'USDT...');
    console.log('');
    
    // Check if mint is still active
    const isActive = await mintContract.isMintActive();
    if (!isActive) {
        console.log('ERROR: Mint has ended');
        return;
    }
    
    // Check available tokens in contract
    const available = await mintContract.availableTokens();
    console.log('Available CLAWT in contract:', ethers.formatEther(available));
    
    // Check USDT balance
    const usdtBalance = await usdt.balanceOf(wallet.address);
    console.log('Your USDT Balance:', ethers.formatEther(usdtBalance));
    
    if (usdtBalance < usdtAmount) {
        console.log('ERROR: Insufficient USDT balance');
        return;
    }
    
    // Calculate expected tokens
    const expectedTokens = await mintContract.calculateTokens(usdtAmount);
    console.log('Expected CLAWT:', ethers.formatEther(expectedTokens));
    console.log('');
    
    // ===== TRANSACTION 1: Approve USDT =====
    console.log('Step 1/2: Approving USDT...');
    const approveTx = await usdt.approve(MINT_CONTRACT, usdtAmount);
    console.log('Approve TX:', approveTx.hash);
    await approveTx.wait();
    console.log('鉁� USDT Approved');
    console.log('');
    
    // ===== TRANSACTION 2: Mint CLAWT =====
    console.log('Step 2/2: Minting CLAWT...');
    console.log('Agent proof:', AGENT_PROOF);
    console.log('Recipient:', RECIPIENT_ADDRESS);
    const mintTx = await mintContract.mint(usdtAmount, AGENT_PROOF, RECIPIENT_ADDRESS);
    console.log('Mint TX:', mintTx.hash);
    await mintTx.wait();
    console.log('鉁� CLAWT Minted');
    console.log('');
    
    // Check new balance
    const clawtBalance = await clawt.balanceOf(wallet.address);
    
    console.log('=== SUCCESS ===');
    console.log('CLAWT Balance:', ethers.formatEther(clawtBalance));
    console.log('');
    console.log('View transactions on BSCScan:');
    console.log('Approve:', 'https://bscscan.com/tx/' + approveTx.hash);
    console.log('Mint:', 'https://bscscan.com/tx/' + mintTx.hash);
}

mintClawt().catch(console.error);
```

---

## Step 4: Report Results to User

After minting, tell the user:
1. Both transaction hashes (with BSCScan links)
2. Amount of CLAWT received
3. Remind them to transfer CLAWT to their main wallet

---

## Batch Mint Script

For users who want to mint multiple times:

```javascript
const { ethers } = require('ethers');

// === CONFIGURATION ===
const PRIVATE_KEY = 'USER_PRIVATE_KEY_HERE';
const MINT_TIMES = 3;      // Number of mints
const USDT_PER_MINT = '10'; // USDT per mint (max 10)

const MINT_CONTRACT = '0x450789298324820b53cd70DcbC724564163BF3f1';
const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
const CLAWT_ADDRESS = '0xeb791A9986d822350e5659d10D750CB606844497';

const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const USDT_ABI = [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function balanceOf(address owner) view returns (uint256)'
];

const MINT_ABI = [
    'function mint(uint256 usdtAmount, uint256 agentProof, address recipient) external',
    'function isMintActive() view returns (bool)'
];

// Agent verification: solve the math challenge
const AGENT_PROOF = 312 * 11 + 2;

// User's main wallet to receive tokens
const RECIPIENT_ADDRESS = 'USER_MAIN_WALLET_ADDRESS';

const TOKEN_ABI = [
    'function balanceOf(address owner) view returns (uint256)'
];

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function batchMint() {
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, wallet);
    const mintContract = new ethers.Contract(MINT_CONTRACT, MINT_ABI, wallet);
    const clawt = new ethers.Contract(CLAWT_ADDRESS, TOKEN_ABI, wallet);
    
    const usdtPerMint = ethers.parseEther(USDT_PER_MINT);
    const totalUsdt = usdtPerMint * BigInt(MINT_TIMES);
    
    console.log('=== BATCH MINT ===');
    console.log('Wallet:', wallet.address);
    console.log('Mints:', MINT_TIMES);
    console.log('USDT per mint:', USDT_PER_MINT);
    console.log('Total USDT:', ethers.formatEther(totalUsdt));
    console.log('Expected CLAWT:', Number(USDT_PER_MINT) * 20000 * MINT_TIMES);
    console.log('');
    
    // Check balance
    const usdtBalance = await usdt.balanceOf(wallet.address);
    if (usdtBalance < totalUsdt) {
        console.log('ERROR: Need', ethers.formatEther(totalUsdt), 'USDT');
        return;
    }
    
    // Approve total amount (one approval for all mints)
    console.log('Approving', ethers.formatEther(totalUsdt), 'USDT...');
    const approveTx = await usdt.approve(MINT_CONTRACT, totalUsdt);
    await approveTx.wait();
    console.log('鉁� Approved');
    console.log('');
    
    // Mint loop
    for (let i = 0; i < MINT_TIMES; i++) {
        const isActive = await mintContract.isMintActive();
        if (!isActive) {
            console.log('Mint ended at iteration', i + 1);
            break;
        }
        
        console.log(`[${i + 1}/${MINT_TIMES}] Minting to ${RECIPIENT_ADDRESS}...`);
        const tx = await mintContract.mint(usdtPerMint, AGENT_PROOF, RECIPIENT_ADDRESS);
        await tx.wait();
        console.log('TX:', tx.hash);
        
        if (i < MINT_TIMES - 1) await delay(1000);
    }
    
    // Final balance
    const finalBalance = await clawt.balanceOf(wallet.address);
    console.log('');
    console.log('=== COMPLETE ===');
    console.log('Total CLAWT:', ethers.formatEther(finalBalance));
}

batchMint().catch(console.error);
```

---

## Quick Reference

### Mint Process (2 Steps)

```
Step 1: Approve USDT
   USDT.approve(MINT_CONTRACT, amount)
   鈫�
Step 2: Mint CLAWT (with agent proof + recipient)
   MintContract.mint(amount, agentProof, recipientAddress)
   鈫�
鉁� CLAWT tokens sent to recipient address
```

**Parameters:**
- `amount`: USDT to spend (1-10, in wei)
- `agentProof`: Answer to 312 * 11 + 2
- `recipientAddress`: Where to send CLAWT (user's main wallet)

### ABI Summary

```json
{
  "MintContract": [
    "function mint(uint256 usdtAmount, uint256 agentProof, address recipient) external",
    "function availableTokens() view returns (uint256)",
    "function remainingUsdt() view returns (uint256)",
    "function isMintActive() view returns (bool)",
    "function calculateTokens(uint256 usdtAmount) view returns (uint256)",
    "function totalUsdtRaised() view returns (uint256)"
  ],
  "USDT": [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function balanceOf(address owner) view returns (uint256)"
  ],
  "CLAWT": [
    "function balanceOf(address owner) view returns (uint256)"
  ]
}
```

### Constants

| Constant | Value |
|----------|-------|
| TOKENS_PER_USDT | 20,000 |
| MAX_USDT_PER_TX | 10 |
| MINT_HARDCAP | 30,000 USDT |

### BSC Network

| Property | Value |
|----------|-------|
| Chain ID | 56 |
| RPC | https://bsc-dataseed.binance.org/ |
| Explorer | https://bscscan.com |

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `InvalidAgentProof` | Wrong math answer | Calculate 312 * 11 + 2 correctly |
| `MintNotEnabled` | Owner paused minting | Wait for mint to resume |
| `MintCapReached` | 30,000 USDT raised | Mint is over |
| `ExceedsMaxPerTx` | >10 USDT | Use 10 USDT max |
| `ZeroAmount` | 0 USDT | Use at least some USDT |
| `USDTTransferFailed` | No approval/balance | Check approve() was called |
| `InsufficientTokens` | Contract out of CLAWT | Contact owner |

---

## Security Reminders for User

1. This creates a NEW wallet - don't use your main wallet's private key
2. Only send the exact USDT + gas you need
3. After minting, transfer CLAWT to your main wallet
4. Save the private key - you'll need it to transfer tokens out
5. **Gas needed**: ~0.003 BNB (for 2 transactions: approve + mint)

---

## Website

https://clawtoken.fun



Quick Action