import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchPaymentById } from '../../services/paymentService';
import { fetchListingById } from '../../services/listingsService';
import { useAuth } from '../../context/AuthContext';
import LoadingScreen from '../../components/common/LoadingScreen';
import ErrorState from '../../components/common/ErrorState';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { PAYMENT_STATUS } from '../../constants';

const STATUS_CONFIG = {
  [PAYMENT_STATUS.HELD]: {
    icon: 'lock-closed',
    color: COLORS.primary,
    bg: '#E8EAF6',
    label: 'Funds Held',
    desc: 'Your money is safely held in escrow. Meet the seller at a campus safe zone, inspect the item, then scan their QR code to release payment.',
  },
  [PAYMENT_STATUS.RELEASED]: {
    icon: 'checkmark-circle',
    color: COLORS.success,
    bg: '#E8F5E9',
    label: 'Payment Released',
    desc: 'Payment has been released to the seller. Thank you for using Ugbowo Market!',
  },
  [PAYMENT_STATUS.REFUNDED]: {
    icon: 'refresh-circle',
    color: COLORS.warning,
    bg: '#FFF8E1',
    label: 'Refunded',
    desc: 'This payment has been refunded. The listing is available again.',
  },
};

export default function PaymentStatusScreen({ route, navigation }) {
  const { paymentId, listingId } = route.params;
  const { user } = useAuth();

  const [payment, setPayment] = useState(null);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, l] = await Promise.all([
        fetchPaymentById(paymentId),
        fetchListingById(listingId),
      ]);
      if (!p) { setError('Payment record not found.'); return; }
      setPayment(p);
      setListing(l);
    } catch {
      setError('Could not load payment details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [paymentId]);

  if (loading) return <LoadingScreen message="Loading payment..." />;
  if (error) return (
    <SafeAreaView style={styles.safe}>
      <ErrorState message={error} onRetry={load} />
    </SafeAreaView>
  );

  const config = STATUS_CONFIG[payment.status] ?? STATUS_CONFIG[PAYMENT_STATUS.HELD];
  const isBuyer = payment.buyerId === user?.uid;
  const isHeld = payment.status === PAYMENT_STATUS.HELD;
  const isReleased = payment.status === PAYMENT_STATUS.RELEASED;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate('MainTabs')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Payment Status</Text>
      </View>

      <View style={styles.body}>
        {/* Status card */}
        <View style={[styles.statusCard, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={52} color={config.color} />
          <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
          <Text style={styles.statusDesc}>{config.desc}</Text>
        </View>

        {/* Payment details */}
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{listing?.title ?? 'Item'}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Item price</Text>
            <Text style={styles.detailValue}>₦{payment.amount?.toLocaleString()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Platform fee</Text>
            <Text style={styles.detailValue}>₦{payment.fee?.toLocaleString()}</Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowTotal]}>
            <Text style={styles.detailLabelBold}>Total</Text>
            <Text style={styles.detailValueBold}>₦{payment.total?.toLocaleString()}</Text>
          </View>

          <View style={styles.idRow}>
            <Ionicons name="receipt-outline" size={13} color={COLORS.textDisabled} />
            <Text style={styles.paymentId}>Payment ID: {payment.id.slice(0, 16)}…</Text>
          </View>
        </View>

        {/* Actions */}
        {isHeld && isBuyer && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('ScanQR', { paymentId, listingId })}
          >
            <Ionicons name="qr-code" size={20} color="#FFF" />
            <Text style={styles.primaryBtnText}>Scan Seller's QR Code</Text>
          </TouchableOpacity>
        )}

        {isReleased && (
          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Ionicons name="home" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>Back to Marketplace</Text>
          </TouchableOpacity>
        )}

        {isHeld && (
          <View style={styles.disputeNotice}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.disputeText}>
              If there's a problem with this transaction, contact support to raise a dispute. Admins can issue a refund.
            </Text>
          </View>
        )}
      </View>
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
  body: { flex: 1, padding: SIZES.md, gap: SIZES.md },
  statusCard: {
    borderRadius: SIZES.borderRadiusLg,
    padding: SIZES.xl,
    alignItems: 'center',
    gap: SIZES.sm,
  },
  statusLabel: { fontSize: 20, fontWeight: '800' },
  statusDesc: { fontSize: 14, color: COLORS.textPrimary, textAlign: 'center', lineHeight: 20 },
  detailCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.md,
    gap: SIZES.sm,
    ...SHADOWS.small,
  },
  detailTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailRowTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SIZES.sm,
    marginTop: 2,
  },
  detailLabel: { fontSize: 14, color: COLORS.textSecondary },
  detailValue: { fontSize: 14, color: COLORS.textPrimary },
  detailLabelBold: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  detailValueBold: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  paymentId: { fontSize: 11, color: COLORS.textDisabled, fontFamily: 'monospace' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadiusFull,
    padding: SIZES.md,
    ...SHADOWS.small,
  },
  successBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.success,
    borderRadius: SIZES.borderRadiusFull,
    padding: SIZES.md,
    ...SHADOWS.small,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  disputeNotice: {
    flexDirection: 'row',
    gap: SIZES.sm,
    padding: SIZES.md,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disputeText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
});
