import { Passkey } from 'react-native-passkey';
import { type Hex, toHex } from 'viem';
import * as CBOR from 'cbor-js';

import { fromBase64urlToBytes } from '@/utils/base64';
import { getPasskeyCreationOptions, getPasskeyAuthenticationOptions } from '@/config/webauthn';

export interface PasskeyResult {
  publicKey: readonly [Hex, Hex];
  rawId: string; // base64Url encoded
}

/**
 * Extract public key coordinates from WebAuthn attestationObject
 * @param attestationObjectB64 - Base64url-encoded attestationObject
 * @returns [x, y] coordinates as hex strings
 */
function extractPublicKeyFromAttestation(attestationObjectB64: string): readonly [Hex, Hex] {
  // Decode base64url → bytes
  const attestationBytes = fromBase64urlToBytes(attestationObjectB64);

  // Parse CBOR attestationObject
  const attestation = CBOR.decode(attestationBytes.buffer);
  const authData = new Uint8Array(attestation.authData);

  // AuthData structure:
  // rpIdHash(32) + flags(1) + signCount(4) + aaguid(16) + credIdLen(2) + credId(n) + publicKey(CBOR)
  let offset = 37; // Skip rpIdHash + flags + signCount
  offset += 16; // Skip aaguid

  // Read credential ID length (big-endian uint16)
  const credIdLen = (authData[offset] << 8) | authData[offset + 1];
  offset += 2 + credIdLen; // Skip credId length + credId

  // Extract and parse COSE public key
  const coseKeyBytes = authData.slice(offset);
  const coseKey = CBOR.decode(coseKeyBytes.buffer);

  // COSE key map: -2 = x-coordinate, -3 = y-coordinate
  const x: Hex = toHex(new Uint8Array(coseKey[-2]));
  const y: Hex = toHex(new Uint8Array(coseKey[-3]));

  return [x, y] as const;
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
  checkSupport(): boolean {
    try {
      const supported = Passkey.isSupported();
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
    const supported = this.checkSupport();
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

    console.log('📋 Creation options:', JSON.stringify(creationOptions, null, 2));

    // 3. Create passkey
    console.log('🔐 Prompting user to create passkey...');
    const result = await Passkey.create(creationOptions);

    if (!result) {
      throw new Error('Passkey creation was cancelled or failed');
    }

    console.log('✅ Passkey created:', {
      id: result.id,
      rawId: result.rawId.substring(0, 20) + '...',
      type: result.type,
    });

    // 4. Extract public key from attestationObject
    const [x, y] = extractPublicKeyFromAttestation(result.response.attestationObject);

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

    const authOptions = getPasskeyAuthenticationOptions(challenge, rawId);

    console.log('📋 Authentication options:', JSON.stringify(authOptions, null, 2));

    // Prompt user to sign
    console.log('🔐 Prompting user to sign with passkey...');
    const assertion = await Passkey.get(authOptions);

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
