import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/theme/colors';

// Wallet creation logic commented out for now
/*
import { create } from 'react-native-passkeys';
import { createPublicClient, createWalletClient, http, keccak256, toHex, parseEther, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { fromBase64urlToBytes } from '@/utils/base64';
import { FACTORY_ABI } from '@/contracts/abi/factory';
import { getPasskeyCreationOptions } from '@/config/webauthn';
import { executeUserOperation } from '@/utils/userOperationBuilder';
import config from '@/utils/config';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(config.rpcUrl),
});

const account = privateKeyToAccount(config.relayerPrivateKey as Hex);

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(config.rpcUrl),
});
*/

export default function WalletCreationScreen() {
  const handleCreateWallet = () => {
    // Navigate to wallet home screen
    router.push('/wallet-home')
  };

  /* Wallet creation logic commented out - will be re-enabled later
  const handleCreateWallet = async () => {
    if (!walletName.trim()) {
      Alert.alert('Error', 'Please enter a wallet name');
      return;
    }

    setIsCreating(true);

    try {
      const challenge = btoa('random-challenge-' + Date.now()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const userId = btoa('user-' + Date.now()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      const creationOptions = getPasskeyCreationOptions(walletName, challenge, userId);
      const result = await create(creationOptions);

      if (!result) {
        throw new Error('Passkey creation was cancelled or failed');
      }

      const rawIdBytes: Uint8Array = fromBase64urlToBytes(result.rawId);
      const rawIdHex: Hex = toHex(rawIdBytes);

      const publicKeyBase64: string | undefined = result.response.getPublicKey?.();
      if (!publicKeyBase64) {
        throw new Error('No public key received from passkey');
      }

      const publicKeyBytes: Uint8Array = fromBase64urlToBytes(publicKeyBase64);

      if (publicKeyBytes.length !== 64) {
        throw new Error(`Invalid public key length: expected 64 bytes, got ${publicKeyBytes.length}`);
      }

      const xBytes: Uint8Array = publicKeyBytes.slice(0, 32) as Uint8Array;
      const yBytes: Uint8Array = publicKeyBytes.slice(32, 64) as Uint8Array;
      const x: Hex = toHex(xBytes);
      const y: Hex = toHex(yBytes);
      const rawIdHash: Hex = keccak256(rawIdBytes);

      const contractUserId: bigint = BigInt(rawIdHash);
      const publicKeyArray: readonly [Hex, Hex] = [x, y] as const;
      const factoryAddress: Hex = config.factoryContractAddress as Hex;

      const txHash: Hex = await walletClient.writeContract({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: 'saveUser',
        args: [contractUserId, publicKeyArray],
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60_000
      });

      const userData = await publicClient.readContract({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: 'getUser',
        args: [contractUserId],
      });

      const userAddress: Hex = userData.account as Hex;
      const transferAmount: bigint = parseEther('0.001');

      const transferTxHash: Hex = await walletClient.sendTransaction({
        to: userAddress,
        value: transferAmount,
      });

      const transferReceipt = await publicClient.waitForTransactionReceipt({
        hash: transferTxHash,
        timeout: 60_000
      });

      let userOpHash: Hex | null = null;

      try {
        userOpHash = await executeUserOperation(
          publicKeyArray,
          account.address,
          result.rawId
        );
      } catch (userOpError) {
        console.error('❌ UserOperation failed:', userOpError);
      }

      const successMessage = userOpHash
        ? `Wallet "${walletName}" created successfully!\n\nUser Address: ${userAddress.slice(0, 10)}...\nSaveUser Tx: ${txHash.slice(0, 10)}...\nTransfer Tx: ${transferTxHash.slice(0, 10)}...\nUserOp Hash: ${userOpHash.slice(0, 10)}...\n💰 Funded with 0.001 ETH\n🔄 Sent 0.0001 ETH back via UserOp`
        : `Wallet "${walletName}" created successfully!\n\nUser Address: ${userAddress.slice(0, 10)}...\nSaveUser Tx: ${txHash.slice(0, 10)}...\nTransfer Tx: ${transferTxHash.slice(0, 10)}...\n💰 Funded with 0.001 ETH\n⚠️ UserOp failed (check logs)`;

      Alert.alert('Success', successMessage);
    } catch (error) {
      console.error('Error creating passkey:', error);
      Alert.alert('Error', `Failed to create passkey: ${error}`);
    } finally {
      setIsCreating(false);
    }
  };
  */

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>ANON</Text>

        <Text style={styles.title}>Welcome to Anon Wallet</Text>

        <Text style={styles.subtitle}>
          Create your secure wallet with biometric authentication
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleCreateWallet}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Create Wallet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.white,
    letterSpacing: 4,
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textGray,
    marginBottom: 48,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});