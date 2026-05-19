import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { VERIFICATION_STATUS } from '../../constants';

export default function VerificationBanner() {
  const { userProfile } = useAuth();

  if (!userProfile) return null;
  if (userProfile.verificationStatus === VERIFICATION_STATUS.VERIFIED) return null;

  const isPending = userProfile.verificationStatus === VERIFICATION_STATUS.PENDING;
  const isRejected = userProfile.verificationStatus === VERIFICATION_STATUS.REJECTED;

  return (
    <View style={[styles.banner, isRejected && styles.rejected]}>
      <Ionicons
        name={isPending ? 'time-outline' : 'close-circle-outline'}
        size={18}
        color={isPending ? COLORS.warning : COLORS.error}
      />
      <Text style={[styles.text, isRejected && styles.rejectedText]}>
        {isPending
          ? 'Your student ID is under review. You can browse and chat, but cannot list items or pay until verified.'
          : 'Your student ID was not approved. Please contact support or re-upload a clearer photo.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    padding: SIZES.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
  },
  rejected: {
    backgroundColor: '#FFEBEE',
    borderLeftColor: COLORS.error,
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  rejectedText: {
    color: COLORS.error,
  },
});
