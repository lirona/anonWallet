import {
  createPublicClient,
  encodeFunctionData,
  http,
  toHex,
  type Hex
} from 'viem';
import { sepolia } from 'viem/chains';

import { ENTRY_POINT_ABI, ENTRY_POINT_ADDRESS } from '@/constants/entryPoint';
import { FACTORY_ABI } from '@/contracts/abi/factory';
import COIL_ABI_FILE from '@/services/token/COIL.abi.json';
import { type UserOperation } from '@/types/userOperation';
import config from '@/utils/config';

// Extract the ABI array from the JSON file
const COIL_ABI = COIL_ABI_FILE.abi;

// SimpleAccount executeBatch function ABI (matches contracts/src/SimpleAccount.sol)
// executeBatch(Call[] calls) where Call = { dest: address, value: uint256, data: bytes }
const SIMPLE_ACCOUNT_EXECUTE_BATCH_ABI = [
  {
    inputs: [
      {
        name: 'calls',
        type: 'tuple[]',
        components: [
          { name: 'dest', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
      },
    ],
    name: 'executeBatch',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// Pimlico bundler client (v1 - for submitting user operations)
// Routes through Tor privacy proxy if enablePrivacyMode is true
const bundlerClient = createPublicClient({
  chain: sepolia,
  transport: http(
    config.enablePrivacyMode
      ? config.privacyProxyBundlerUrl
      : `https://api.pimlico.io/v1/sepolia/rpc?apikey=${config.pimlicoApiKey}`
  ),
});

// Pimlico paymaster client (v2 - for sponsorship requests)
// Routes through Tor privacy proxy if enablePrivacyMode is true
const paymasterClient = createPublicClient({
  chain: sepolia,
  transport: http(
    config.enablePrivacyMode
      ? config.privacyProxyPaymasterUrl
      : `https://api.pimlico.io/v2/sepolia/rpc?apikey=${config.pimlicoApiKey}`
  ),
});

// Regular clients
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(config.rpcUrl),
});


/**
 * Get smart wallet address using factory's getAddress function
 */
export async function getSmartWalletAddress(publicKey: readonly [Hex, Hex]): Promise<Hex> {
  const factoryAddress: Hex = config.factoryContractAddress as Hex;

  const address: Hex = await publicClient.readContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'getAddress',
    args: [publicKey],
  }) as Hex;

  return address;
}

/**
 * Check if smart wallet is already deployed
 */
export async function isWalletDeployed(walletAddress: Hex): Promise<boolean> {
  const code = await publicClient.getCode({ address: walletAddress });
  return code !== undefined && code !== '0x';
}

/**
 * Get nonce from EntryPoint contract
 */
export async function getNonce(walletAddress: Hex): Promise<bigint> {
  const nonce: bigint = await publicClient.readContract({
    address: ENTRY_POINT_ADDRESS,
    abi: ENTRY_POINT_ABI,
    functionName: 'getNonce',
    args: [walletAddress, 0n], // key = 0 for default nonce space
  }) as bigint;

  return nonce;
}

/**
 * Generate initCode for wallet deployment
 */
export function generateInitCode(publicKey: readonly [Hex, Hex]): Hex {
  const factoryAddress: Hex = config.factoryContractAddress as Hex;

  const callData: Hex = encodeFunctionData({
    abi: FACTORY_ABI,
    functionName: 'createAccount',
    args: [publicKey],
  });

  // initCode = factory address + call data
  return `${factoryAddress}${callData.slice(2)}` as Hex;
}

/**
 * Generate callData for ERC20 token transfer (COIL)
 * Wraps ERC20 transfer() in SimpleAccount execute() function
 * @param to - Recipient address
 * @param amount - Token amount (in wei, 18 decimals)
 * @returns Encoded callData for UserOperation
 */
