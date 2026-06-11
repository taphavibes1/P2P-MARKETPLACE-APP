import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { releasePayment } from '../../services/paymentService';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const FRAME_SIZE = SCREEN_W * 0.65;

export default function ScanQRScreen({ route, navigation }) {
  const { paymentId, listingId } = route.params;
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // Animate scan line
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FRAME_SIZE - 4],
  });

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);

    if (data !== paymentId) {
      showToast('QR code does not match this payment. Make sure the seller is showing the right code.', 'error');
      setProcessing(false);
      setTimeout(() => setScanned(false), 3000);
      return;
    }

    try {
      await releasePayment(paymentId, user.uid);
      setSuccess(true);
    } catch (err) {
      showToast(err.message ?? 'Could not release payment. Try again.', 'error');
      setProcessing(false);
      setTimeout(() => setScanned(false), 3000);
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Scan QR Code</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={64} color={COLORS.textDisabled} />
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permSub}>Allow camera access to scan the seller's QR code.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Grant Camera Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Success screen
  if (success) {
    return (
      <SafeAreaView style={[styles.safe, styles.successSafe]}>
        <View style={styles.successBody}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={52} color="#FFF" />
          </View>
          <Text style={styles.successTitle}>Payment Released!</Text>
          <Text style={styles.successSub}>
            The funds have been released to the seller. The transaction is complete.
          </Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.navigate('PaymentStatus', { paymentId, listingId })}
          >
            <Text style={styles.doneBtnText}>View Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.homeLink}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={styles.homeLinkText}>Back to Marketplace</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, styles.cameraSafe]}>
      {/* Top bar */}
      <View style={styles.cameraTopBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnDark}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.cameraTitle}>Scan Seller's QR</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top dim */}
        <View style={styles.dimTop} />
        {/* Middle row */}
        <View style={styles.midRow}>
          <View style={styles.dimSide} />
          {/* Scan frame */}
          <View style={styles.frame}>
            {/* Corner marks */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {/* Scan line */}
            {!processing && (
              <Animated.View
                style={[styles.scanLine, { transform: [{ translateY: scanLineTranslate }] }]}
              />
            )}
            {processing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#FFF" />
                <Text style={styles.processingText}>Verifying…</Text>
              </View>
            )}
          </View>
          <View style={styles.dimSide} />
        </View>
        {/* Bottom dim + instructions */}
        <View style={styles.dimBottom}>
          <Text style={styles.instructionText}>
            Point the camera at the seller's QR code
          </Text>
          <Text style={styles.instructionSub}>
            Only scan when you're satisfied with the item
          </Text>
          {scanned && !processing && (
            <TouchableOpacity style={styles.retryBtn} onPress={() => setScanned(false)}>
              <Ionicons name="refresh" size={16} color="#FFF" />
              <Text style={styles.retryText}>Tap to scan again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  cameraSafe: { backgroundColor: '#000' },
  successSafe: { backgroundColor: COLORS.success },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: SIZES.xl, gap: SIZES.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4, marginRight: SIZES.sm },
  topTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  permTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  permSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  permBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadiusFull,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
    ...SHADOWS.small,
  },
  permBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  // Camera UI
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    zIndex: 10,
  },
  backBtnDark: { padding: 4 },
  cameraTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  overlay: { flex: 1 },
  dimTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  midRow: { flexDirection: 'row', height: FRAME_SIZE },
  dimSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 24, height: 24,
    borderColor: '#FFF',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  scanLine: {
    position: 'absolute',
    left: 0, right: 0,
    height: 2,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  processingText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  dimBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.lg,
    gap: SIZES.sm,
  },
  instructionText: { color: '#FFF', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  instructionSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: SIZES.borderRadiusFull,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    marginTop: SIZES.sm,
  },
  retryText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  // Success
  successBody: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: SIZES.xl, gap: SIZES.md,
  },
  successIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  successSub: { fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22 },
  doneBtn: {
    backgroundColor: '#FFF',
    borderRadius: SIZES.borderRadiusFull,
    paddingHorizontal: SIZES.xxl,
    paddingVertical: SIZES.md,
    marginTop: SIZES.sm,
    ...SHADOWS.small,
  },
  doneBtnText: { color: COLORS.success, fontWeight: '800', fontSize: 16 },
  homeLink: { padding: SIZES.md },
  homeLinkText: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 14 },
});
