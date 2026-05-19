import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { fetchPaymentForListing } from '../../services/paymentService';
import { fetchListingById } from '../../services/listingsService';
import LoadingScreen from '../../components/common/LoadingScreen';
import ErrorState from '../../components/common/ErrorState';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

export default function SellerQRScreen({ route, navigation }) {
  const { listingId } = route.params;
  const [payment, setPayment] = useState(null);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, l] = await Promise.all([
        fetchPaymentForListing(listingId),
        fetchListingById(listingId),
      ]);
      if (!p) {
        setError('No active payment found for this listing. The buyer needs to initiate payment first.');
        return;
      }
      setPayment(p);
      setListing(l);
    } catch {
      setError('Could not load payment info. Try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [listingId]);

  if (loading) return <LoadingScreen message="Loading QR code..." />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Your QR Code</Text>
      </View>

      {error || !payment ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <View style={styles.body}>
          <View style={styles.intro}>
            <Text style={styles.introTitle}>Show this to the buyer</Text>
            <Text style={styles.introSub}>
              The buyer scans this code to release your payment. Only let them scan after they've inspected the item and agreed to proceed.
            </Text>
          </View>

          {/* QR Card */}
          <View style={styles.qrCard}>
            <View style={styles.qrWrap}>
              <QRCode
                value={payment.id}
                size={220}
                color={COLORS.primary}
                backgroundColor="#FFF"
                logo={undefined}
              />
            </View>

            <View style={styles.qrMeta}>
              <Text style={styles.itemLabel}>{listing?.title ?? 'Your Item'}</Text>
              <Text style={styles.amountLabel}>
                ₦{payment.total?.toLocaleString()}
                <Text style={styles.amountSub}> total (incl. fee)</Text>
              </Text>
            </View>

            <View style={styles.idChip}>
              <Ionicons name="receipt-outline" size={12} color={COLORS.textDisabled} />
              <Text style={styles.idText}>{payment.id.slice(0, 20)}…</Text>
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tips}>
            {[
              { icon: 'eye', text: 'Let the buyer inspect the item first' },
              { icon: 'hand-left', text: 'Only show the QR code when both parties agree' },
              { icon: 'shield-checkmark', text: 'Meet at a safe zone for your protection' },
            ].map((tip, i) => (
              <View key={i} style={styles.tip}>
                <Ionicons name={`${tip.icon}-outline`} size={16} color={COLORS.primary} />
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={load}>
            <Ionicons name="refresh" size={16} color={COLORS.primary} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.primary },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    gap: SIZES.sm,
  },
  backBtn: { padding: 4 },
  topTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  body: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SIZES.lg,
    gap: SIZES.md,
  },
  intro: { gap: 4 },
  introTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  introSub: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  qrCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadiusLg,
    padding: SIZES.lg,
    alignItems: 'center',
    gap: SIZES.md,
    ...SHADOWS.medium,
  },
  qrWrap: {
    padding: SIZES.md,
    backgroundColor: '#FFF',
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrMeta: { alignItems: 'center', gap: 4 },
  itemLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  amountLabel: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  amountSub: { fontSize: 13, fontWeight: '400', color: COLORS.textSecondary },
  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.md,
    paddingVertical: 4,
    borderRadius: SIZES.borderRadiusFull,
  },
  idText: { fontSize: 11, color: COLORS.textDisabled, fontFamily: 'monospace' },
  tips: { gap: SIZES.sm },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
    backgroundColor: COLORS.surface,
    padding: SIZES.md,
    borderRadius: SIZES.borderRadius,
    ...SHADOWS.small,
  },
  tipText: { flex: 1, fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: SIZES.md,
  },
  refreshText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
});
