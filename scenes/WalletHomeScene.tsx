import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { formatUnits, hexToBigInt, type Address } from 'viem';

import ActionButton from '@/components/elements/ActionButton';
import QRScannerModal from '@/components/elements/QRScannerModal';
import TransactionItem from '@/components/elements/TransactionItem';
import { colors } from '@/theme/colors';
import type { Transaction } from '@/types/Transaction';
import { useAppSlice, useTokenSlice } from '@/slices';
import { useDataPersist, DataPersistKeys } from '@/hooks/useDataPersist';
import { tokenService, type TokenTransfer } from '@/services';

/**
 * Convert TokenTransfer to Transaction format
 */
const convertToTransaction = (transfer: TokenTransfer, walletAddress: string): Transaction => {
  const isSent = transfer.from.toLowerCase() === walletAddress.toLowerCase();
  return {
    id: transfer.transactionHash,
    type: isSent ? 'sent' : 'received',
    amount: parseFloat(formatUnits(hexToBigInt(transfer.value), 18)),
    timestamp: transfer.timestamp
      ? new Date(transfer.timestamp * 1000).toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Pending',
  };
};

function WalletHomeScene() {
  const { user, dispatch, reset } = useAppSlice();
  const tokenSlice = useTokenSlice();
  const { removePersistData } = useDataPersist();
  const [showScannerModal, setShowScannerModal] = React.useState(false);

  // Fetch balance and transactions on mount
  React.useEffect(() => {
    if (!user?.walletAddress) return;

    const fetchBalanceAndTransactions = async () => {
      try {
        // Fetch balance
        tokenSlice.dispatch(tokenSlice.setLoadingBalance(true));
        const [balance, balanceRaw] = await Promise.all([
          tokenService.getBalance(user.walletAddress as Address),
          tokenService.getBalanceRaw(user.walletAddress as Address),
        ]);
        tokenSlice.dispatch(tokenSlice.setBalance({ balance, balanceRaw }));
        tokenSlice.dispatch(tokenSlice.setLoadingBalance(false));

        // Fetch latest 10 transactions (from current block - 10 to current block)
        tokenSlice.dispatch(tokenSlice.setLoadingTransactions(true));
        const transfers = await tokenService.getTransfers(user.walletAddress as Address, {
          limit: 10,
        });
        tokenSlice.dispatch(tokenSlice.setTransactions(transfers));
        tokenSlice.dispatch(tokenSlice.setLoadingTransactions(false));
      } catch (error) {
        console.error('Error fetching balance and transactions:', error);
        tokenSlice.dispatch(tokenSlice.setError(error instanceof Error ? error.message : 'Unknown error'));
        tokenSlice.dispatch(tokenSlice.setLoadingBalance(false));
        tokenSlice.dispatch(tokenSlice.setLoadingTransactions(false));
      }
    };

    fetchBalanceAndTransactions();
  }, [user?.walletAddress]);

  // Poll for balance and new transactions every 5 seconds
  React.useEffect(() => {
    if (!user?.walletAddress || !tokenSlice.lastFetchedBlock) return;

    const pollBalanceAndTransactions = async () => {
      try {
        // Fetch balance
        const [balance, balanceRaw] = await Promise.all([
          tokenService.getBalance(user.walletAddress as Address),
          tokenService.getBalanceRaw(user.walletAddress as Address),
        ]);
        tokenSlice.dispatch(tokenSlice.setBalance({ balance, balanceRaw }));

        // Get current block to avoid fetching blocks that don't exist yet
        const currentBlock = await tokenService.getCurrentBlock();
        const lastBlock = hexToBigInt(tokenSlice.lastFetchedBlock);

        // Only fetch if there are new blocks
        if (currentBlock > lastBlock) {
          // Fetch transactions from the last fetched block + 1 to current block
          const transfers = await tokenService.getTransfers(user.walletAddress as Address, {
            fromBlock: lastBlock + 1n,
            toBlock: currentBlock,
            limit: 10,
          });

          // Prepend new transactions if any
          if (transfers.length > 0) {
            tokenSlice.dispatch(tokenSlice.prependTransactions(transfers));
          } else {
            // No new transactions, but update lastFetchedBlock to current block
            tokenSlice.dispatch(tokenSlice.setLastFetchedBlock(`0x${currentBlock.toString(16)}`));
          }
        }
      } catch (error) {
        console.error('Error polling balance and transactions:', error);
      }
    };

    // Set up polling interval (every 5 seconds)
    const intervalId = setInterval(pollBalanceAndTransactions, 5000);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [user?.walletAddress, tokenSlice.lastFetchedBlock]);

  // Load more transactions for infinite scroll
  const handleLoadMore = async () => {
    if (!user?.walletAddress || tokenSlice.isLoadingMore || tokenSlice.transactions.length === 0) return;

    try {
      tokenSlice.dispatch(tokenSlice.setLoadingMore(true));

      // Get the oldest transaction's block number
      const oldestTransaction = tokenSlice.transactions[tokenSlice.transactions.length - 1];
      const oldestBlock = hexToBigInt(oldestTransaction.blockNumber);

      // Fetch 10 more transactions before the oldest block
      const transfers = await tokenService.getTransfers(user.walletAddress as Address, {
        toBlock: oldestBlock - 1n,
        limit: 10,
      });

      // Append older transactions
      if (transfers.length > 0) {
        tokenSlice.dispatch(tokenSlice.appendTransactions(transfers));
      }

      tokenSlice.dispatch(tokenSlice.setLoadingMore(false));
    } catch (error) {
      console.error('Error loading more transactions:', error);
      tokenSlice.dispatch(tokenSlice.setLoadingMore(false));
    }
  };

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
        {tokenSlice.isLoadingBalance ? (
          <ActivityIndicator size="large" color={colors.white} />
        ) : (
          <Text style={styles.balanceAmount}>
            {parseFloat(tokenSlice.balance).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        )}
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
        {tokenSlice.isLoadingTransactions ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.white} />
          </View>
        ) : (
          <FlatList
            data={tokenSlice.transactions.map(t => convertToTransaction(t, user?.walletAddress || ''))}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TransactionItem transaction={item} />}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              tokenSlice.isLoadingMore ? (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color={colors.white} />
                </View>
              ) : null
            }
          />
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default WalletHomeScene;