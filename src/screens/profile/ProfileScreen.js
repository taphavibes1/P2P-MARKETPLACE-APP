import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ScrollView, ActivityIndicator, RefreshControl, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { fetchMyListings, updateListing, deleteListing } from '../../services/listingsService';
import { fetchMyPayments } from '../../services/paymentService';
import { submitRating, hasRated } from '../../services/ratingService';
import Toast from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';
import EmptyState from '../../components/common/EmptyState';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { VERIFICATION_STATUS, LISTING_STATUS, PAYMENT_STATUS } from '../../constants';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { seedDemoData } from '../../services/seedService';

// ─── Star Picker ─────────────────────────────────────────────────────────────
function StarPicker({ value, onChange, size = 32 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <TouchableOpacity key={i} onPress={() => onChange(i)}>
          <Ionicons
            name={i <= value ? 'star' : 'star-outline'}
            size={size}
            color={COLORS.accent}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Rating Modal ─────────────────────────────────────────────────────────────
function RatingModal({ visible, payment, onClose, onSubmit }) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const handle = async () => {
    if (stars === 0) { showToast('Please select a star rating', 'error'); return; }
    setSubmitting(true);
    try {
      await onSubmit(payment, stars, comment);
      onClose();
    } catch {
      showToast('Could not submit rating. Try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={rStyles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={rStyles.sheet}>
          <View style={rStyles.handle} />
          <Text style={rStyles.title}>Rate Your Experience</Text>
          <Text style={rStyles.sub}>How was your transaction with the seller?</Text>
          <View style={rStyles.stars}>
            <StarPicker value={stars} onChange={setStars} size={36} />
          </View>
          <View style={rStyles.inputWrap}>
            <View style={rStyles.textArea}>
              <Text
                style={rStyles.textInput}
                suppressHighlighting={false}
                onChangeText={setComment}
              >
                {comment}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[rStyles.submitBtn, submitting && rStyles.btnDisabled]}
            onPress={handle}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#FFF" />
              : <Text style={rStyles.submitBtnText}>Submit Rating</Text>}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </Modal>
  );
}

const rStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.borderRadiusLg,
    borderTopRightRadius: SIZES.borderRadiusLg,
    padding: SIZES.lg,
    paddingBottom: SIZES.xxl,
    gap: SIZES.md,
    alignItems: 'center',
  },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginBottom: SIZES.sm },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  stars: { paddingVertical: SIZES.sm },
  inputWrap: { width: '100%' },
  textArea: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.borderRadius,
    padding: SIZES.md, minHeight: 80,
  },
  textInput: { fontSize: 14, color: COLORS.textPrimary },
  submitBtn: {
    width: '100%', backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadiusFull, padding: SIZES.md,
    alignItems: 'center', ...SHADOWS.small,
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

// ─── Listing Row ───────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  [LISTING_STATUS.AVAILABLE]: COLORS.success,
  [LISTING_STATUS.RESERVED]: COLORS.reserved,
  [LISTING_STATUS.SOLD]: COLORS.sold,
};

