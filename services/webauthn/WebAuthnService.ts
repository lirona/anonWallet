import { create, get, isSupported } from 'react-native-passkeys';
import { type Hex, toHex, keccak256 } from 'viem';

import { fromBase64urlToBytes } from '@/utils/base64';
import { getPasskeyCreationOptions, getPasskeyAuthenticationOptions } from '@/config/webauthn';

export interface PasskeyResult {
  publicKey: readonly [Hex, Hex];
  rawId: string; // base64Url encoded
}

/**
 * WebAuthn Service
 * Handles all passkey creation, signing, and WebAuthn protocol operations
 */
class WebAuthnService {
  /**
   * Check if passkeys are supported on this device
   * @returns true if passkeys are supported
   */
  async checkSupport(): Promise<boolean> {
    try {
      const supported = await isSupported();
      console.log('🔍 Passkey support:', supported);
      return supported;
    } catch (error) {
      console.error('❌ Failed to check passkey support:', error);
      return false;
    }
  }

  /**
   * Create a new passkey credential
   * @param walletName - Display name for the wallet
   * @returns Public key coordinates and credential ID
   */
  async createPasskey(walletName: string): Promise<PasskeyResult> {
    console.log('🔐 Creating passkey for wallet:', walletName);

    // Check if passkeys are supported
    const supported = await this.checkSupport();
    if (!supported) {
      throw new Error('Passkeys are not supported on this device. Requires Android 9+ or iOS 15+');
    }

    // 1. Generate challenge
    const challenge = btoa('random-challenge-' + Date.now())
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const userId = btoa('user-' + Date.now())
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    console.log('📋 Challenge and userId generated:', {
      challenge: challenge.substring(0, 20) + '...',
      userId: userId.substring(0, 20) + '...',
    });

    // 2. Get creation options
    const creationOptions = getPasskeyCreationOptions(walletName, challenge, userId);

    // 3. Create passkey
    console.log('🔐 Prompting user to create passkey...');
    const result = await create(creationOptions);

    if (!result) {
      throw new Error('Passkey creation was cancelled or failed');
    }

    console.log('✅ Passkey created:', {
      id: result.id,
      rawId: result.rawId.substring(0, 20) + '...',
      type: result.type,
    });

    // 4. Extract public key
    const publicKeyBase64 = result.response.getPublicKey?.();
    if (!publicKeyBase64) {
      throw new Error('No public key received from passkey');
    }

    const publicKeyBytes = fromBase64urlToBytes(publicKeyBase64);

    if (publicKeyBytes.length !== 64) {
      throw new Error(`Invalid public key length: expected 64 bytes, got ${publicKeyBytes.length}`);
    }

    // 5. Extract x and y coordinates
    const xBytes = publicKeyBytes.slice(0, 32) as Uint8Array;
    const yBytes = publicKeyBytes.slice(32, 64) as Uint8Array;
    const x: Hex = toHex(xBytes);
    const y: Hex = toHex(yBytes);

    console.log('🔑 Public key extracted:', {
      x: x.substring(0, 20) + '...',
      y: y.substring(0, 20) + '...',
    });

    return {
      publicKey: [x, y] as const,
      rawId: result.rawId,
    };
  }

  /**
   * Sign a challenge using an existing passkey
   * @param challenge - Challenge to sign (base64Url encoded)
   * @param rawId - Passkey credential ID (base64Url encoded)
   * @returns WebAuthn assertion
   */
  async signChallenge(challenge: string, rawId: string) {
    console.log('✍️ Signing challenge with passkey:', {
      challenge: challenge.substring(0, 20) + '...',
      rawId: rawId.substring(0, 20) + '...',
    });

    // Get authentication options
    const authOptions = getPasskeyAuthenticationOptions(challenge, rawId);

    // Prompt user to sign
    console.log('🔐 Prompting user to sign with passkey...');
    const assertion = await get(authOptions);

    if (!assertion) {
      throw new Error('WebAuthn assertion failed or was cancelled');
    }

    console.log('✅ WebAuthn assertion received:', {
      id: assertion.id,
      rawId: assertion.rawId.substring(0, 20) + '...',
      type: assertion.type,
    });

    return assertion;
  }
}

// Export singleton instance
export const webAuthnService = new WebAuthnService();
