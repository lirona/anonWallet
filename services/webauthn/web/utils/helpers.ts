/**
 * Web-specific utilities for WebAuthn
 * Based on smart-wallet repository implementation
 * Isolated from mobile code for clean separation
 */

import { type Hex, toHex } from 'viem';
import { AsnParser } from '@peculiar/asn1-schema';
import { ECDSASigValue } from '@peculiar/asn1-ecc';

/**
 * Check if leading zero should be removed from signature component
 * From smart-wallet: shouldRemoveLeadingZero
 */
export function shouldRemoveLeadingZero(bytes: Uint8Array): boolean {
  return bytes[0] === 0x0 && (bytes[1] & (1 << 7)) !== 0;
}

/**
 * Concatenate multiple Uint8Arrays
 * From smart-wallet: concatUint8Arrays
 */
export function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  let pointer = 0;
  const totalLength = arrays.reduce((prev, curr) => prev + curr.length, 0);

  const toReturn = new Uint8Array(totalLength);

  arrays.forEach((arr) => {
    toReturn.set(arr, pointer);
    pointer += arr.length;
  });

  return toReturn;
}

/**
 * Parse ASN.1 DER-encoded ECDSA signature
 * From smart-wallet: parseSignature
 * Extracts r and s components, removes leading zeros
 */
export function parseSignature(signature: Uint8Array): { r: Hex; s: Hex } {
  const parsedSignature = AsnParser.parse(signature, ECDSASigValue);
  let rBytes = new Uint8Array(parsedSignature.r);
  let sBytes = new Uint8Array(parsedSignature.s);

  if (shouldRemoveLeadingZero(rBytes)) {
    rBytes = rBytes.slice(1);
  }
  if (shouldRemoveLeadingZero(sBytes)) {
    sBytes = sBytes.slice(1);
  }

  const finalSignature = concatUint8Arrays([rBytes, sBytes]);
  return {
    r: toHex(finalSignature.slice(0, 32)),
    s: toHex(finalSignature.slice(32)),
  };
}

/**
 * Web-specific: Convert base64url to Uint8Array
 * Uses browser's built-in atob instead of react-native-quick-base64
 */
export function base64urlToBytes(str: string): Uint8Array {
  // Convert base64url to standard base64
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

  // Decode using browser's atob
  const binaryString = atob(padded);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

/**
 * Web-specific: Convert base64url to hex
 */
export function base64urlToHex(str: string): Hex {
  const bytes = base64urlToBytes(str);
  return toHex(bytes);
}
