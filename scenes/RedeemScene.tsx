import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import ActionButton from '@/components/elements/ActionButton';
import { colors } from '@/theme/colors';

// Dummy verification function - replace with actual API call later
const verifyCode = async (code: string): Promise<boolean> => {
  // TODO: Replace with actual API call
  return true;
};

function RedeemScene() {
  const [couponCode, setCouponCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const isCodeValid = couponCode.length === 6;

  const handleBack = () => {
    router.back();
  };

  const handleApplyCode = async () => {
    if (!isCodeValid) return;

    setIsVerifying(true);
    try {
      const verified = await verifyCode(couponCode);
      if (verified) {
        setIsVerified(true);
      }
    } catch (error) {
      console.error('Error verifying code:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRedeem = () => {
    // TODO: Implement redeem functionality
    console.log('Redeeming coupon:', couponCode);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Redeem Coupon</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Trophy Icon */}
        <View style={styles.iconContainer}>
          <MaterialIcons name="emoji-events" size={80} color={colors.primary} />
        </View>

        {/* Coupon Code Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Coupon Code"
              placeholderTextColor={colors.textSecondary}
              value={couponCode}
              onChangeText={(text) => {
                setCouponCode(text.toUpperCase());
                // Reset verification when user edits the code
                if (isVerified) {
                  setIsVerified(false);
                }
              }}
              maxLength={6}
              autoCapitalize="characters"
            />
            {isCodeValid && (
              <MaterialIcons name="check-circle" size={24} color={colors.green} style={styles.checkIcon} />
            )}
          </View>
        </View>

        {/* Instructions */}
        <Text style={styles.instructionsText}>
          Enter a valid coupon code to receive your reward.
        </Text>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Action Button */}
        <View style={styles.actions}>
          {!isVerified ? (
            <ActionButton
              label={isVerifying ? 'Verifying...' : 'Apply Code'}
              onPress={handleApplyCode}
              variant="secondary"
              fullWidth
              shape="pill"
              disabled={!isCodeValid || isVerifying}
            />
          ) : (
            <ActionButton
              label="Redeem"
              onPress={handleRedeem}
              variant="primary"
              fullWidth
              shape="pill"
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 9999,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackgroundDark,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 18,
    color: colors.white,
    letterSpacing: 2,
  },
  checkIcon: {
    marginLeft: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  spacer: {
    flex: 1,
  },
  actions: {
    paddingBottom: 16,
  },
});

export default RedeemScene;
