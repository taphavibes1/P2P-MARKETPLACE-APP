import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { fetchListings } from '../../services/listingsService';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { SAFE_ZONES, UGBOWO_CENTER } from '../../constants';

const { height: SCREEN_H } = Dimensions.get('window');
const INITIAL_REGION = {
  latitude: UGBOWO_CENTER.latitude,
  longitude: UGBOWO_CENTER.longitude,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};
const SELLER_RADIUS = 500; // metres

export default function MapScreen({ navigation }) {
  const mapRef = useRef(null);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [showZoneSheet, setShowZoneSheet] = useState(false);

  // Fetch listings with location data for seller circles
  useEffect(() => {
    fetchListings()
      .then(r => setListings(r.listings.filter(l => l.location?.latitude)))
      .catch(() => {})
      .finally(() => setListingsLoading(false));
  }, []);

  const requestLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation(loc.coords);
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 800);
    } finally {
      setLocationLoading(false);
    }
  };

  const recenterMap = () => {
    mapRef.current?.animateToRegion(INITIAL_REGION, 600);
  };

  const openZoneSheet = (zone) => {
    setSelectedZone(zone);
    setShowZoneSheet(true);
    Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 10 }).start();
  };

  const closeZoneSheet = () => {
    Animated.timing(sheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setShowZoneSheet(false);
      setSelectedZone(null);
    });
  };

  const sheetTranslate = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Campus Map</Text>
          <Text style={styles.headerSub}>Ugbowo, UNIBEN · Safe meeting zones</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2E7D32' }]} />
            <Text style={styles.legendText}>Safe Zone</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.primary, opacity: 0.5 }]} />
            <Text style={styles.legendText}>Listing Area</Text>
          </View>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={INITIAL_REGION}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {/* Safe zone markers */}
          {SAFE_ZONES.map(zone => (
            <React.Fragment key={zone.id}>
              <Marker
                coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
                onPress={() => openZoneSheet(zone)}
              >
                <View style={styles.safeMarker}>
                  <Ionicons name="shield-checkmark" size={18} color="#FFF" />
                </View>
                <Callout tooltip>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>{zone.label}</Text>
                    <Text style={styles.calloutSub}>Safe meeting zone</Text>
                  </View>
                </Callout>
              </Marker>
              {/* 100m highlight circle around safe zone */}
              <Circle
                center={{ latitude: zone.latitude, longitude: zone.longitude }}
                radius={80}
                fillColor="rgba(46,125,50,0.12)"
                strokeColor="rgba(46,125,50,0.5)"
                strokeWidth={1.5}
              />
            </React.Fragment>
          ))}

          {/* Seller listing circles — 500m radius, NOT precise */}
          {listings.map(listing => (
            <Circle
              key={listing.id}
              center={{
                latitude: listing.location.latitude,
                longitude: listing.location.longitude,
              }}
              radius={SELLER_RADIUS}
              fillColor="rgba(26,35,126,0.07)"
              strokeColor="rgba(26,35,126,0.25)"
              strokeWidth={1}
            />
          ))}
        </MapView>

        {/* Map controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBtn} onPress={recenterMap}>
            <Ionicons name="navigate" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={requestLocation}
            disabled={locationLoading}
          >
            {locationLoading
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <Ionicons name="locate" size={20} color={COLORS.primary} />}
          </TouchableOpacity>
        </View>

        {/* Listings count badge */}
        {!listingsLoading && listings.length > 0 && (
          <View style={styles.listingsBadge}>
            <Ionicons name="pricetag" size={12} color={COLORS.primary} />
            <Text style={styles.listingsBadgeText}>
              {listings.length} listing{listings.length !== 1 ? 's' : ''} in area
            </Text>
          </View>
        )}
      </View>

      {/* Safe zones list */}
      <View style={styles.zonesPanel}>
        <Text style={styles.zonesPanelTitle}>Safe Meeting Zones</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zonesRow}>
          {SAFE_ZONES.map(zone => (
            <TouchableOpacity
              key={zone.id}
              style={[styles.zoneChip, selectedZone?.id === zone.id && styles.zoneChipActive]}
              onPress={() => {
                mapRef.current?.animateToRegion({
                  latitude: zone.latitude,
                  longitude: zone.longitude,
                  latitudeDelta: 0.008,
                  longitudeDelta: 0.008,
                }, 600);
                openZoneSheet(zone);
              }}
            >
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={selectedZone?.id === zone.id ? '#FFF' : '#2E7D32'}
              />
              <Text style={[
                styles.zoneChipText,
                selectedZone?.id === zone.id && styles.zoneChipTextActive,
              ]}>
                {zone.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Zone detail bottom sheet */}
      {showZoneSheet && selectedZone && (
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslate }] }]}>
          <View style={styles.sheetHandle} />
          <TouchableOpacity style={styles.sheetClose} onPress={closeZoneSheet}>
            <Ionicons name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <View style={styles.sheetIconRow}>
            <View style={styles.sheetIcon}>
              <Ionicons name="shield-checkmark" size={28} color="#FFF" />
            </View>
            <View>
              <Text style={styles.sheetTitle}>{selectedZone.label}</Text>
              <Text style={styles.sheetSub}>Safe Meeting Zone</Text>
            </View>
          </View>

          <View style={styles.sheetInfoRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.sheetCoords}>
              {selectedZone.latitude.toFixed(4)}°N, {selectedZone.longitude.toFixed(4)}°E
            </Text>
          </View>

          <View style={styles.sheetTips}>
            <View style={styles.sheetTip}>
              <Ionicons name="people-outline" size={16} color={COLORS.primary} />
              <Text style={styles.sheetTipText}>Meet in daylight with other students around</Text>
            </View>
            <View style={styles.sheetTip}>
              <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
              <Text style={styles.sheetTipText}>Inspect items before scanning the QR code</Text>
            </View>
            <View style={styles.sheetTip}>
              <Ionicons name="phone-portrait-outline" size={16} color={COLORS.primary} />
              <Text style={styles.sheetTipText}>Only scan the QR code when you're satisfied</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.navigateBtn}
            onPress={() => {
              mapRef.current?.animateToRegion({
                latitude: selectedZone.latitude,
                longitude: selectedZone.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }, 600);
              closeZoneSheet();
            }}
          >
            <Ionicons name="navigate" size={16} color="#FFF" />
            <Text style={styles.navigateBtnText}>Show on Map</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.small,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  headerSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  legendRow: { gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: COLORS.textSecondary },
  mapWrap: { flex: 1, position: 'relative' },
  controls: {
    position: 'absolute',
    right: SIZES.md,
    bottom: SIZES.md,
    gap: SIZES.sm,
  },
  controlBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  listingsBadge: {
    position: 'absolute',
    top: SIZES.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.md,
    paddingVertical: 6,
    borderRadius: SIZES.borderRadiusFull,
    ...SHADOWS.small,
  },
  listingsBadgeText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  // Safe zone marker
  safeMarker: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFF',
    ...SHADOWS.medium,
  },
  callout: {
    backgroundColor: '#FFF',
    borderRadius: SIZES.borderRadius,
    padding: SIZES.sm,
    minWidth: 130,
    ...SHADOWS.small,
  },
  calloutTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  calloutSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  // Zones panel
  zonesPanel: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.sm,
    paddingBottom: SIZES.md,
    ...SHADOWS.medium,
  },
  zonesPanelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: SIZES.md,
    marginBottom: SIZES.sm,
  },
  zonesRow: { paddingHorizontal: SIZES.md, gap: SIZES.sm },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.borderRadiusFull,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  zoneChipActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  zoneChipText: { fontSize: 13, fontWeight: '600', color: '#2E7D32' },
  zoneChipTextActive: { color: '#FFF' },
  // Bottom sheet
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.borderRadiusLg,
    borderTopRightRadius: SIZES.borderRadiusLg,
    padding: SIZES.lg,
    paddingBottom: SIZES.xxl,
    gap: SIZES.md,
    ...SHADOWS.large,
  },
  sheetHandle: {
    width: 40, height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SIZES.sm,
  },
  sheetClose: {
    position: 'absolute',
    top: SIZES.md,
    right: SIZES.md,
    padding: 4,
  },
  sheetIconRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.md },
  sheetIcon: {
    width: 52, height: 52,
    borderRadius: 26,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  sheetSub: { fontSize: 13, color: '#2E7D32', fontWeight: '600' },
  sheetInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sheetCoords: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'monospace' },
  sheetTips: { gap: SIZES.sm },
  sheetTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
    backgroundColor: '#F8F9FF',
    padding: SIZES.sm,
    borderRadius: SIZES.borderRadius,
  },
  sheetTipText: { flex: 1, fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadiusFull,
    padding: SIZES.md,
    ...SHADOWS.small,
  },
  navigateBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