function ListingRow({ listing, onPress, onDelete }) {
  return (
    <TouchableOpacity style={lStyles.row} onPress={onPress} activeOpacity={0.8}>
      <View style={[lStyles.statusBar, { backgroundColor: STATUS_COLOR[listing.status] ?? COLORS.textDisabled }]} />
      <View style={lStyles.info}>
        <Text style={lStyles.title} numberOfLines={1}>{listing.title}</Text>
        <Text style={lStyles.price}>₦{Number(listing.price).toLocaleString()}</Text>
        <Text style={lStyles.status}>
          {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
        </Text>
      </View>
      {listing.status === LISTING_STATUS.AVAILABLE && (
        <TouchableOpacity style={lStyles.deleteBtn} onPress={() => onDelete(listing)}>
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const lStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: SIZES.borderRadius,
    overflow: 'hidden', ...SHADOWS.small,
  },
  statusBar: { width: 5, alignSelf: 'stretch' },
  info: { flex: 1, padding: SIZES.md, gap: 3 },
  title: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  price: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  status: { fontSize: 12, color: COLORS.textSecondary },
  deleteBtn: { padding: SIZES.md },
});

// ─── Purchase Row ─────────────────────────────────────────────────────────────
function PurchaseRow({ payment, onRate, onViewStatus }) {
  const isReleased = payment.status === PAYMENT_STATUS.RELEASED;
  const isHeld = payment.status === PAYMENT_STATUS.HELD;

  return (
    <View style={pStyles.row}>
      <View style={pStyles.info}>
        <Text style={pStyles.title} numberOfLines={1}>
          {payment.listingTitle ?? `Payment ${payment.id.slice(0, 8)}`}
        </Text>
        <Text style={pStyles.amount}>₦{payment.total?.toLocaleString()}</Text>
        <View style={pStyles.statusRow}>
          <Ionicons
            name={isReleased ? 'checkmark-circle' : isHeld ? 'lock-closed' : 'refresh-circle'}
            size={13}
            color={isReleased ? COLORS.success : isHeld ? COLORS.primary : COLORS.warning}
          />
          <Text style={[pStyles.status, { color: isReleased ? COLORS.success : isHeld ? COLORS.primary : COLORS.warning }]}>
            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
          </Text>
        </View>
      </View>
      <View style={pStyles.actions}>
        <TouchableOpacity style={pStyles.viewBtn} onPress={() => onViewStatus(payment)}>
          <Text style={pStyles.viewBtnText}>View</Text>
        </TouchableOpacity>
        {isReleased && !payment.hasRated && (
          <TouchableOpacity style={pStyles.rateBtn} onPress={() => onRate(payment)}>
            <Ionicons name="star" size={14} color={COLORS.accent} />
            <Text style={pStyles.rateBtnText}>Rate</Text>
          </TouchableOpacity>
        )}
        {payment.hasRated && (
          <View style={pStyles.ratedBadge}>
            <Ionicons name="star" size={12} color={COLORS.accent} />
            <Text style={pStyles.ratedText}>Rated</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const pStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: SIZES.borderRadius,
    padding: SIZES.md, gap: SIZES.md, ...SHADOWS.small,
  },
  info: { flex: 1, gap: 3 },
  title: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  amount: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  status: { fontSize: 12, fontWeight: '600' },
  actions: { gap: 6, alignItems: 'flex-end' },
  viewBtn: {
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: SIZES.borderRadiusFull,
    paddingHorizontal: SIZES.md, paddingVertical: 4,
  },
  viewBtnText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  rateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFF8E1', borderRadius: SIZES.borderRadiusFull,
    paddingHorizontal: SIZES.sm, paddingVertical: 4,
  },
  rateBtnText: { fontSize: 12, color: COLORS.warning, fontWeight: '700' },
  ratedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.divider, borderRadius: SIZES.borderRadiusFull,
    paddingHorizontal: SIZES.sm, paddingVertical: 4,
  },
  ratedText: { fontSize: 11, color: COLORS.textSecondary },
});

// ─── Main ProfileScreen ───────────────────────────────────────────────────────
const TABS = ['Listings', 'Purchases'];

export default function ProfileScreen({ navigation }) {
  const { user, userProfile, profileError, loading: authLoading, logout, refreshProfile } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [tab, setTab] = useState(0);
  const [listings, setListings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingTarget, setRatingTarget] = useState(null);

  const loadData = useCallback(async (opts = {}) => {
    if (!user) return;
    if (opts.refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [myListings, myPayments] = await Promise.all([
        fetchMyListings(user.uid),
        fetchMyPayments(user.uid),
      ]);
      // Check which payments have already been rated
      const paymentsWithRating = await Promise.all(
        myPayments.map(async p => ({
          ...p,
          hasRated: await hasRated(p.id),
        }))
      );
      setListings(myListings);
      setPayments(paymentsWithRating);
    } catch (err) {
      console.error('loadData error:', err);
      showToast(`Could not load profile data: ${err?.message ?? err}`, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDeleteListing = (listing) => {
    Alert.alert(
      'Delete Listing',
      `Are you sure you want to delete "${listing.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteListing(listing.id);
              setListings(prev => prev.filter(l => l.id !== listing.id));
              showToast('Listing deleted', 'success');
            } catch {
              showToast('Could not delete listing', 'error');
            }
          },
        },
      ]
    );
  };

  const handleSubmitRating = async (payment, stars, comment) => {
    await submitRating({
      sellerId: payment.sellerId,
      buyerId: user.uid,
      listingId: payment.listingId,
      paymentId: payment.id,
      stars,
      comment,
    });
    setPayments(prev =>
      prev.map(p => p.id === payment.id ? { ...p, hasRated: true } : p)
    );
    await refreshProfile();
    showToast('Rating submitted! Thank you.', 'success');
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleSeedDemo = () => {
    Alert.alert(
      'Load Demo Data',
      'This will add demo listings, a chat conversation, and sample payments to your account so you can test all features.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load Demo Data',
          onPress: async () => {
            try {
              showToast('Loading demo data…', 'info');
              await seedDemoData(user);
              await loadData({ refresh: true });
              showToast('Demo data loaded! Check Home, Chats & Purchases.', 'success');
            } catch (e) {
              showToast(`Failed: ${e?.message ?? e}`, 'error');
            }
          },
        },
      ]
    );
  };

  const verificationStatus = userProfile?.verificationStatus;
  const isVerified = verificationStatus === VERIFICATION_STATUS.VERIFIED;
  const isPending = verificationStatus === VERIFICATION_STATUS.PENDING;

  const VERIFICATION_BADGE = {
    [VERIFICATION_STATUS.VERIFIED]: { label: 'Verified', color: COLORS.success, icon: 'shield-checkmark' },
    [VERIFICATION_STATUS.PENDING]: { label: 'Pending Review', color: COLORS.warning, icon: 'time' },
    [VERIFICATION_STATUS.REJECTED]: { label: 'Not Verified', color: COLORS.error, icon: 'close-circle' },
  };
  const badge = VERIFICATION_BADGE[verificationStatus] ?? VERIFICATION_BADGE[VERIFICATION_STATUS.PENDING];

  const avgRating = userProfile?.rating ?? 0;
  const totalRatings = userProfile?.totalRatings ?? 0;

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState icon="person-circle-outline" title="Not signed in" message="Sign in to view your profile." />
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: SIZES.lg }}>
          {profileError ? (
            <>
              <Ionicons name="cloud-offline-outline" size={48} color={COLORS.error} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' }}>
                Could not load profile
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' }}>
                {profileError.includes('permission') || profileError.includes('PERMISSION_DENIED')
                  ? 'Firestore rules are blocking reads.\nGo to Firebase Console → Firestore → Rules and set test mode.'
                  : `Error: ${profileError}`}
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: COLORS.primary, borderRadius: SIZES.borderRadiusFull, paddingHorizontal: SIZES.xl, paddingVertical: SIZES.md }}
                onPress={refreshProfile}
              >
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Retry</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Loading profile…</Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData({ refresh: true })}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userProfile.name?.[0]?.toUpperCase()}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.navigate('EditProfile')}
              >
                <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.name}>{userProfile.name}</Text>
          <Text style={styles.dept}>{userProfile.department}</Text>

          {/* Verification badge */}
          <TouchableOpacity
            style={[styles.verBadge, { backgroundColor: `${badge.color}22`, borderColor: badge.color }]}
            onPress={() => !isVerified && navigation.navigate('UploadId')}
          >
            <Ionicons name={badge.icon} size={14} color={badge.color} />
            <Text style={[styles.verBadgeText, { color: badge.color }]}>{badge.label}</Text>
            {!isVerified && !isPending && (
              <Text style={[styles.verAction, { color: badge.color }]}>· Tap to verify</Text>
            )}
          </TouchableOpacity>

          {!isVerified && (
            <TouchableOpacity
              style={styles.selfVerifyBtn}
              onPress={() =>
                Alert.alert(
                  'Self-Verify (Dev)',
                  'Mark your account as verified without uploading a student ID. For testing only.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Verify Me',
                      onPress: async () => {
                        try {
                          await updateDoc(doc(db, 'users', user.uid), { verificationStatus: 'verified' });
                          await refreshProfile();
                          showToast('Account verified!', 'success');
                        } catch (e) {
                          showToast(`Failed: ${e?.message ?? e}`, 'error');
                        }
                      },
                    },
                  ]
                )
              }
            >
              <Ionicons name="shield-checkmark-outline" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.selfVerifyText}>Self-Verify (Dev)</Text>
            </TouchableOpacity>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{listings.length}</Text>
              <Text style={styles.statLabel}>Listings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{userProfile.totalSales ?? 0}</Text>
              <Text style={styles.statLabel}>Sales</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={COLORS.accent} />
                <Text style={styles.statValue}>
                  {totalRatings > 0 ? avgRating.toFixed(1) : '—'}
                </Text>
              </View>
              <Text style={styles.statLabel}>
                {totalRatings > 0 ? `${totalRatings} ratings` : 'No ratings'}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((t, i) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === i && styles.tabActive]}
              onPress={() => setTab(i)}
            >
              <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
              {i === 0 && listings.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{listings.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : tab === 0 ? (
            // My Listings
            listings.length === 0 ? (
              <EmptyState
                icon="pricetag-outline"
                title="No listings yet"
                message="Post your first item to start selling on Ugbowo Market."
                action={
                  isVerified ? (
                    <TouchableOpacity
                      style={styles.ctaBtn}
                      onPress={() => navigation.navigate('CreateListing')}
                    >
                      <Text style={styles.ctaBtnText}>Post a Listing</Text>
                    </TouchableOpacity>
                  ) : null
                }
              />
            ) : (
              <FlatList
                data={listings}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <ListingRow
                    listing={item}
                    onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
                    onDelete={handleDeleteListing}
                  />
                )}
                scrollEnabled={false}
                contentContainerStyle={styles.list}
              />
            )
          ) : (
            // Purchases
            payments.length === 0 ? (
              <EmptyState
                icon="bag-outline"
                title="No purchases yet"
                message="Items you buy will appear here with their payment status."
              />
            ) : (
              <FlatList
                data={payments}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <PurchaseRow
                    payment={item}
                    onRate={(p) => setRatingTarget(p)}
                    onViewStatus={(p) => navigation.navigate('PaymentStatus', {
                      paymentId: p.id,
                      listingId: p.listingId,
                    })}
                  />
                )}
                scrollEnabled={false}
                contentContainerStyle={styles.list}
              />
            )
          )}
        </View>

        {/* Dev: seed demo data */}
        <TouchableOpacity style={styles.seedBtn} onPress={handleSeedDemo}>
          <Ionicons name="flask-outline" size={15} color={COLORS.textSecondary} />
          <Text style={styles.seedBtnText}>Load Demo Data (Dev)</Text>
        </TouchableOpacity>
      </ScrollView>

      <RatingModal
        visible={!!ratingTarget}
        payment={ratingTarget}
        onClose={() => setRatingTarget(null)}
        onSubmit={handleSubmitRating}
      />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    padding: SIZES.lg,
    paddingTop: SIZES.md,
    gap: SIZES.sm,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: { color: '#FFF', fontSize: 30, fontWeight: '800' },
  headerActions: { flexDirection: 'row', gap: SIZES.sm, marginTop: 4 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  name: { fontSize: 22, fontWeight: '800', color: '#FFF', marginTop: 4 },
  dept: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  selfVerifyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: SIZES.sm, paddingVertical: 4,
    borderRadius: SIZES.borderRadiusFull,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  selfVerifyText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  verBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: SIZES.md, paddingVertical: 5,
    borderRadius: SIZES.borderRadiusFull, borderWidth: 1,
    alignSelf: 'flex-start',
  },
  verBadgeText: { fontSize: 12, fontWeight: '700' },
  verAction: { fontSize: 12 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: SIZES.borderRadius,
    padding: SIZES.md,
    marginTop: SIZES.sm,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SIZES.md, gap: 6,
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary },
  tabBadge: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  content: { padding: SIZES.md, minHeight: 300 },
  list: { gap: SIZES.sm },
  loader: { paddingVertical: SIZES.xl, alignItems: 'center' },
  ctaBtn: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.borderRadiusFull,
    paddingHorizontal: SIZES.xl, paddingVertical: SIZES.md,
    marginTop: SIZES.md, ...SHADOWS.small,
  },
  ctaBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  seedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: SIZES.lg, marginTop: SIZES.sm,
    borderTopWidth: 1, borderTopColor: COLORS.divider,
  },
  seedBtnText: { fontSize: 13, color: COLORS.textSecondary },
});
