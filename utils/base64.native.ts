import { type Hex, toHex } from 'viem';
import { toByteArray } from 'react-native-quick-base64';

/**
 * Converts base64 string to Uint8Array using native react-native-quick-base64
 * ~16x faster than pure JS implementations
 */
export function fromBase64ToBytes(str: string): Uint8Array {
  return toByteArray(str);
}

/**
 * Converts base64 string to hex using optimized native conversion
 */
export function fromBase64ToHex(str: string): Hex {
  const bytes: Uint8Array = toByteArray(str);
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
  const paddedBase64: string = base64Standard + '='.repeat((4 - base64Standard.length % 4) % 4);
  return paddedBase64;
}

/**
 * Direct conversion from base64url to bytes using native implementation
 * Combines base64url normalization with optimized byte conversion
 */
export function fromBase64urlToBytes(str: string): Uint8Array {
  const base64: string = base64urlToBase64(str);
  return toByteArray(base64);
}

/**
 * Direct conversion from base64url to hex using native implementation
 * Most efficient path for WebAuthn public key processing
 */
export function fromBase64urlToHex(str: string): Hex {
  const bytes: Uint8Array = fromBase64urlToBytes(str);
  return toHex(bytes);
}