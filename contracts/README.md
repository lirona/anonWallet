# ANON Token Contract

A comprehensive ERC20 token with advanced features including role-based access control, pausability, capped supply, welcome bonuses, and coupon redemption.

## Features

- **ERC20 Standard**: Fully compliant ERC20 token
- **Capped Supply**: Maximum supply of 21 billion tokens (21,000,000,000 * 10^18 wei)
- **Access Control**: Role-based permissions for different operations
- **Pausable**: Emergency pause functionality for security
- **Welcome Bonus**: One-time bonus for new users (101 ANON)
- **Organization Distribution**: Bulk distribution to multiple addresses
- **Governance Distribution**: Minting for governance purposes
- **Coupon System**: Redeem tokens using unique coupon codes

## Roles

The contract uses OpenZeppelin's AccessControl for role management:

- **DEFAULT_ADMIN_ROLE**: Can grant/revoke all roles
- **ORGS_DISTRIBUTOR_ROLE**: Can distribute tokens to organizations
- **MINTER_ROLE**: Can mint tokens for governance
- **COUPON_CREATOR_ROLE**: Can create and delete coupon codes
- **PAUSER_ROLE**: Can pause/unpause the contract

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Node.js and npm (for environment variable management)
- An Ethereum wallet with Sepolia ETH for deployment
- Etherscan API key (for contract verification)

## Installation

1. **Install Foundry dependencies**:
```bash
cd contracts
forge install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
```

Edit `.env` and fill in:
```bash
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key

# Role addresses (can all be the same for testing)
OWNER_ADDRESS=0x...
ORGS_DISTRIBUTOR_ADDRESS=0x...
MINTER_ADDRESS=0x...
COUPON_CREATOR_ADDRESS=0x...
PAUSER_ADDRESS=0x...
```

## Testing

Run all tests:
```bash
FOUNDRY_PROFILE=token forge test
```

Run tests with verbosity:
```bash
FOUNDRY_PROFILE=token forge test -vvv
```

Run specific test:
```bash
FOUNDRY_PROFILE=token forge test --match-test testWelcomeBonus
```

Run fuzz tests:
```bash
FOUNDRY_PROFILE=token forge test --match-test testFuzz
```

## Deployment

### Deploy to Sepolia Testnet

1. **Ensure you have Sepolia ETH** in your deployer wallet

2. **Load environment variables**:
```bash
source .env
```

3. **Deploy the contract**:
```bash
FOUNDRY_PROFILE=token forge script script/token/DeployANON.s.sol:Deploy --rpc-url $SEPOLIA_RPC_URL --broadcast
```

4. **Save the deployed contract address** from the output

### Deploy to Mainnet

⚠️ **WARNING**: Deploying to mainnet requires real ETH and is irreversible!

```bash
FOUNDRY_PROFILE=token forge script script/token/DeployANON.s.sol:Deploy --rpc-url $MAINNET_RPC_URL --broadcast --verify
```

## Verification

Verify the contract on Etherscan after deployment:

```bash
FOUNDRY_PROFILE=token forge verify-contract \
  --chain sepolia \
  <CONTRACT_ADDRESS> \
  src/token/ERC20.sol:ANON \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

Example:
```bash
FOUNDRY_PROFILE=token forge verify-contract \
  --chain sepolia \
  0x52BF349eAB9DACb0AC8C5980a4C4038C2751304a \
  src/token/ERC20.sol:ANON \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

## Interacting with the Contract

### Using Foundry Cast

#### Read Functions

**Get token info**:
```bash
# Get total supply
cast call <CONTRACT_ADDRESS> "totalSupply()(uint256)" --rpc-url $SEPOLIA_RPC_URL

# Get balance of an address
cast call <CONTRACT_ADDRESS> "balanceOf(address)(uint256)" <ADDRESS> --rpc-url $SEPOLIA_RPC_URL

# Check if user claimed welcome bonus
cast call <CONTRACT_ADDRESS> "hasClaimedWelcomeBonus(address)(bool)" <ADDRESS> --rpc-url $SEPOLIA_RPC_URL
```

#### Write Functions

**Claim welcome bonus** (101 ACT):
```bash
cast send <CONTRACT_ADDRESS> \
  "claimWelcomeBonus()" \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

**Distribute to organizations** (requires ORGS_DISTRIBUTOR_ROLE):
```bash
cast send <CONTRACT_ADDRESS> \
  "distributeOrgs(address[],uint256[])" \
  "[0xAddress1,0xAddress2]" \
  "[1000000000000000000,2000000000000000000]" \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

