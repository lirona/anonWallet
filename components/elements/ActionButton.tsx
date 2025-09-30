import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/theme/colors';

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

function ActionButton({ icon, label, onPress, variant = 'secondary' }: ActionButtonProps) {
  const backgroundColor = variant === 'primary' ? colors.orange : colors.bronze;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  icon: {
    fontSize: 28,
    marginBottom: 4,
  },
  label: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ActionButton;