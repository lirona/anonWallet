import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import ActionButton from '@/components/elements/ActionButton';
import QRScannerModal from '@/components/elements/QRScannerModal';
import TransactionItem from '@/components/elements/TransactionItem';
import { colors } from '@/theme/colors';
import type { Transaction } from '@/types/Transaction';
import { useAppSlice } from '@/slices';
import { useDataPersist, DataPersistKeys } from '@/hooks/useDataPersist';

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
  const { dispatch, reset } = useAppSlice();
  const { removePersistData } = useDataPersist();
  const [showScannerModal, setShowScannerModal] = React.useState(false);

  const handleScanQR = () => {
    setShowScannerModal(true);
  };

  const handleQRScanned = (data: string) => {
    console.log('Scanned QR code:', data);

    try {
      // Parse the payment link URL
      const url = new URL(data);
      const recipient = url.searchParams.get('recipient');
      const amount = url.searchParams.get('amount');
      const chainId = url.searchParams.get('chainId');

      // Navigate to send screen with parsed params
      router.push({
        pathname: '/send',
        params: {
          recipient: recipient || '',
          amount: amount || '',
          chainId: chainId || '',
        },
      });
    } catch (error) {
      // Not a valid URL or payment link
      console.error('Invalid QR code format:', error);
      // TODO: Show error toast to user
    }
  };

  const handleReceive = () => {
    router.push('/receive');
  };

  const handleRedeem = () => {
    router.push('/redeem');
  };

  const handleSend = () => {
    // Navigate to send screen with hardcoded test values
    router.push({
      pathname: '/send',
      params: {
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        amount: '10.50',
        chainId: '11155111',
      },
    });
  };

  const handleNotifications = () => {
    // TODO: Implement notifications
  };

  const handleSettings = () => {
    // TODO: Implement settings
  };

  const handleLogout = async () => {
    // Clear persisted user data
    await removePersistData(DataPersistKeys.USER);

    // Reset Redux state
    dispatch(reset());

    // Navigate back to landing screen
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* QR Scanner Modal */}
      <QRScannerModal
        visible={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScan={handleQRScanned}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>COIL</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={handleSend}>
            <MaterialIcons name="send" size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNotifications}>
            <MaterialIcons name="notifications" size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSettings}>
            <MaterialIcons name="settings" size={24} color={colors.white} />
          </TouchableOpacity>
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
        <ActionButton icon="qr-code-scanner" label="Scan QR" onPress={handleScanQR} shape="square" />
        <ActionButton icon="call-received" label="Receive" onPress={handleReceive} shape="square" />
        <ActionButton icon="redeem" label="Redeem" onPress={handleRedeem} variant="primary" shape="square" />
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
    color: colors.textTertiary,
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