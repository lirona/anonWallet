import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type PublicClient,
  type WalletClient,
  encodeFunctionData,
  parseEther,
  parseGwei,
  keccak256
} from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

import { FACTORY_ABI } from '@/contracts/abi/factory';
import { ENTRY_POINT_ADDRESS, ENTRY_POINT_ABI } from '@/constants/entryPoint';
import { type UserOperation, type UserOperationGasEstimate } from '@/types/userOperation';
import config from '@/utils/config';

// Pimlico bundler client
const bundlerClient = createPublicClient({
  chain: sepolia,
  transport: http(`https://api.pimlico.io/v1/sepolia/rpc?apikey=${config.pimlicoApiKey}`),
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
 * Estimate UserOperation gas using Pimlico
 */
export async function estimateUserOperationGas(userOp: UserOperation): Promise<UserOperationGasEstimate> {
  // Convert UserOperation to hex format for RPC call
  const userOpHex = {
    sender: userOp.sender,
    nonce: `0x${userOp.nonce.toString(16)}` as Hex,
    initCode: userOp.initCode,
    callData: userOp.callData,
    callGasLimit: `0x${userOp.callGasLimit.toString(16)}` as Hex,
    verificationGasLimit: `0x${userOp.verificationGasLimit.toString(16)}` as Hex,
    preVerificationGas: `0x${userOp.preVerificationGas.toString(16)}` as Hex,
    maxFeePerGas: `0x${userOp.maxFeePerGas.toString(16)}` as Hex,
    maxPriorityFeePerGas: `0x${userOp.maxPriorityFeePerGas.toString(16)}` as Hex,
    paymasterAndData: userOp.paymasterAndData,
    signature: userOp.signature,
  };

  const estimate = await bundlerClient.request({
    method: 'eth_estimateUserOperationGas' as any,
    params: [userOpHex, ENTRY_POINT_ADDRESS],
  });

  return estimate as unknown as UserOperationGasEstimate;
}

/**
 * Get current gas prices
 */
export async function getGasPrices(): Promise<{ maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }> {
  const feeData = await publicClient.estimateFeesPerGas();

  return {
    maxFeePerGas: feeData.maxFeePerGas || parseGwei('20'),
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || parseGwei('1'),
  };
}

/**
 * Submit UserOperation to Pimlico bundler
 */
export async function submitUserOperation(userOp: UserOperation): Promise<Hex> {
  // Convert to hex format
  const userOpHex = {
    sender: userOp.sender,
    nonce: `0x${userOp.nonce.toString(16)}` as Hex,
    initCode: userOp.initCode,
    callData: userOp.callData,
    callGasLimit: `0x${userOp.callGasLimit.toString(16)}` as Hex,
    verificationGasLimit: `0x${userOp.verificationGasLimit.toString(16)}` as Hex,
    preVerificationGas: `0x${userOp.preVerificationGas.toString(16)}` as Hex,
    maxFeePerGas: `0x${userOp.maxFeePerGas.toString(16)}` as Hex,
    maxPriorityFeePerGas: `0x${userOp.maxPriorityFeePerGas.toString(16)}` as Hex,
    paymasterAndData: userOp.paymasterAndData,
    signature: userOp.signature,
  };

  const userOpHash: Hex = await bundlerClient.request({
    method: 'eth_sendUserOperation' as any,
    params: [userOpHex, ENTRY_POINT_ADDRESS],
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