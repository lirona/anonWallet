
import { Env } from '@/types/env';

const getEnvironment = (): Env => {
  // dotenvx will set EXPO_PUBLIC_ENV based on the --env-file used
  if (process.env.EXPO_PUBLIC_ENV) {
    return process.env.EXPO_PUBLIC_ENV as Env;
  }
  // Fallback to build-time detection
  return __DEV__ ? Env.dev : Env.prod;
};

const config = {
  // Environment (determined by dotenvx --env-file)
  env: getEnvironment(),

  // Blockchain configuration
  rpcUrl: process.env.EXPO_PUBLIC_RPC_URL!,
  chainId: process.env.EXPO_PUBLIC_CHAIN_ID!,
  factoryContractAddress: process.env.EXPO_PUBLIC_FACTORY_CONTRACT_ADDRESS!,
  tokenAddress: process.env.EXPO_PUBLIC_TOKEN_ADDRESS!,
  relayerPrivateKey: process.env.EXPO_PUBLIC_RELAYER_PRIVATE_KEY!,
  pimlicoApiKey: process.env.EXPO_PUBLIC_PIMLICO_API_KEY!,

  // WebAuthn configuration
  appId: process.env.EXPO_PUBLIC_APP_ID!,
  associatedDomain: process.env.EXPO_PUBLIC_ASSOCIATED_DOMAIN!,

  // TEMPORARY: Hardcoded wallet for testing while passkeys are being debugged
  // TODO: Remove this when passkeys are working on Android
  hardcodedUserWallet: process.env.EXPO_PUBLIC_HARDCODED_USER_WALLET,
} as const satisfies {
  env: Env;
  rpcUrl: string;
  chainId: string;
  factoryContractAddress: string;
  tokenAddress: string;
  relayerPrivateKey: string;
  pimlicoApiKey: string;
  appId: string;
  associatedDomain: string;
  hardcodedUserWallet: string | undefined;
};

export default config;