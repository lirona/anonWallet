import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  toHex,
  type Hex
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import { ENTRY_POINT_ABI, ENTRY_POINT_ADDRESS } from '@/constants/entryPoint';
import { FACTORY_ABI } from '@/contracts/abi/factory';
import { type UserOperation } from '@/types/userOperation';
import config from '@/utils/config';

// Pimlico bundler client (v1 - for submitting user operations)
const bundlerClient = createPublicClient({
  chain: sepolia,
  transport: http(`https://api.pimlico.io/v1/sepolia/rpc?apikey=${config.pimlicoApiKey}`),
});

// Pimlico paymaster client (v2 - for sponsorship requests)
const paymasterClient = createPublicClient({
  chain: sepolia,
  transport: http(`https://api.pimlico.io/v2/sepolia/rpc?apikey=${config.pimlicoApiKey}`),
});

// Regular clients
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(config.rpcUrl),
});

const account = privateKeyToAccount(config.relayerPrivateKey as Hex);
const walletClient = createWalletClient({
  account,
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
 * Generate callData for ETH transfer (SimpleAccount execute function)
 */
export function generateTransferCallData(to: Hex, amount: bigint): Hex {
  // SimpleAccount execute(address dest, uint256 value, bytes calldata func)
  // For ETH transfer, func is empty bytes
  return encodeFunctionData({
    abi: [
      {
        inputs: [
          { name: 'dest', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'func', type: 'bytes' }
        ],
        name: 'execute',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      }
    ],
    functionName: 'execute',
    args: [to, amount, '0x'],
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