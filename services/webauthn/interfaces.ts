/**
 * Minimal WebAuthn Service Interface
 * Platform-specific implementations in .native.ts and .web.ts
 */

import { type Hex } from 'viem';

export interface PasskeyResult {
  publicKey: readonly [Hex, Hex];
  rawId: string; // base64Url encoded
}

export interface IWebAuthnService {
  checkSupport(): boolean;
  createPasskey(walletName: string): Promise<PasskeyResult>;
  signChallenge(challenge: string, rawId: string): Promise<any>;
}
