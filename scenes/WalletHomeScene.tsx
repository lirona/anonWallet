import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatUnits, hexToBigInt, type Address } from 'viem';

import ActionButton from '@/components/elements/ActionButton';
import QRScannerModal from '@/components/elements/QRScannerModal';
import TransactionItem from '@/components/elements/TransactionItem';
import { DataPersistKeys, useDataPersist } from '@/hooks/useDataPersist';
import { tokenService, type TokenTransfer } from '@/services';
import { useAppSlice, useTokenSlice } from '@/slices';
import { colors } from '@/theme/colors';
import type { Transaction } from '@/types/Transaction';

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
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);

  // Extract stable references
  const tokenDispatch = tokenSlice.dispatch;
  const {
    setLoadingBalance,
    setLoadingTransactions,
    setBalance,
    setTransactions,
    setError,
    prependTransactions,
    setLastFetchedBlock,
  } = tokenSlice;

  // Fetch balance and transactions on mount and when screen is focused
  const fetchBalanceAndTransactions = React.useCallback(async () => {
    if (!user?.walletAddress) return;
    // Only show spinners on initial load
    if (isInitialLoad) {
      tokenDispatch(setLoadingBalance(true));
      tokenDispatch(setLoadingTransactions(true));
    }
    try {
      const [balance, balanceRaw] = await Promise.all([
        tokenService.getBalance(user.walletAddress as Address),
        tokenService.getBalanceRaw(user.walletAddress as Address),
      ]);
      tokenDispatch(setBalance({ balance, balanceRaw }));
      const transfers = await tokenService.getTransfers(user.walletAddress as Address, {
        limit: 10,
      });
      tokenDispatch(setTransactions(transfers));
    } catch (error) {
      console.error('Error fetching balance and transactions:', error);
      tokenDispatch(setError(error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      if (isInitialLoad) {
        tokenDispatch(setLoadingBalance(false));
        tokenDispatch(setLoadingTransactions(false));
        setIsInitialLoad(false);
      }
    }
  }, [
    user?.walletAddress,
    isInitialLoad,
    tokenDispatch,
    setLoadingBalance,
    setLoadingTransactions,
    setBalance,
    setTransactions,
    setError,
  ]);

  // Remove initial useEffect fetch to avoid duplicate requests

  // Only fetch on initial mount, not on every focus to avoid clearing the list
  React.useEffect(() => {
    if (isInitialLoad) {
      fetchBalanceAndTransactions();
    }
  }, [isInitialLoad, fetchBalanceAndTransactions]);

  // Poll for balance and new transactions every 5 seconds
  React.useEffect(() => {
    if (!user?.walletAddress) return;
    let isMounted = true;
    const pollBalanceAndTransactions = async () => {
      // Don't show spinners during polling - update seamlessly
      try {
        const [balance, balanceRaw] = await Promise.all([
          tokenService.getBalance(user.walletAddress as Address),
          tokenService.getBalanceRaw(user.walletAddress as Address),
        ]);
        if (isMounted) {
          tokenDispatch(setBalance({ balance, balanceRaw }));
        }
        // ...existing block polling logic...
        const currentBlock = await tokenService.getCurrentBlock();
        let lastBlock: bigint;
        if (tokenSlice.lastFetchedBlock) {
          lastBlock = hexToBigInt(tokenSlice.lastFetchedBlock);
        } else {
          lastBlock = currentBlock;
        }
        if (currentBlock > lastBlock) {
          const fromBlock = lastBlock + 1n;
          const toBlock = currentBlock;
          console.log(`🔄 Polling: Fetching balance and transactions between blocks ${fromBlock} - ${toBlock}`);
          const transfers = await tokenService.getTransfers(user.walletAddress as Address, {
            fromBlock,
            toBlock,
            limit: 10,
          });
          if (isMounted && transfers.length > 0) {
            tokenDispatch(prependTransactions(transfers));
          } else if (isMounted) {
            tokenDispatch(setLastFetchedBlock(`0x${currentBlock.toString(16)}`));
          }
        } else {
          console.log(`🔄 Polling: No new blocks. Current: ${currentBlock}, Last: ${lastBlock}`);
        }
      } catch (error) {
        console.error('Error polling balance and transactions:', error);
      }
    };
    const intervalId = setInterval(pollBalanceAndTransactions, 10000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [
    user?.walletAddress,
    tokenDispatch,
    setBalance,
    prependTransactions,
    setLastFetchedBlock,
    tokenSlice.lastFetchedBlock,
  ]);

  // TODO: Re-implement infinite scroll - see GitHub issue
  // Load more transactions for infinite scroll
  // const handleLoadMore = async () => {
  //   if (!user?.walletAddress || tokenSlice.isLoadingMore || tokenSlice.transactions.length === 0) return;

  //   try {
  //     tokenSlice.dispatch(tokenSlice.setLoadingMore(true));

  //     // Get the oldest transaction's block number
  //     const oldestTransaction = tokenSlice.transactions[tokenSlice.transactions.length - 1];
  //     const oldestBlock = hexToBigInt(oldestTransaction.blockNumber);

  //     console.log(`📜 Loading more historical transactions before block ${oldestBlock}`);

  //     // Fetch 10 more transactions before the oldest block
  //     const transfers = await tokenService.getTransfers(user.walletAddress as Address, {
  //       toBlock: oldestBlock - 1n,
  //       limit: 10,
  //     });

  //     // Append older transactions
  //     if (transfers.length > 0) {
  //       tokenSlice.dispatch(tokenSlice.appendTransactions(transfers));
  //       console.log(`✅ Loaded ${transfers.length} more transactions`);
  //     } else {
  //       console.log(`📭 No more transactions to load`);
  //     }

  //     tokenSlice.dispatch(tokenSlice.setLoadingMore(false));
  //   } catch (error) {
  //     console.error('Error loading more transactions:', error);
  //     tokenSlice.dispatch(tokenSlice.setLoadingMore(false));
  //   }
  // };

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
    router.push('/send');
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
        ) : tokenSlice.error ? (
          <Text style={styles.errorText}>{tokenSlice.error}</Text>
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
        ) : tokenSlice.error ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>{tokenSlice.error}</Text>
          </View>
        ) : (
          <FlatList
            data={tokenSlice.transactions.map(t => convertToTransaction(t, user?.walletAddress || ''))}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TransactionItem transaction={item} />}
            showsVerticalScrollIndicator={false}
            // ...existing code...
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
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
  loadingMoreText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  errorText: {
    marginTop: 6,
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});

export default WalletHomeScene;