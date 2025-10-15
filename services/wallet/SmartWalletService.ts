import { p256 } from '@noble/curves/nist.js';
import {
  createPublicClient,
  encodeAbiParameters,
  encodePacked,
  http,
  parseEther,
  toHex,
  type Hex
} from 'viem';
import { sepolia } from 'viem/chains';

import COIL_ABI_FILE from '@/services/token/COIL.abi.json';
import { webAuthnService } from '@/services/webauthn';
import type { UserOperation } from '@/types/userOperation';
import { fromBase64urlToBytes } from '@/utils/base64';
import config from '@/utils/config';
import {
  generateERC20TransferCallData,
  generateInitCode,
  generateWelcomeBonusCallData,
  getGasPrices,
  getNonce,
  getSmartWalletAddress,
  getSponsoredTxGasEstimateAndPaymasterData,
  getUserOperationHash,
  isWalletDeployed,
  submitUserOperation,
} from '@/utils/smartWallet';


/**
 * Smart Wallet Service
 * Handles all smart contract wallet operations including deployment, transactions, and queries
 */
class SmartWalletService {
  private publicClient;

  constructor() {
    // Initialize blockchain client
    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(config.rpcUrl),
    });
  }

  // Full COIL ABI (imported JSON)
  private static readonly COIL_ABI = (COIL_ABI_FILE as any).abi as any[];

  /**
   * Get deterministic wallet address from public key (before deployment)
   * @param publicKey - Public key coordinates [x, y]
   * @returns Wallet address
   */
  async getWalletAddress(publicKey: readonly [Hex, Hex]): Promise<Hex> {
    return await getSmartWalletAddress(publicKey);
  }

  /**
   * Deploy smart wallet and claim welcome bonus (101 COIL tokens)
   * Deploys wallet via UserOp and calls distributeWelcomeBonus() on token contract
   * @param publicKey - Public key coordinates [x, y]
   * @param rawId - Passkey credential ID (base64Url encoded)
   * @returns Deployed wallet address
   */
  async deployWalletAndClaimWelcomeBonus(publicKey: readonly [Hex, Hex], rawId: string): Promise<Hex> {
    console.log('🏗️ Deploying smart wallet and claiming welcome bonus...');

    try {
      // 1. Calculate wallet address (deterministic)
      const walletAddress = await this.getWalletAddress(publicKey);
      console.log('📍 Wallet address:', walletAddress);

      // 2. Build UserOp with initCode for deployment AND callData for welcome bonus
      console.log('🏗️ Building deployment UserOp (with initCode + welcome bonus claim)...');

      const initCode: Hex = generateInitCode(publicKey);
      const callData: Hex = generateWelcomeBonusCallData(); // Claim 101 COIL tokens
      const nonce: Hex = toHex(await getNonce(walletAddress));
      const { maxFeePerGas, maxPriorityFeePerGas } = await getGasPrices();

      // UserOp that deploys wallet AND claims welcome bonus in one transaction
      const userOp: UserOperation = {
        sender: walletAddress,
        nonce,
        initCode,
        callData, // Empty - just deployment
        callGasLimit: '0xa6d74',
        verificationGasLimit: '0xa6d74', // Higher for deployment
        preVerificationGas: '0x117af',
        maxFeePerGas,
        maxPriorityFeePerGas,
        paymasterAndData: '0x',
        signature: '0x',
      };

      // 3. Get paymaster sponsorship and gas estimates
      console.log('💰 Requesting paymaster sponsorship for deployment + bonus claim...');
      const sponsorship = await getSponsoredTxGasEstimateAndPaymasterData(userOp);

      userOp.paymasterAndData = sponsorship.paymasterAndData;
      userOp.callGasLimit = sponsorship.callGasLimit;
      userOp.verificationGasLimit = sponsorship.verificationGasLimit;
      userOp.preVerificationGas = sponsorship.preVerificationGas;

      // 4. Sign and submit UserOp
      const signedUserOp = await this.signUserOperation(userOp, rawId);

      console.log('🚀 Submitting deployment + bonus claim UserOp...');
      const userOpHash = await submitUserOperation(signedUserOp);

      console.log('✅ Wallet deployed and welcome bonus claimed:', {
        userOpHash,
        walletAddress,
      });

      return walletAddress;
    } catch (error) {
      console.error('❌ Wallet deployment and bonus claim failed:', error);
      throw new Error(`Failed to deploy wallet and claim bonus: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send COIL tokens via UserOperation
   * @param to - Recipient address
   * @param amount - Amount in COIL tokens (e.g., "10.5")
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
    console.log('💸 Sending COIL tokens via UserOperation...', {
      to,
      amount: `${amount} COIL`,
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
        amount: `${amount} COIL`,
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

    // 2. Generate callData for ERC20 transfer
    const transferAmount: bigint = parseEther(amount);
    const callData: Hex = generateERC20TransferCallData(to, transferAmount);

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

    // 3. Generate callData for ERC20 transfer
    const transferAmount: bigint = parseEther(amount);
    const callData: Hex = generateERC20TransferCallData(to, transferAmount);

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

  /**
   * Get COIL token balance for address
   */
  async getTokenBalance(address: Hex): Promise<bigint> {
    const token = config.tokenAddress as Hex;
    const bal = await this.publicClient.readContract({
      address: token,
      abi: SmartWalletService.COIL_ABI,
      functionName: 'balanceOf',
      args: [address],
    });
    return bal as unknown as bigint;
  }
}

// Export singleton instance
export const smartWalletService = new SmartWalletService();
