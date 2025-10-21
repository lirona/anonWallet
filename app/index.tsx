import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { DataPersistKeys, useDataPersist } from '@/hooks/useDataPersist';
import { smartWalletService, webAuthnService } from '@/services';
import { useAppSlice } from '@/slices';
import { colors } from '@/theme/colors';

export default function WalletCreationScreen() {
  const { dispatch, setUser, setLoggedIn } = useAppSlice();
  const { setPersistData } = useDataPersist();
  const [isCreating, setIsCreating] = useState(false);
  const [progressText, setProgressText] = useState('');

  const handleCreateWallet = async () => {
    setIsCreating(true);

    try {
      // 1. Create passkey
      setProgressText('יוצר passkey...');
      console.log('🔐 Step 1: Creating passkey...');
      const { publicKey, rawId } = await webAuthnService.createPasskey('My Wallet');
      console.log('✅ Passkey created');

      // 2. Calculate wallet address (before deployment)
      setProgressText('מחשב כתובת ארנק...');
      console.log('🧮 Step 2: Calculating wallet address...');
      const walletAddress = await smartWalletService.getWalletAddress(publicKey);
      console.log('✅ Wallet address:', walletAddress);

      // 3. Deploy wallet and claim welcome bonus (101 COIL tokens)
      setProgressText('יוצר ארנק ושולח בונוס הצטרפות...');
      console.log('🏗️ Step 3: Deploying wallet and claiming 101 COIL welcome bonus...');
      await smartWalletService.deployWalletAndClaimWelcomeBonus(publicKey, rawId);
      console.log('✅ Wallet deployed and welcome bonus claimed');

      // Wait for deployment to be mined
      setProgressText('ממתין לשליחה...');
      console.log('⏳ Waiting 15 seconds for deployment to be mined...');
      await new Promise(resolve => setTimeout(resolve, 15000));

      // 4. Save to AsyncStorage
      const userData = {
        passkeyRawId: rawId,
        walletAddress,
      };
      await setPersistData(DataPersistKeys.USER, userData);

      // 5. Update Redux
      dispatch(setUser(userData));
      dispatch(setLoggedIn(true));

      // 6. Navigate to wallet home
      router.push('/wallet-home');
      console.log('🎉 Wallet creation complete!');
    } catch (error) {
      console.error('❌ Wallet creation failed:', error);
      Alert.alert(
        'שגיאה',
        `נכשל ביצירת ארנק: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsCreating(false);
      setProgressText('');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>COIL</Text>

        <Text style={styles.title}>ברוכים הבאים לארנק הדיגיטלי שלכם</Text>

        <Text style={styles.subtitle}>
          יצירת ארנק חדש עם אימות ביומטרי
        </Text>

        <TouchableOpacity
          style={[styles.button, isCreating && styles.buttonDisabled]}
          onPress={handleCreateWallet}
          activeOpacity={0.8}
          disabled={isCreating}
        >
          {isCreating ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color={colors.white} />
              <Text style={styles.buttonText}>{progressText}</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>יצירת ארנק</Text>
          )}
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
    color: colors.textSecondary,
    marginBottom: 48,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});