import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors } from '@/theme/colors';
import type { Transaction } from '@/types/Transaction';

interface TransactionItemProps {
  transaction: Transaction;
}

function TransactionItem({ transaction }: TransactionItemProps) {
  const isReceived = transaction.type === 'received';
  const iconBgColor = isReceived ? colors.greenBackground : colors.redBackground;
  const amountColor = isReceived ? colors.green : colors.red;
  const amountPrefix = isReceived ? '+' : '-';
  const iconName = isReceived ? 'south-west' : 'north-east';

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <MaterialIcons name={iconName} size={24} color={amountColor} />
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
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    marginVertical: 6,
    backgroundColor: colors.cardBackgroundDark,
    borderRadius: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
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
    color: colors.textSecondary,
  },
  amount: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default TransactionItem;