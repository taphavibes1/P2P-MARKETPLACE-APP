import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { subscribeToMyChats } from '../../services/chatService';
import EmptyState from '../../components/common/EmptyState';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { CHAT_STATUS } from '../../constants';

function timeAgo(ts) {
  if (!ts?.toMillis) return '';
  const diff = Date.now() - ts.toMillis();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function ChatItem({ chat, userId, onPress }) {
  const isBuyer = chat.buyerId === userId;
  const otherName = isBuyer ? chat.sellerName : chat.buyerName;
  const initial = otherName?.[0]?.toUpperCase() ?? '?';
  const isOfferAccepted = chat.status === CHAT_STATUS.OFFER_ACCEPTED;

  return (
    <TouchableOpacity style={styles.chatItem} onPress={onPress} activeOpacity={0.7}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>

      {/* Content */}
      <View style={styles.chatContent}>
        <View style={styles.chatTopRow}>
          <Text style={styles.chatName} numberOfLines={1}>{otherName}</Text>
          <Text style={styles.chatTime}>{timeAgo(chat.lastMessageTime)}</Text>
        </View>
        <Text style={styles.chatListing} numberOfLines={1}>
          Re: {chat.listingTitle}
        </Text>
        <View style={styles.chatBottomRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {chat.lastMessage || 'Start the conversation'}
          </Text>
          {isOfferAccepted && (
            <View style={styles.offerBadge}>
              <Text style={styles.offerBadgeText}>Offer Accepted</Text>
            </View>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={COLORS.textDisabled} />
    </TouchableOpacity>
  );
}

export default function ChatsListScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const unsub = subscribeToMyChats(user.uid, (data) => {
      setChats(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}><Text style={styles.headerTitle}>Chats</Text></View>
        <EmptyState
          icon="chatbubbles-outline"
          title="Sign in to see your chats"
          message="Your conversations with buyers and sellers will appear here."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ChatItem
              chat={item}
              userId={user.uid}
              onPress={() => navigation.navigate('ChatThread', {
                chatId: item.id,
                listingId: item.listingId,
                listingTitle: item.listingTitle,
                sellerId: item.sellerId,
              })}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="No conversations yet"
              message="When you message a seller or a buyer messages you, conversations will appear here."
            />
          }
          contentContainerStyle={chats.length === 0 && styles.emptyFlex}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.small,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyFlex: { flex: 1 },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    gap: SIZES.md,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  chatContent: { flex: 1, gap: 2 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  chatTime: { fontSize: 11, color: COLORS.textDisabled, marginLeft: SIZES.sm },
  chatListing: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  chatBottomRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  lastMessage: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  offerBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SIZES.borderRadiusFull,
  },
  offerBadgeText: { fontSize: 10, color: COLORS.success, fontWeight: '700' },
  separator: { height: 1, backgroundColor: COLORS.divider, marginLeft: 80 },
});