export function generateERC20TransferCallData(to: Hex, amount: bigint): Hex {
  const tokenAddress = config.tokenAddress as Hex;

  // 1. Encode ERC20 transfer(to, amount)
  const erc20TransferData = encodeFunctionData({
    abi: COIL_ABI,
    functionName: 'transfer',
    args: [to, amount],
  });

  // 2. Wrap in SimpleAccount executeBatch([{ dest: tokenAddress, value: 0, data: erc20TransferData }])
  // value = 0 because we're not sending ETH, just calling the token contract
  return encodeFunctionData({
    abi: SIMPLE_ACCOUNT_EXECUTE_BATCH_ABI,
    functionName: 'executeBatch',
    args: [[{ dest: tokenAddress, value: 0n, data: erc20TransferData }]],
  });
}

/**
 * Generate callData for claiming welcome bonus from COIL token
 * Wraps distributeWelcomeBonus() in SimpleAccount execute() function
 * @returns Encoded callData for UserOperation
 */
export function generateWelcomeBonusCallData(): Hex {
  const tokenAddress = config.tokenAddress as Hex;

  // 1. Encode distributeWelcomeBonus() - no parameters needed
  const bonusCallData = encodeFunctionData({
    abi: COIL_ABI,
    functionName: 'distributeWelcomeBonus',
  });

  // 2. Wrap in SimpleAccount executeBatch([{ dest: tokenAddress, value: 0, data: bonusCallData }])
  return encodeFunctionData({
    abi: SIMPLE_ACCOUNT_EXECUTE_BATCH_ABI,
    functionName: 'executeBatch',
    args: [[{ dest: tokenAddress, value: 0n, data: bonusCallData }]],
  });
}

/**
 * Get sponsored transaction gas estimates and paymaster data from Pimlico
 * Returns hex values directly from paymaster (no conversion to bigint)
 * Pure function that returns only the sponsorship-related fields
 */
export async function getSponsoredTxGasEstimateAndPaymasterData(userOp: UserOperation): Promise<{
  paymasterAndData: Hex;
  callGasLimit: Hex;
  verificationGasLimit: Hex;
  preVerificationGas: Hex;
}> {
  const sponsorship = await paymasterClient.request({
    method: 'pm_sponsorUserOperation' as any,
    params: [userOp, ENTRY_POINT_ADDRESS],
  }) as any;

  console.log('✅ Sponsorship received:', {
    paymasterAndData: sponsorship.paymasterAndData?.substring(0, 20) + '...',
    callGasLimit: sponsorship.callGasLimit,
    verificationGasLimit: sponsorship.verificationGasLimit,
    preVerificationGas: sponsorship.preVerificationGas
  });

  // Return hex values directly from paymaster (no conversion)
  return {
    paymasterAndData: sponsorship.paymasterAndData as Hex,
    callGasLimit: sponsorship.callGasLimit as Hex,
    verificationGasLimit: sponsorship.verificationGasLimit as Hex,
    preVerificationGas: sponsorship.preVerificationGas as Hex,
  };
}

/**
 * Get current gas prices
 */
export async function getGasPrices(): Promise<{ maxFeePerGas: Hex; maxPriorityFeePerGas: Hex }> {
  const feeData = await publicClient.estimateFeesPerGas();

  return {
    maxFeePerGas: toHex(feeData.maxFeePerGas),
    maxPriorityFeePerGas: toHex(feeData.maxPriorityFeePerGas),
  };
}

/**
 * Submit UserOperation to Pimlico bundler
 */
export async function submitUserOperation(userOp: UserOperation): Promise<Hex> {

  const userOpHash: Hex = await bundlerClient.request({
    method: 'eth_sendUserOperation' as any,
    params: [userOp, ENTRY_POINT_ADDRESS],
  });

  return userOpHash;
}

/**
 * Get UserOperation hash for signing
 */
export async function getUserOperationHash(userOp: UserOperation): Promise<Hex> {
  const hash: Hex = await publicClient.readContract({
    address: ENTRY_POINT_ADDRESS,
    abi: ENTRY_POINT_ABI,
    functionName: 'getUserOpHash',
    args: [userOp as any],
  }) as Hex;

  return hash;
}