import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ActionButton from '@/components/elements/ActionButton';
import TransactionItem from '@/components/elements/TransactionItem';
import { colors } from '@/theme/colors';
import type { Transaction } from '@/types/Transaction';

// Hardcoded data as per requirements
const BALANCE = 1234.56;

const TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    type: 'received',
    amount: 100.00,
    timestamp: '2024-03-15 10:30 AM',
  },
  {
    id: '2',
    type: 'sent',
    amount: 50.00,
    timestamp: '2024-03-14 02:45 PM',
  },
  {
    id: '3',
    type: 'received',
    amount: 250.00,
    timestamp: '2024-03-13 09:15 AM',
  },
  {
    id: '4',
    type: 'sent',
    amount: 75.00,
    timestamp: '2024-03-12 04:00 PM',
  },
  {
    id: '5',
    type: 'received',
    amount: 150.00,
    timestamp: '2024-03-11 11:20 AM',
  },
  {
    id: '6',
    type: 'sent',
    amount: 120.00,
    timestamp: '2024-03-10 03:30 PM',
  },
  {
    id: '7',
    type: 'received',
    amount: 300.00,
    timestamp: '2024-03-09 08:15 AM',
  },
  {
    id: '8',
    type: 'sent',
    amount: 85.50,
    timestamp: '2024-03-08 01:20 PM',
  },
  {
    id: '9',
    type: 'received',
    amount: 200.00,
    timestamp: '2024-03-07 10:45 AM',
  },
  {
    id: '10',
    type: 'sent',
    amount: 95.00,
    timestamp: '2024-03-06 05:00 PM',
  },
];

function WalletHomeScene() {
  const handleScanQR = () => {
    // TODO: Implement QR scanning
  };

  const handleReceive = () => {
    // TODO: Implement receive functionality
  };

  const handleRedeem = () => {
    // TODO: Implement redeem functionality
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>ANON</Text>
        <View style={styles.headerIcons}>
          <Text style={styles.headerIcon}>🔔</Text>
          <Text style={styles.headerIcon}>⚙️</Text>
        </View>
      </View>

      {/* Balance Section */}
      <View style={styles.balanceSection}>
        <Text style={styles.balanceAmount}>
          {BALANCE.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
        <Text style={styles.balanceLabel}>Available Balance</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <ActionButton icon="📷" label="Scan QR" onPress={handleScanQR} />
        <ActionButton icon="↓" label="Receive" onPress={handleReceive} />
        <ActionButton icon="🎁" label="Redeem" onPress={handleRedeem} variant="primary" />
      </View>

      {/* Transactions Section */}
      <View style={styles.transactionsSection}>
        <Text style={styles.transactionsHeader}>Transactions</Text>
        <FlatList
          data={TRANSACTIONS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionItem transaction={item} />}
          showsVerticalScrollIndicator={false}
        />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    letterSpacing: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerIcon: {
    fontSize: 22,
  },
  balanceSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 16,
    color: colors.textGray,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    marginBottom: 32,
  },
  transactionsSection: {
    flex: 1,
    backgroundColor: colors.background,
  },
  transactionsHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.white,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
});

export default WalletHomeScene;