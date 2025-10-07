import { p256 } from '@noble/curves/nist.js';
import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  encodePacked,
  http,
  parseEther,
  toHex,
  type Hex
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import { webAuthnService } from '@/services/webauthn';
import type { UserOperation } from '@/types/userOperation';
import { fromBase64urlToBytes } from '@/utils/base64';
import config from '@/utils/config';
import {
  generateInitCode,
  generateTransferCallData,
  getGasPrices,
  getNonce,
  getSmartWalletAddress,
  getSponsoredTxGasEstimateAndPaymasterData,
  getUserOperationHash,
  isWalletDeployed,
  submitUserOperation,
} from '@/utils/smartWallet';

interface GasEstimates {
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
}

/**
 * Smart Wallet Service
 * Handles all smart contract wallet operations including deployment, transactions, and queries
 */
class SmartWalletService {
  private publicClient;
  private walletClient;

  constructor() {
    // Initialize blockchain clients
    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(config.rpcUrl),
    });

    const account = privateKeyToAccount(config.relayerPrivateKey as Hex);
    this.walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(config.rpcUrl),
    });
  }

  /**
   * Get deterministic wallet address from public key (before deployment)
   * @param publicKey - Public key coordinates [x, y]
   * @returns Wallet address
   */
  async getWalletAddress(publicKey: readonly [Hex, Hex]): Promise<Hex> {
    return await getSmartWalletAddress(publicKey);
  }

  /**
   * Deploy smart wallet via UserOp (user pays for gas)
   * Just deploys the wallet, doesn't call saveUser
   * @param publicKey - Public key coordinates [x, y]
   * @param rawId - Passkey credential ID (base64Url encoded)
   * @returns Deployed wallet address
   */
  async deployWallet(publicKey: readonly [Hex, Hex], rawId: string): Promise<Hex> {
    console.log('🏗️ Deploying smart wallet via UserOp...');

    try {
      // 1. Calculate wallet address (deterministic)
      const walletAddress = await this.getWalletAddress(publicKey);
      console.log('📍 Wallet address:', walletAddress);

      // 2. Build UserOp with initCode for deployment (empty callData - just deploy)
      console.log('🏗️ Building deployment UserOp (with initCode)...');

      const initCode: Hex = generateInitCode(publicKey);
      const nonce: Hex = toHex(await getNonce(walletAddress));
      const { maxFeePerGas, maxPriorityFeePerGas } = await getGasPrices();

      // Empty callData - we're just deploying the wallet
      const userOp: UserOperation = {
        sender: walletAddress,
        nonce,
        initCode,
        callData: '0x', // Empty - just deployment
        callGasLimit: '0x',
        verificationGasLimit: '0xa6d74', // Higher for deployment
        preVerificationGas: '0x117af',
        maxFeePerGas,
        maxPriorityFeePerGas,
        paymasterAndData: '0x',
        signature: '0x',
      };

      // 3. Get paymaster sponsorship and gas estimates
      console.log('💰 Requesting paymaster sponsorship for deployment...');
      const sponsorship = await getSponsoredTxGasEstimateAndPaymasterData(userOp);

      userOp.paymasterAndData = sponsorship.paymasterAndData;
      userOp.callGasLimit = sponsorship.callGasLimit;
      userOp.verificationGasLimit = sponsorship.verificationGasLimit;
      userOp.preVerificationGas = sponsorship.preVerificationGas;

      // 4. Sign and submit UserOp
      const signedUserOp = await this.signUserOperation(userOp, rawId);

      console.log('🚀 Submitting deployment UserOp...');
      const userOpHash = await submitUserOperation(signedUserOp);

      console.log('✅ Wallet deployed via UserOp:', {
        userOpHash,
        walletAddress,
      });

      return walletAddress;
    } catch (error) {
      console.error('❌ Wallet deployment failed:', error);
      throw new Error(`Failed to deploy wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fund wallet with ETH from relayer
   * @param walletAddress - Target wallet address
   * @param amount - Amount in ETH (e.g., "0.01")
   * @returns Transaction hash
   */
  async fundWallet(walletAddress: Hex, amount: string): Promise<Hex> {
    console.log(`💰 Funding wallet with ${amount} ETH...`, walletAddress);

    try {
      const transferAmount: bigint = parseEther(amount);

      const txHash: Hex = await this.walletClient.sendTransaction({
        to: walletAddress,
        value: transferAmount,
      });

      console.log('⏳ Waiting for funding transaction...', txHash);
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60_000,
      });

      console.log('✅ Wallet funded:', {
        txHash,
        amount: `${amount} ETH`,
        status: receipt.status,
      });

      return txHash;
    } catch (error) {
      console.error('❌ Wallet funding failed:', error);
      throw new Error(`Failed to fund wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send tokens via UserOperation
   * @param to - Recipient address
   * @param amount - Amount in ETH (e.g., "0.001")
   * @param rawId - Passkey credential ID for signing (base64Url encoded)
   * @param walletAddress - Sender wallet address
   * @param publicKey - Sender public key (only needed if wallet not deployed)
   * @returns UserOperation hash
   */
  async sendTokens(
    to: Hex,
    amount: string,
    rawId: string,
    walletAddress: Hex,
    publicKey?: readonly [Hex, Hex]
  ): Promise<Hex> {
    console.log('💸 Sending tokens via UserOperation...', {
      to,
      amount: `${amount} ETH`,
      from: walletAddress,
    });

    try {
      // 1. Check if wallet is deployed
      const deployed = await isWalletDeployed(walletAddress);

      // 2. Build UserOperation (with or without init)
      let userOp: UserOperation;
      if (deployed) {
        userOp = await this.buildUserOp(walletAddress, to, amount);
      } else {
        if (!publicKey) {
          throw new Error('publicKey required for undeployed wallet');
        }
        userOp = await this.buildUserOpWithInit(walletAddress, to, amount, publicKey);
      }

      // 3. Sign UserOperation
      const signedUserOp = await this.signUserOperation(userOp, rawId);

      // 4. Submit to bundler
      console.log('🚀 Submitting UserOperation to bundler...');
      const userOpHash = await submitUserOperation(signedUserOp);

      console.log('✅ UserOperation submitted:', {
        userOpHash,
        to,
        amount: `${amount} ETH`,
      });

      return userOpHash;
    } catch (error) {
      console.error('❌ Send tokens failed:', error);
      throw new Error(`Failed to send tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Build UserOperation for deployed wallet (no initCode)
   */
  private async buildUserOp(walletAddress: Hex, to: Hex, amount: string): Promise<UserOperation> {
    console.log('🏗️ Building UserOperation (deployed wallet)...');

    // 1. Get nonce
    const nonce: Hex = toHex(await getNonce(walletAddress));

    // 2. Generate callData for transfer
    const transferAmount: bigint = parseEther(amount);
    const callData: Hex = generateTransferCallData(to, transferAmount);

    // 3. Get gas prices
    const { maxFeePerGas, maxPriorityFeePerGas } = await getGasPrices();

    // 4. Create UserOperation with initial gas estimates
    const userOp: UserOperation = {
      sender: walletAddress,
      nonce,
      initCode: '0x',
      callData,
      callGasLimit: '0xa6d74', 
      verificationGasLimit: '0xa6d74', 
      preVerificationGas: '0x117af',
      // callGasLimit: '0x', 
      // verificationGasLimit: '0x', 
      // preVerificationGas: '0x',
      maxFeePerGas,
      maxPriorityFeePerGas,
      paymasterAndData: '0x',
      signature: '0x',
    };

 
    // 5. Get paymaster sponsorship and gas estimates
    console.log('💰 Requesting paymaster sponsorship...');
    const sponsorship = await getSponsoredTxGasEstimateAndPaymasterData(userOp);

    // 6. Apply sponsorship data to UserOperation
    userOp.paymasterAndData = sponsorship.paymasterAndData;
    userOp.callGasLimit = sponsorship.callGasLimit;
    userOp.verificationGasLimit = sponsorship.verificationGasLimit;
    userOp.preVerificationGas = sponsorship.preVerificationGas;

    console.log('✅ UserOperation built and sponsored (no init)');
    return userOp;
  }

  /**
   * Build UserOperation with initCode for undeployed wallet
   */
  private async buildUserOpWithInit(
    walletAddress: Hex,
    to: Hex,
    amount: string,
    publicKey: readonly [Hex, Hex]
  ): Promise<UserOperation> {
    console.log('🏗️ Building UserOperation with initCode (undeployed wallet)...');

    // 1. Generate initCode
    const initCode: Hex = generateInitCode(publicKey);

    // 2. Get nonce
    const nonce: Hex = toHex(await getNonce(walletAddress));

    // 3. Generate callData for transfer
    const transferAmount: bigint = parseEther(amount);
    const callData: Hex = generateTransferCallData(to, transferAmount);

    // 4. Get gas prices
    const { maxFeePerGas, maxPriorityFeePerGas } = await getGasPrices();

    // 5. Create UserOperation with initial gas estimates
    const userOp: UserOperation = {
      sender: walletAddress,
      nonce,
      initCode,
      callData,
      callGasLimit: '0x',
      verificationGasLimit: '0x',
      preVerificationGas: '0x',
      maxFeePerGas,
      maxPriorityFeePerGas,
      paymasterAndData: '0x',
      signature: '0x',
    };

    // 6. Get paymaster sponsorship and gas estimates
    console.log('💰 Requesting paymaster sponsorship...');
    const sponsorship = await getSponsoredTxGasEstimateAndPaymasterData(userOp);

    // 7. Apply sponsorship data to UserOperation
    userOp.paymasterAndData = sponsorship.paymasterAndData;
    userOp.callGasLimit = sponsorship.callGasLimit;
    userOp.verificationGasLimit = sponsorship.verificationGasLimit;
    userOp.preVerificationGas = sponsorship.preVerificationGas;

    console.log('✅ UserOperation built and sponsored (with init)');
    return userOp;
  }

  /**
   * Sign UserOperation with WebAuthn
   */
  private async signUserOperation(userOp: UserOperation, rawId: string): Promise<UserOperation> {
    console.log('✍️ Signing UserOperation...');

    // 1. Get UserOperation hash
    const userOpHash: Hex = await getUserOperationHash(userOp);

    // 2. Create challenge for WebAuthn
    const version = 1;
    const validUntil = 0;

    const messageToVerify: Hex = encodePacked(
      ['uint8', 'uint48', 'bytes32'],
      [version, validUntil, userOpHash]
    );

    const challengeBytes = new Uint8Array(
      messageToVerify.slice(2).match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
    );

    const challenge = btoa(String.fromCharCode(...challengeBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // 3. Sign with WebAuthn
    const assertion = await webAuthnService.signChallenge(challenge, rawId);

    // 4. Format signature
    const signature = this.formatWebAuthnSignature(assertion, version, validUntil);

    return {
      ...userOp,
      signature,
    };
  }

  /**
   * Format WebAuthn signature for SimpleAccount contract
   */
  private formatWebAuthnSignature(assertion: any, version: number, validUntil: number): Hex {
    // Extract components
    const authenticatorDataBytes = fromBase64urlToBytes(assertion.response.authenticatorData);
    const clientDataJSONBytes = fromBase64urlToBytes(assertion.response.clientDataJSON);
    const signatureBytes = fromBase64urlToBytes(assertion.response.signature);

    // Convert clientDataJSON to string
    const clientDataJSONString = new TextDecoder().decode(clientDataJSONBytes);

    // Find locations
    const challengeLocation = clientDataJSONString.indexOf('"challenge":"');
    const responseTypeLocation = clientDataJSONString.indexOf('"type":"webauthn.get"');

    // Parse ECDSA signature
    const sig = p256.Signature.fromBytes(signatureBytes, 'der');

    // ABI encode credentials
    const credentials = {
      authenticatorData: toHex(authenticatorDataBytes),
      clientDataJSON: clientDataJSONString,
      challengeLocation: BigInt(challengeLocation),
      responseTypeLocation: BigInt(responseTypeLocation),
      r: toHex(sig.r, { size: 32 }),
      s: toHex(sig.s, { size: 32 }),
    };

    const webAuthnSignature: Hex = encodeAbiParameters(
      [
        {
          type: 'tuple',
          name: 'credentials',
          components: [
            { name: 'authenticatorData', type: 'bytes' },
            { name: 'clientDataJSON', type: 'string' },
            { name: 'challengeLocation', type: 'uint256' },
            { name: 'responseTypeLocation', type: 'uint256' },
            { name: 'r', type: 'bytes32' },
            { name: 's', type: 'bytes32' },
          ],
        },
      ],
      [credentials]
    );

    // Final signature: version + validUntil + webAuthnSignature
    return encodePacked(['uint8', 'uint48', 'bytes'], [version, validUntil, webAuthnSignature]);
  }

  /**
   * Get wallet balance
   */
  async getBalance(address: Hex): Promise<string> {
    const balance = await this.publicClient.getBalance({ address });
    return balance.toString();
  }
}

// Export singleton instance
export const smartWalletService = new SmartWalletService();
