/**
 * Platform-specific WebAuthn service declaration
 * Tells TypeScript that WebAuthnService.native.ts and WebAuthnService.web.ts
 * both export a webAuthnService instance
 */

export { webAuthnService } from './WebAuthnService.native';
