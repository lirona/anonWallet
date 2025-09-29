export interface User {
  id: string;
  walletAddress?: string;
  passkeysEnabled: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}