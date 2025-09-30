import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import type { Transaction } from '@/types/Transaction';

interface TransactionItemProps {
  transaction: Transaction;
}

function TransactionItem({ transaction }: TransactionItemProps) {
  const isReceived = transaction.type === 'received';
  const iconBgColor = isReceived ? colors.greenDark : colors.redDark;
  const amountColor = isReceived ? colors.green : colors.red;
  const amountPrefix = isReceived ? '+' : '-';
  const icon = isReceived ? '↓' : '↗';

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.type}>
          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
        </Text>
        <Text style={styles.timestamp}>{transaction.timestamp}</Text>
      </View>

      <Text style={[styles.amount, { color: amountColor }]}>
        {amountPrefix}{transaction.amount.toFixed(2)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
    color: colors.white,
  },
  info: {
    flex: 1,
  },
  type: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 13,
    color: colors.textGray,
  },
  amount: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default TransactionItem;