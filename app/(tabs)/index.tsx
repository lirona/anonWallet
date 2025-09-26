import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { create } from 'react-native-passkeys';
import { createPublicClient, createWalletClient, http, keccak256, toHex, parseEther, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fromBase64urlToBytes } from '@/utils/base64';
import { FACTORY_ABI } from '@/contracts/abi/factory';
import { getPasskeyCreationOptions } from '@/config/webauthn';
import { executeUserOperation } from '@/utils/userOperationBuilder';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.EXPO_PUBLIC_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo'),
});

const account = privateKeyToAccount(process.env.EXPO_PUBLIC_RELAYER_PRIVATE_KEY as Hex);

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(process.env.EXPO_PUBLIC_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo'),
});

export default function WalletCreationScreen() {
  const [walletName, setWalletName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

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

      // Ensure passkey creation succeeded
      if (!result) {
        throw new Error('Passkey creation was cancelled or failed');
      }

      console.log('✅ Passkey created successfully!');
      console.log('📱 Raw ID (base64url string):', result.rawId);

      // Convert rawId from base64url string to bytes
      const rawIdBytes: Uint8Array = fromBase64urlToBytes(result.rawId);
      const rawIdHex: Hex = toHex(rawIdBytes);
      console.log('🔍 Raw ID (hex):', rawIdHex);
      console.log('📏 Raw ID bytes length:', rawIdBytes.length);

      // Get the public key
      const publicKeyBase64: string | undefined = result.response.getPublicKey?.();
      if (!publicKeyBase64) {
        throw new Error('No public key received from passkey');
      }

      console.log('🔑 Public Key (base64url):', publicKeyBase64);
      console.log('📏 Public Key length (base64url):', publicKeyBase64.length);

      // Decode base64url to bytes using optimized native conversion
      const publicKeyBytes: Uint8Array = fromBase64urlToBytes(publicKeyBase64);
      console.log('📊 Decoded bytes length:', publicKeyBytes.length);
      console.log('🔍 First 8 bytes (hex):', toHex(publicKeyBytes.slice(0, 8)));

      // Validate expected 64-byte format (32 bytes x + 32 bytes y)
      if (publicKeyBytes.length !== 64) {
        throw new Error(`Invalid public key length: expected 64 bytes, got ${publicKeyBytes.length}`);
      }

      // Extract x and y coordinates (32 bytes each)
      const xBytes: Uint8Array = publicKeyBytes.slice(0, 32) as Uint8Array;
      const yBytes: Uint8Array = publicKeyBytes.slice(32, 64) as Uint8Array;

      console.log('🧮 X coordinate bytes (first 4):', toHex(xBytes.slice(0, 4)));
      console.log('🧮 Y coordinate bytes (first 4):', toHex(yBytes.slice(0, 4)));

      // Convert to hex strings
      const x: Hex = toHex(xBytes);
      const y: Hex = toHex(yBytes);

      console.log('✨ Public Key X (hex):', x);
      console.log('✨ Public Key Y (hex):', y);

      // Hash the rawId for blockchain storage
      const rawIdHash: Hex = keccak256(rawIdBytes);
      console.log('🏷️ Raw ID Hash:', rawIdHash);

      // Call factory contract saveUser method
      console.log('🚀 Calling saveUser on factory contract...');

      // Convert rawIdHash to a uint256 ID (using first 32 bytes as ID)
      const contractUserId: bigint = BigInt(rawIdHash);
      const publicKeyArray: readonly [Hex, Hex] = [x, y] as const;

      console.log('📋 Contract params:', { userId: contractUserId.toString(), publicKey: publicKeyArray });

      const factoryAddress: Hex = process.env.EXPO_PUBLIC_FACTORY_CONTRACT_ADDRESS as Hex;

      const txHash: Hex = await walletClient.writeContract({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: 'saveUser',
        args: [contractUserId, publicKeyArray],
      });

      console.log('✅ Transaction sent:', txHash);
      console.log('⏳ Waiting for confirmation...');

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60_000 // 60 seconds timeout
      });

      console.log('🎉 Transaction confirmed!');
      console.log('📄 Block number:', receipt.blockNumber);
      console.log('⛽ Gas used:', receipt.gasUsed);

      // Get the user's address from the contract
      console.log('🔍 Getting user address from contract...');
      const userData = await publicClient.readContract({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: 'getUser',
        args: [contractUserId],
      });

      // Extract the user's account address from the returned tuple
      const userAddress: Hex = userData.account as Hex;
      console.log('👤 User address:', userAddress);

      // Transfer 0.001 ETH to the user's address
      console.log('💰 Transferring 0.001 ETH to user address...');
      const transferAmount: bigint = parseEther('0.001');

      const transferTxHash: Hex = await walletClient.sendTransaction({
        to: userAddress,
        value: transferAmount,
      });

      console.log('✅ Transfer transaction sent:', transferTxHash);
      console.log('⏳ Waiting for transfer confirmation...');

      // Wait for transfer confirmation
      const transferReceipt = await publicClient.waitForTransactionReceipt({
        hash: transferTxHash,
        timeout: 60_000
      });

      console.log('🎉 Transfer confirmed!');
      console.log('📄 Transfer block:', transferReceipt.blockNumber);
      console.log('⛽ Transfer gas used:', transferReceipt.gasUsed);

      // Execute UserOperation to send 0.0001 ETH back to relayer
      console.log('🔄 Starting UserOperation to send 0.0001 ETH back to relayer...');
      let userOpHash: Hex | null = null;

      try {
        userOpHash = await executeUserOperation(
          publicKeyArray,
          account.address, // Relayer address
          result.rawId // rawId for signing
        );
        console.log('✅ UserOperation completed successfully:', userOpHash);
      } catch (userOpError) {
        console.error('❌ UserOperation failed:', userOpError);
        console.error('📋 UserOperation error details:', {
          errorMessage: userOpError instanceof Error ? userOpError.message : String(userOpError),
          errorStack: userOpError instanceof Error ? userOpError.stack : undefined,
        });
        // Continue with success message even if UserOp fails
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

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Create Wallet
        </ThemedText>

        <ThemedText style={styles.subtitle}>
          Enter a name for your new wallet
        </ThemedText>

        <TextInput
          style={styles.input}
          value={walletName}
          onChangeText={setWalletName}
          placeholder="Wallet name"
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={[styles.button, isCreating && styles.buttonDisabled]}
          onPress={handleCreateWallet}
          disabled={isCreating}
        >
          <ThemedText style={styles.buttonText}>
            {isCreating ? 'Creating...' : 'Create Wallet'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 30,
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.7,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
