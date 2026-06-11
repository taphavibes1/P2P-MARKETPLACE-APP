import React from 'react';
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES } from '../../constants';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

const ALL = { id: 'all', label: 'All', icon: 'grid' };
const ITEMS = [ALL, ...CATEGORIES];

export default function CategoryFilter({ selected, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {ITEMS.map(item => {
        const active = selected === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(item.id)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={active ? item.icon : `${item.icon}-outline`}
              size={14}
              color={active ? '#FFF' : COLORS.textSecondary}
            />
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    gap: SIZES.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.borderRadiusFull,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
});
