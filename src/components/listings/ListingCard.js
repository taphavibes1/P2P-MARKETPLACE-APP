import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { LISTING_STATUS } from '../../constants';

const STATUS_LABELS = {
  [LISTING_STATUS.AVAILABLE]: null,
  [LISTING_STATUS.RESERVED]: { label: 'Reserved', color: COLORS.reserved },
  [LISTING_STATUS.SOLD]: { label: 'Sold', color: COLORS.sold },
};

export default function ListingCard({ listing, onPress }) {
  const { title, price, imageUrls, sellerName, status, category } = listing;
  const badge = STATUS_LABELS[status];
  const thumb = imageUrls?.[0];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.imageWrap}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={36} color={COLORS.textDisabled} />
          </View>
        )}
        {badge && (
          <View style={[styles.badge, { backgroundColor: badge.color }]}>
            <Text style={styles.badgeText}>{badge.label}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.price}>₦{Number(price).toLocaleString()}</Text>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <View style={styles.sellerRow}>
          <Ionicons name="person-circle-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.seller} numberOfLines={1}>{sellerName}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  imageWrap: {
    height: 130,
    backgroundColor: COLORS.background,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: SIZES.borderRadiusFull,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  info: { padding: SIZES.sm + 2 },
  price: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  title: { fontSize: 12, color: COLORS.textPrimary, marginTop: 2, lineHeight: 17 },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: SIZES.xs + 2,
  },
  seller: { fontSize: 11, color: COLORS.textSecondary, flex: 1 },
});
