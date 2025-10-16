/**
 * WebAuthn Service - Web Implementation
 * Uses browser WebAuthn API (navigator.credentials)
 * Based on smart-wallet repository implementation
 */

import { type Hex, toHex } from 'viem';
import * as CBOR from 'cbor-js';

import type { PasskeyResult, IWebAuthnService } from './interfaces';
import { getPasskeyCreationOptions, getPasskeyAuthenticationOptions } from '@/config/webauthn';
import { base64urlToBytes, base64urlToHex, parseSignature } from './web/utils/helpers';

/**
 * WebAuthn Service for Web Browsers
 * Handles passkey creation and authentication using browser WebAuthn API
 */
class WebAuthnService implements IWebAuthnService {
  /**
   * Check if WebAuthn is supported in the current browser
   */
  checkSupport(): boolean {
    try {
      const supported =
        typeof window !== 'undefined' &&
        window.PublicKeyCredential !== undefined &&
        typeof window.PublicKeyCredential === 'function';

      console.log('🔍 WebAuthn support (web):', supported);
      return supported;
    } catch (error) {
      console.error('❌ Failed to check WebAuthn support:', error);
      return false;
    }
  }

  /**
   * Create a new passkey credential using browser WebAuthn API
   * @param walletName - Display name for the wallet
   * @returns Public key coordinates and credential ID (base64Url encoded)
   */
  async createPasskey(walletName: string): Promise<PasskeyResult> {
    console.log('🔐 Creating passkey for wallet (web):', walletName);

    // Check if WebAuthn is supported
    if (!this.checkSupport()) {
      throw new Error('WebAuthn is not supported in this browser');
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

    // 2. Get creation options from config
    const creationOptions = getPasskeyCreationOptions(walletName, challenge, userId);

    console.log('📋 Creation options (before override):', JSON.stringify(creationOptions, null, 2));

    // 3. Convert to browser-compatible format
    // IMPORTANT: Override RP ID to use current domain (not ngrok domain from mobile config)
    const options: PublicKeyCredentialCreationOptions = {
      ...creationOptions,
      rp: {
        name: creationOptions.rp.name,
        id: window.location.hostname, // Use current domain (localhost, or deployed domain)
      },
      challenge: base64urlToBytes(creationOptions.challenge) as BufferSource,
      user: {
        ...creationOptions.user,
        id: base64urlToBytes(creationOptions.user.id) as BufferSource,
      },
    };

    console.log('📋 RP ID overridden for web:', window.location.hostname);

    // 4. Create passkey using browser API
    console.log('🔐 Prompting user to create passkey...');
    const credential = await navigator.credentials.create({
      publicKey: options,
    });

    if (!credential) {
      throw new Error('Passkey creation was cancelled or failed');
    }

    const publicKeyCredential = credential as PublicKeyCredential;
    const response = publicKeyCredential.response as AuthenticatorAttestationResponse;

    // 5. Convert rawId to base64url (to match mobile format)
    const rawId = btoa(String.fromCharCode(...new Uint8Array(publicKeyCredential.rawId)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    console.log('✅ Passkey created:', {
      id: publicKeyCredential.id,
      rawId: rawId.substring(0, 20) + '...',
      type: publicKeyCredential.type,
    });

    // 6. Extract public key from attestation (same logic as mobile)
    const attestationObjectB64 = btoa(
      String.fromCharCode(...new Uint8Array(response.attestationObject))
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const publicKey = this.extractPublicKeyFromAttestation(attestationObjectB64);

    console.log('🔑 Public key extracted:', {
      x: publicKey[0].substring(0, 20) + '...',
      y: publicKey[1].substring(0, 20) + '...',
    });

    return {
      publicKey,
      rawId, // base64Url encoded
    };
  }

  /**
   * Sign a challenge using an existing passkey
   * @param challenge - Challenge to sign (base64Url encoded)
   * @param rawId - Passkey credential ID (base64Url encoded)
   * @returns WebAuthn assertion (same format as mobile)
   */
  async signChallenge(challenge: string, rawId: string) {
    console.log('✍️ Signing challenge with passkey (web):', {
      challenge: challenge.substring(0, 20) + '...',
      rawId: rawId.substring(0, 20) + '...',
    });

    const authOptions = getPasskeyAuthenticationOptions(challenge, rawId);

    console.log('📋 Authentication options (before override):', JSON.stringify(authOptions, null, 2));

    // Convert to browser-compatible format
    // IMPORTANT: Override RP ID to use current domain (not ngrok domain from mobile config)
    const options: PublicKeyCredentialRequestOptions = {
      ...authOptions,
      rpId: window.location.hostname, // Use current domain
      challenge: base64urlToBytes(authOptions.challenge) as BufferSource,
      allowCredentials: authOptions.allowCredentials?.map((cred) => ({
        ...cred,
        id: base64urlToBytes(cred.id) as BufferSource,
      })),
    };

    console.log('📋 RP ID overridden for web:', window.location.hostname);

    // Prompt user to sign using browser API
    console.log('🔐 Prompting user to sign with passkey...');
    const credential = await navigator.credentials.get({
      publicKey: options,
    });

    if (!credential) {
      throw new Error('WebAuthn assertion failed or was cancelled');
    }

    const publicKeyCredential = credential as PublicKeyCredential;
    const response = publicKeyCredential.response as AuthenticatorAssertionResponse;

    // Convert to base64url format (to match mobile)
    const clientDataJSON = btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const authenticatorData = btoa(
      String.fromCharCode(...new Uint8Array(response.authenticatorData))
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const signature = btoa(String.fromCharCode(...new Uint8Array(response.signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const assertionRawId = btoa(String.fromCharCode(...new Uint8Array(publicKeyCredential.rawId)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    console.log('✅ WebAuthn assertion received:', {
      id: publicKeyCredential.id,
      rawId: assertionRawId.substring(0, 20) + '...',
      type: publicKeyCredential.type,
    });

    // Return in same format as mobile
    return {
      id: publicKeyCredential.id,
      rawId: assertionRawId,
      type: publicKeyCredential.type,
      response: {
        clientDataJSON,
        authenticatorData,
        signature,
        userHandle: response.userHandle
          ? btoa(String.fromCharCode(...new Uint8Array(response.userHandle)))
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=/g, '')
          : undefined,
      },
    };
  }

  /**
   * Extract public key coordinates from WebAuthn attestationObject
   * SAME LOGIC as mobile implementation - works with cbor-js on web too!
   * @param attestationObjectB64 - Base64url-encoded attestationObject
   * @returns [x, y] coordinates as hex strings
   */
  private extractPublicKeyFromAttestation(attestationObjectB64: string): readonly [Hex, Hex] {
    // Decode base64url → bytes (web-specific)
    const attestationBytes = base64urlToBytes(attestationObjectB64);

    // Parse CBOR attestationObject (cbor-js works on both mobile and web!)
    const attestation = CBOR.decode(attestationBytes.buffer as ArrayBuffer);
    const authData = new Uint8Array(attestation.authData);

    // AuthData structure (SAME as mobile):
    // rpIdHash(32) + flags(1) + signCount(4) + aaguid(16) + credIdLen(2) + credId(n) + publicKey(CBOR)
    let offset = 37; // Skip rpIdHash + flags + signCount
    offset += 16; // Skip aaguid

    // Read credential ID length (big-endian uint16)
    const credIdLen = (authData[offset] << 8) | authData[offset + 1];
    offset += 2 + credIdLen; // Skip credId length + credId

    // Extract and parse COSE public key
    const coseKeyBytes = authData.slice(offset);
    const coseKey = CBOR.decode(coseKeyBytes.buffer as ArrayBuffer);

    // COSE key map: -2 = x-coordinate, -3 = y-coordinate
    const x: Hex = toHex(new Uint8Array(coseKey[-2]));
    const y: Hex = toHex(new Uint8Array(coseKey[-3]));

    return [x, y] as const;
  }
}

// Export singleton instance
export const webAuthnService = new WebAuthnService();
