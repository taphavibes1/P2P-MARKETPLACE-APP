import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { fetchListingById, fetchSellerProfile } from '../../services/listingsService';
import { initiatePayment, calcFee } from '../../services/paymentService';
import Toast from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';
import ErrorState from '../../components/common/ErrorState';
import LoadingScreen from '../../components/common/LoadingScreen';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { LISTING_STATUS } from '../../constants';

function Row({ label, value, bold, accent, large }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[
        styles.rowValue,
        bold && styles.bold,
        accent && styles.accent,
        large && styles.large,
      ]}>
        {value}
      </Text>
    </View>
  );
}

export default function PaymentConfirmScreen({ route, navigation }) {
  const { listingId } = route.params;
  const { user, userProfile } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [listing, setListing] = useState(null);
  const [seller, setSeller] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const l = await fetchListingById(listingId);
        if (!l) { setPageError('Listing not found.'); return; }
        if (l.status !== LISTING_STATUS.AVAILABLE) {
          setPageError('This item is no longer available for purchase.');
          return;
        }
        setListing(l);
        const s = await fetchSellerProfile(l.sellerId);
        setSeller(s);
      } catch {
        setPageError('Could not load listing details. Try again.');
      } finally {
        setPageLoading(false);
      }
    })();
  }, [listingId]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const paymentId = await initiatePayment({
        listingId,
        buyerId: user.uid,
        sellerId: listing.sellerId,
        amount: listing.price,
      });
      showToast('Funds held! Show this screen to the seller.', 'success');
      setTimeout(() => {
        navigation.replace('PaymentStatus', { paymentId, listingId });
      }, 800);
    } catch (err) {
      showToast(err.message ?? 'Payment failed. Please try again.', 'error');
    } finally {
      setConfirming(false);
    }
  };

  if (pageLoading) return <LoadingScreen message="Loading payment details..." />;
  if (pageError || !listing) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <ErrorState message={pageError} onRetry={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const { fee, total } = calcFee(listing.price);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Confirm Purchase</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Escrow explanation */}
        <View style={styles.escrowBanner}>
          <Ionicons name="shield-checkmark" size={28} color={COLORS.primary} />
          <View style={styles.escrowText}>
            <Text style={styles.escrowTitle}>Protected by Escrow</Text>
            <Text style={styles.escrowSub}>
              Your money is held securely. It's only released when you physically scan the seller's QR code after inspecting the item.
            </Text>
          </View>
        </View>

        {/* Item summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Item Summary</Text>
          <Text style={styles.itemTitle}>{listing.title}</Text>
          {seller && (
            <View style={styles.sellerRow}>
              <View style={styles.sellerAvatar}>
                <Text style={styles.sellerInitial}>{seller.name?.[0]?.toUpperCase()}</Text>
              </View>
              <Text style={styles.sellerName}>Sold by {seller.name}</Text>
            </View>
          )}
        </View>

        {/* Price breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Breakdown</Text>
          <Row label="Item price" value={`₦${listing.price.toLocaleString()}`} />
          <View style={styles.divider} />
          <Row label="Platform fee (2%)" value={`₦${fee.toLocaleString()}`} />
          <View style={styles.divider} />
          <Row label="Total held" value={`₦${total.toLocaleString()}`} bold accent large />
        </View>

        {/* How it works */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How Escrow Works</Text>
          {[
            { icon: 'lock-closed', text: 'Tap "Hold Funds" — your money is locked in escrow' },
            { icon: 'people', text: 'Meet the seller at a safe zone on campus' },
            { icon: 'eye', text: 'Inspect the item carefully before proceeding' },
            { icon: 'qr-code', text: 'Scan the seller\'s QR code to release payment' },
          ].map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Ionicons name={step.icon} size={18} color={COLORS.primary} />
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* Warning */}
        <View style={styles.warning}>
          <Ionicons name="warning" size={16} color={COLORS.warning} />
          <Text style={styles.warningText}>
            Only scan the QR code once you are satisfied with the item. Payment cannot be reversed after scanning.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* CTA */}
      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerLabel}>Total to hold</Text>
          <Text style={styles.footerAmount}>₦{total.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.confirmBtn, confirming && styles.btnDisabled]}
          onPress={handleConfirm}
          disabled={confirming}
        >
          {confirming
            ? <ActivityIndicator color="#FFF" />
            : <>
                <Ionicons name="lock-closed" size={18} color="#FFF" />
                <Text style={styles.confirmBtnText}>Confirm & Hold Funds</Text>
              </>}
        </TouchableOpacity>
      </View>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4, marginRight: SIZES.sm },
  topTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  scroll: { padding: SIZES.md, gap: SIZES.md },
  escrowBanner: {
    flexDirection: 'row',
    gap: SIZES.md,
    backgroundColor: '#E8EAF6',
    borderRadius: SIZES.borderRadius,
    padding: SIZES.md,
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  escrowText: { flex: 1, gap: 4 },
  escrowTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  escrowSub: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.md,
    gap: SIZES.sm,
    ...SHADOWS.small,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  itemTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  sellerAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerInitial: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  sellerName: { fontSize: 13, color: COLORS.textSecondary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  rowLabel: { fontSize: 14, color: COLORS.textSecondary },
  rowValue: { fontSize: 14, color: COLORS.textPrimary },
  bold: { fontWeight: '700' },
  accent: { color: COLORS.primary },
  large: { fontSize: 18 },
  divider: { height: 1, backgroundColor: COLORS.divider },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.sm },
  stepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 13, color: COLORS.textPrimary, lineHeight: 20 },
  warning: {
    flexDirection: 'row',
    gap: SIZES.sm,
    backgroundColor: '#FFF8E1',
    borderRadius: SIZES.borderRadius,
    padding: SIZES.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  warningText: { flex: 1, fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    gap: SIZES.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.medium,
  },
  footerTotal: { flex: 1 },
  footerLabel: { fontSize: 11, color: COLORS.textSecondary },
  footerAmount: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadiusFull,
    padding: SIZES.md,
    ...SHADOWS.small,
  },
  btnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
