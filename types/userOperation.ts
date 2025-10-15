import { type Hex } from 'viem';

export interface UserOperation {
  sender: Hex;
  nonce: Hex;
  initCode: Hex;
  callData: Hex;
  callGasLimit: Hex;
  verificationGasLimit: Hex;
  preVerificationGas: Hex;
  maxFeePerGas: Hex;
  maxPriorityFeePerGas: Hex;
  paymasterAndData: Hex;
  signature: Hex;
}

export interface UserOperationGasEstimate {
  callGasLimit: Hex;
  verificationGasLimit: Hex;
  preVerificationGas: Hex;
}

export interface UserOperationReceipt {
  userOpHash: Hex;
  transactionHash: Hex;
  blockNumber: bigint;
  success: boolean;
}