**Mint for governance** (requires MINTER_ROLE):
```bash
cast send <CONTRACT_ADDRESS> \
  "mintGovernance(address,uint256)" \
  <RECIPIENT_ADDRESS> \
  1000000000000000000 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

**Create coupon** (requires COUPON_CREATOR_ROLE):
```bash
cast send <CONTRACT_ADDRESS> \
  "createCoupon(string,uint256)" \
  "WELCOME2024" \
  100000000000000000000 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

**Redeem coupon**:
```bash
cast send <CONTRACT_ADDRESS> \
  "redeemCoupon(string)" \
  "WELCOME2024" \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

**Pause contract** (requires PAUSER_ROLE):
```bash
cast send <CONTRACT_ADDRESS> \
  "pause()" \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

**Unpause contract** (requires PAUSER_ROLE):
```bash
cast send <CONTRACT_ADDRESS> \
  "unpause()" \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Using Etherscan

Once verified, you can interact with the contract directly on Etherscan:

1. Go to https://sepolia.etherscan.io/address/<CONTRACT_ADDRESS>
2. Click the "Contract" tab
3. Click "Read Contract" to view data
4. Click "Write Contract" to send transactions
5. Connect your wallet (MetaMask, WalletConnect, etc.)

### Using Web3 Libraries

#### JavaScript (ethers.js)

```javascript
const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const ANON_ABI = [...]; // Import from ANON.abi.json
const contractAddress = '0x52BF349eAB9DACb0AC8C5980a4C4038C2751304a';

const anon = new ethers.Contract(contractAddress, ANON_ABI, wallet);

// Read
const balance = await anon.balanceOf(wallet.address);
console.log('Balance:', ethers.formatEther(balance));

// Write
const tx = await anon.claimWelcomeBonus();
await tx.wait();
console.log('Welcome bonus claimed!');
```

#### TypeScript (viem)

```typescript
import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL),
});

const contractAddress = '0x52BF349eAB9DACb0AC8C5980a4C4038C2751304a';

// Read
const balance = await publicClient.readContract({
  address: contractAddress,
  abi: ANON_ABI,
  functionName: 'balanceOf',
  args: [account.address],
});

// Write
const hash = await walletClient.writeContract({
  address: contractAddress,
  abi: ANON_ABI,
  functionName: 'claimWelcomeBonus',
});
```

## Role Management

### Grant a Role

```bash
# Example: Grant MINTER_ROLE to an address
cast send <CONTRACT_ADDRESS> \
  "grantRole(bytes32,address)" \
  $(cast keccak "MINTER_ROLE") \
  <ADDRESS_TO_GRANT> \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Revoke a Role

```bash
cast send <CONTRACT_ADDRESS> \
  "revokeRole(bytes32,address)" \
  $(cast keccak "MINTER_ROLE") \
  <ADDRESS_TO_REVOKE> \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Check if Address Has Role

```bash
cast call <CONTRACT_ADDRESS> \
  "hasRole(bytes32,address)(bool)" \
  $(cast keccak "MINTER_ROLE") \
  <ADDRESS> \
  --rpc-url $SEPOLIA_RPC_URL
```

## Troubleshooting

### "Profile token not found" Error

Make sure to use the `FOUNDRY_PROFILE=token` prefix:
```bash
FOUNDRY_PROFILE=token forge test
```

### "Insufficient Gas" Error

Increase gas limit in your transaction or check wallet balance.

### "AccessControl: account is missing role" Error

Ensure the calling address has the required role for the function.

### "ERC20Capped: cap exceeded" Error

Total supply cannot exceed 21 billion tokens.

## Project Structure

```
contracts/
├── src/
│   └── token/
│       └── ANON.sol          # Main token contract
├── script/
│   └── token/
│       └── DeployANON.s.sol  # Deployment script
├── test/
│   └── token/
│       └── ANON.t.sol        # Comprehensive tests
├── foundry.toml              # Foundry configuration
└── .env.example              # Environment template
```

## Deployed Contracts

### Sepolia Testnet
- Address: `0x52BF349eAB9DACb0AC8C5980a4C4038C2751304a`
- Explorer: https://sepolia.etherscan.io/address/0x52bf349eab9dacb0ac8c5980a4c4038c2751304a
