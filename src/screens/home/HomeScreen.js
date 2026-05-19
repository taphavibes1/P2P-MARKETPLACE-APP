import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { fetchListings } from '../../services/listingsService';
import ListingCard from '../../components/listings/ListingCard';
import CategoryFilter from '../../components/listings/CategoryFilter';
import VerificationBanner from '../../components/common/VerificationBanner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

export default function HomeScreen({ navigation }) {
  const { userProfile } = useAuth();
  const [listings, setListings] = useState([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const searchTimer = useRef(null);

  const load = useCallback(async (opts = {}) => {
    const { refresh = false, more = false } = opts;
    if (!refresh && !more) setLoading(true);
    if (refresh) setRefreshing(true);
    if (more) setLoadingMore(true);
    setError(null);
    try {
      const result = await fetchListings({
        category,
        search,
        lastDoc: more ? lastDoc : null,
      });
      if (more) {
        setListings(prev => [...prev, ...result.listings]);
      } else {
        setListings(result.listings);
      }
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (e) {
      setError('Could not load listings. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [category, search, lastDoc]);

  // Reload when category or search changes
  useEffect(() => {
    load();
  }, [category, search]);

  // Debounce search input
  const handleSearchChange = (text) => {
    setSearchInput(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(text.trim()), 400);
  };

  const onRefresh = () => load({ refresh: true });
  const onEndReached = () => { if (hasMore && !loadingMore) load({ more: true }); };

  const renderItem = ({ item, index }) => (
    <View style={[styles.cardWrap, index % 2 === 0 ? styles.cardLeft : styles.cardRight]}>
      <ListingCard
        listing={item}
        onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
      />
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {userProfile ? `Hi, ${userProfile.name.split(' ')[0]} 👋` : 'Ugbowo Market'}
          </Text>
          <Text style={styles.subtitle}>Find great deals on campus</Text>
        </View>
        <TouchableOpacity
          style={styles.sellBtn}
          onPress={() => navigation.navigate('CreateListing')}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.sellBtnText}>Sell</Text>
        </TouchableOpacity>
      </View>

      <VerificationBanner />

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search listings..."
            placeholderTextColor={COLORS.textDisabled}
            value={searchInput}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchInput(''); setSearch(''); }}>
              <Ionicons name="close-circle" size={18} color={COLORS.textDisabled} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter */}
      <CategoryFilter selected={category} onSelect={(c) => { setCategory(c); setLastDoc(null); }} />

      {/* Content */}
      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading listings...</Text>
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={listings.length === 0 ? styles.emptyContainer : styles.grid}
          columnWrapperStyle={styles.row}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <EmptyState
              icon="pricetag-outline"
              title={search ? 'No results found' : 'No listings yet'}
              message={search ? `No listings match "${search}"` : 'Be the first to list something!'}
            />
          }
          showsVerticalScrollIndicator={false}
        />
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
    paddingTop: SIZES.sm,
    paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
  },
  greeting: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  sellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadiusFull,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    ...SHADOWS.small,
  },
  sellBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  searchWrap: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, backgroundColor: COLORS.surface },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadiusFull,
    paddingHorizontal: SIZES.md,
    gap: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, height: 40, fontSize: 14, color: COLORS.textPrimary },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SIZES.sm },
  loadingText: { fontSize: 14, color: COLORS.textSecondary },
  grid: { padding: SIZES.sm },
  emptyContainer: { flex: 1 },
  row: { gap: SIZES.sm, paddingHorizontal: SIZES.sm },
  cardWrap: { flex: 1, marginBottom: SIZES.sm },
  cardLeft: { marginRight: SIZES.xs },
  cardRight: { marginLeft: SIZES.xs },
  footerLoader: { padding: SIZES.lg, alignItems: 'center' },
});
