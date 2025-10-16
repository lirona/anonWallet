/**
 * Web-compatible base64 utilities
 * Uses browser's built-in atob() instead of react-native-quick-base64
 * Maintains same API as base64.ts for seamless platform switching
 */

import { type Hex, toHex } from 'viem';

/**
 * Converts base64 string to Uint8Array using browser's atob()
 * Web alternative to react-native-quick-base64
 */
export function fromBase64ToBytes(str: string): Uint8Array {
  const binaryString = atob(str);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts base64 string to hex using browser conversion
 */
export function fromBase64ToHex(str: string): Hex {
  const bytes: Uint8Array = fromBase64ToBytes(str);
  return toHex(bytes);
}

/**
 * Converts base64url string to standard base64
 * Handles the URL-safe base64 format used in WebAuthn
 */
export function base64urlToBase64(str: string): string {
  // Replace URL-safe characters
  const base64Standard: string = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const paddedBase64: string = base64Standard + '='.repeat((4 - (base64Standard.length % 4)) % 4);
  return paddedBase64;
}

/**
 * Direct conversion from base64url to bytes using browser implementation
 * Combines base64url normalization with browser-based byte conversion
 */
export function fromBase64urlToBytes(str: string): Uint8Array {
  const base64: string = base64urlToBase64(str);
  return fromBase64ToBytes(base64);
}

/**
 * Direct conversion from base64url to hex using browser implementation
 * Most efficient path for WebAuthn public key processing on web
 */
export function fromBase64urlToHex(str: string): Hex {
  const bytes: Uint8Array = fromBase64urlToBytes(str);
  return toHex(bytes);
}
