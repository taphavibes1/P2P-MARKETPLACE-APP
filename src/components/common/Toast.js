import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

const ICONS = {
  success: { name: 'checkmark-circle', color: COLORS.success },
  error: { name: 'close-circle', color: COLORS.error },
  info: { name: 'information-circle', color: COLORS.primary },
  warning: { name: 'warning', color: COLORS.warning },
};

export default function Toast({ visible, message, type = 'info', onHide }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 20, duration: 250, useNativeDriver: true }),
        ]).start(() => onHide?.());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;
  const icon = ICONS[type] || ICONS.info;

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <Ionicons name={icon.name} size={20} color={icon.color} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: SIZES.md,
    right: SIZES.md,
    backgroundColor: COLORS.textPrimary,
    borderRadius: SIZES.borderRadius,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    zIndex: 9999,
    ...SHADOWS.large,
  },
  text: {
    color: '#FFF',
    fontSize: 14,
    flex: 1,
  },
});
