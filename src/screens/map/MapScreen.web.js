import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';

// react-native-maps doesn't support web, so this platform-specific
// file provides a placeholder when running in a browser.
export default function MapScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Ionicons name="map-outline" size={48} color={COLORS.gray} />
      <Text style={styles.title}>Map view</Text>
      <Text style={styles.subtitle}>
        The map is available on the iOS/Android app via Expo Go.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.padding,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 6,
  },
});
