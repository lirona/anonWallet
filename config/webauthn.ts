/**
 * WebAuthn configuration constants
 * Centralized configuration for Relying Party settings
 */

export const WEBAUTHN_CONFIG = {
  appId: process.env.EXPO_PUBLIC_APP_ID!,
  associatedDomain: process.env.EXPO_PUBLIC_ASSOCIATED_DOMAIN!,
  rpName: 'CoilWallet',
  timeout: 60000, // 60 seconds
  userVerification: 'required' as const,
  authenticatorAttachment: 'platform' as const,
} as const;

/**A
 * Default passkey creation options
 */
export function getPasskeyCreationOptions(walletName: string, challenge: string, userId: string) {
  return {
    rp: {
      name: WEBAUTHN_CONFIG.rpName,
      id: WEBAUTHN_CONFIG.associatedDomain,
    },
    user: {
      id: userId,
      name: walletName,
      displayName: walletName,
    },
    challenge,
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' as const },
      { alg: -257, type: 'public-key' as const },
    ],
    timeout: WEBAUTHN_CONFIG.timeout,
    attestation: 'none' as const,
    authenticatorSelection: {
      authenticatorAttachment: WEBAUTHN_CONFIG.authenticatorAttachment,
      userVerification: WEBAUTHN_CONFIG.userVerification,
    },
  };
}

/**
 * Default passkey authentication options
 */
export function getPasskeyAuthenticationOptions(challenge: string, credentialId: string) {
  return {
    rpId: WEBAUTHN_CONFIG.associatedDomain,
    challenge,
    allowCredentials: [
      {
        id: credentialId,
        type: 'public-key' as const,
      },
    ],
    userVerification: WEBAUTHN_CONFIG.userVerification,
    timeout: WEBAUTHN_CONFIG.timeout,
  };
}