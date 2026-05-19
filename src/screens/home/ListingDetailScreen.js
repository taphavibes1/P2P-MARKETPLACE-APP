import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Dimensions, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchListingById, fetchSellerProfile } from '../../services/listingsService';
import { useAuth } from '../../context/AuthContext';
import ErrorState from '../../components/common/ErrorState';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { CATEGORIES, LISTING_STATUS, VERIFICATION_STATUS } from '../../constants';

const { width: SCREEN_W } = Dimensions.get('window');

const STATUS_STYLE = {
  [LISTING_STATUS.AVAILABLE]: { label: 'Available', bg: '#E8F5E9', color: COLORS.success },
  [LISTING_STATUS.RESERVED]: { label: 'Reserved', bg: '#FFF3E0', color: COLORS.reserved },
  [LISTING_STATUS.SOLD]: { label: 'Sold', bg: '#F5F5F5', color: COLORS.sold },
};

function StarRating({ rating, size = 14 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={COLORS.accent}
        />
      ))}
    </View>
  );
}

export default function ListingDetailScreen({ route, navigation }) {
  const { listingId } = route.params;
  const { userProfile } = useAuth();
  const [listing, setListing] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const flatRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [listingId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const l = await fetchListingById(listingId);
      if (!l) { setError('Listing not found.'); return; }
      setListing(l);
      const s = await fetchSellerProfile(l.sellerId);
      setSeller(s);
    } catch {
      setError('Could not load listing. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const isVerified = userProfile?.verificationStatus === VERIFICATION_STATUS.VERIFIED;
  const isOwnListing = userProfile?.id === listing?.sellerId;
  const isAvailable = listing?.status === LISTING_STATUS.AVAILABLE;

  const categoryLabel = CATEGORIES.find(c => c.id === listing?.category)?.label ?? listing?.category;

  const handleMessageSeller = () => {
    if (!userProfile) { navigation.navigate('Login'); return; }
    navigation.navigate('ChatThread', { listingId, sellerId: listing.sellerId, listingTitle: listing.title });
  };

  const handleBuyNow = () => {
    if (!isVerified) return;
    navigation.navigate('Payment', { listingId });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !listing) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <ErrorState message={error} onRetry={loadData} />
      </SafeAreaView>
    );
  }

  const photos = listing.imageUrls?.length > 0 ? listing.imageUrls : [null];
  const statusStyle = STATUS_STYLE[listing.status] ?? STATUS_STYLE.available;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo carousel */}
        <View style={styles.photoWrap}>
          <FlatList
            ref={flatRef}
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={e => {
              setActivePhoto(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
            }}
            renderItem={({ item }) =>
              item ? (
                <Image source={{ uri: item }} style={styles.photo} resizeMode="cover" />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]}>
                  <Ionicons name="image-outline" size={64} color={COLORS.textDisabled} />
                </View>
              )
            }
          />
          {/* Dots */}
          {photos.length > 1 && (
            <View style={styles.dots}>
              {photos.map((_, i) => (
                <View key={i} style={[styles.dot, i === activePhoto && styles.dotActive]} />
              ))}
            </View>
          )}
          {/* Back button overlay */}
          <TouchableOpacity style={styles.backOverlay} onPress={() => navigation.goBack()}>
            <View style={styles.backCircle}>
              <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* Price + status */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>₦{Number(listing.price).toLocaleString()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
            </View>
          </View>

          {/* Title + category */}
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.categoryRow}>
            <Ionicons name="pricetag-outline" size={13} color={COLORS.textSecondary} />
            <Text style={styles.categoryText}>{categoryLabel}</Text>
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>{listing.description || 'No description provided.'}</Text>

          <View style={styles.divider} />

          {/* Seller info */}
          <Text style={styles.sectionLabel}>Seller</Text>
          {seller ? (
            <View style={styles.sellerCard}>
              <View style={styles.sellerAvatar}>
                <Text style={styles.sellerInitial}>
                  {seller.name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{seller.name}</Text>
                <Text style={styles.sellerDept}>{seller.department}</Text>
                <View style={styles.sellerMeta}>
                  {seller.totalRatings > 0 ? (
                    <>
                      <StarRating rating={seller.rating} />
                      <Text style={styles.sellerRatingCount}>
                        ({seller.totalRatings} {seller.totalRatings === 1 ? 'rating' : 'ratings'})
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.noRating}>No ratings yet</Text>
                  )}
                </View>
                <Text style={styles.sellerSales}>
                  {seller.totalSales ?? 0} completed {seller.totalSales === 1 ? 'sale' : 'sales'}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.description}>Seller info unavailable.</Text>
          )}

          {/* Location label */}
          {listing.locationLabel && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Listed Near</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                <Text style={styles.locationText}>{listing.locationLabel}</Text>
              </View>
            </>
          )}

          {/* Unverified notice */}
          {userProfile && !isVerified && (
            <View style={styles.noticeBanner}>
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.warning} />
              <Text style={styles.noticeText}>
                Verify your student ID to message sellers and make purchases.
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Action buttons */}
      {!isOwnListing && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.msgBtn, !userProfile && styles.btnDisabled]}
            onPress={handleMessageSeller}
            disabled={!userProfile}
          >
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
            <Text style={styles.msgBtnText}>Message Seller</Text>
          </TouchableOpacity>

          {isAvailable && (
            <TouchableOpacity
              style={[styles.buyBtn, !isVerified && styles.btnDisabled]}
              onPress={handleBuyNow}
              disabled={!isVerified}
            >
              <Text style={styles.buyBtnText}>
                {isVerified ? 'Buy Now' : 'Verify to Buy'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isOwnListing && (
        <View style={styles.actions}>
          {listing.status === 'reserved' ? (
            <TouchableOpacity
              style={styles.buyBtn}
              onPress={() => navigation.navigate('SellerQR', { listingId })}
            >
              <Ionicons name="qr-code" size={18} color="#FFF" />
              <Text style={styles.buyBtnText}>Show My QR Code</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('EditListing', { listingId })}
            >
              <Ionicons name="create-outline" size={18} color={COLORS.primary} />
              <Text style={styles.msgBtnText}>Edit Listing</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: { padding: SIZES.md },
  photoWrap: { position: 'relative' },
  photo: { width: SCREEN_W, height: 280, backgroundColor: COLORS.background },
  photoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  dots: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
  },
  dot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: { backgroundColor: '#FFF', width: 16 },
  backOverlay: { position: 'absolute', top: SIZES.md, left: SIZES.md },
  backCircle: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  body: { padding: SIZES.md, backgroundColor: COLORS.surface },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 26, fontWeight: '800', color: COLORS.primary },
  statusBadge: {
    paddingHorizontal: SIZES.md,
    paddingVertical: 4,
    borderRadius: SIZES.borderRadiusFull,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginTop: SIZES.sm },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  categoryText: { fontSize: 13, color: COLORS.textSecondary },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SIZES.md },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SIZES.sm },
  description: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 22 },
  sellerCard: {
    flexDirection: 'row',
    gap: SIZES.md,
    padding: SIZES.md,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
  },
  sellerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerInitial: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  sellerInfo: { flex: 1, gap: 3 },
  sellerName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  sellerDept: { fontSize: 12, color: COLORS.textSecondary },
  sellerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sellerRatingCount: { fontSize: 12, color: COLORS.textSecondary },
  noRating: { fontSize: 12, color: COLORS.textDisabled },
  sellerSales: { fontSize: 12, color: COLORS.textSecondary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { fontSize: 14, color: COLORS.textPrimary },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
    backgroundColor: '#FFF8E1',
    borderRadius: SIZES.borderRadius,
    padding: SIZES.md,
    marginTop: SIZES.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  noticeText: { flex: 1, fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: SIZES.sm,
    padding: SIZES.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.medium,
  },
  msgBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: SIZES.borderRadiusFull,
    padding: SIZES.md,
  },
  msgBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  buyBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadiusFull,
    padding: SIZES.md,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  buyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: SIZES.borderRadiusFull,
    padding: SIZES.md,
  },
  btnDisabled: { opacity: 0.45 },
});
