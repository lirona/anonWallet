import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { colors } from '@/theme/colors';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface ActionButtonProps {
  icon?: IconName;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
  disabled?: boolean;
  shape?: 'square' | 'rounded' | 'pill';
}

function ActionButton({
  icon,
  label,
  onPress,
  variant = 'secondary',
  fullWidth = false,
  disabled = false,
  shape = 'square',
}: ActionButtonProps) {
  const backgroundColor = variant === 'primary' ? colors.primary : colors.primaryLight;
  const iconColor = variant === 'primary' ? colors.background : colors.white;

  // Determine border radius based on shape
  const getBorderRadius = () => {
    switch (shape) {
      case 'square':
        return 8;
      case 'rounded':
        return 12;
      case 'pill':
        return 28;
      default:
        return 8;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor,
          borderRadius: getBorderRadius(),
        },
        fullWidth ? styles.fullWidth : styles.flex,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      {icon && <MaterialIcons name={icon} size={24} color={iconColor} style={styles.icon} />}
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    marginHorizontal: 6,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    marginBottom: 4,
  },
  label: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ActionButton;