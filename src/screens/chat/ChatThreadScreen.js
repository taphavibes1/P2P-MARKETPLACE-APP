import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  getOrCreateChat,
  subscribeToMessages,
  sendMessage,
  sendOffer,
  acceptOffer,
} from '../../services/chatService';
import Toast from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { MESSAGE_TYPES, CHAT_STATUS } from '../../constants';

function formatTime(ts) {
  if (!ts?.toMillis) return '';
  return new Date(ts.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function SystemBubble({ message }) {
  return (
    <View style={styles.systemWrap}>
      <Text style={styles.systemText}>{message.text}</Text>
    </View>
  );
}

function OfferBubble({ message, isMine, isSeller, onAccept }) {
  const isPending = message.offerStatus === 'pending';
  const isAccepted = message.offerStatus === 'accepted';

  return (
    <View style={[styles.bubbleWrap, isMine && styles.bubbleWrapMine]}>
      <View style={[styles.offerBubble, isMine && styles.offerBubbleMine]}>
        <View style={styles.offerHeader}>
          <Ionicons name="pricetag" size={14} color={isMine ? 'rgba(255,255,255,0.8)' : COLORS.primary} />
          <Text style={[styles.offerLabel, isMine && styles.offerLabelMine]}>Price Offer</Text>
        </View>
        <Text style={[styles.offerAmount, isMine && styles.offerAmountMine]}>
          ₦{Number(message.offerAmount).toLocaleString()}
        </Text>

        {isAccepted ? (
          <View style={styles.offerAcceptedRow}>
            <Ionicons name="checkmark-circle" size={14} color={isMine ? 'rgba(255,255,255,0.9)' : COLORS.success} />
            <Text style={[styles.offerAcceptedText, isMine && styles.offerAcceptedTextMine]}>
              Offer Accepted
            </Text>
          </View>
        ) : isPending && isSeller && !isMine ? (
          <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(message.id)}>
            <Text style={styles.acceptBtnText}>Accept Offer</Text>
          </TouchableOpacity>
        ) : isPending ? (
          <Text style={[styles.offerPending, isMine && styles.offerPendingMine]}>Pending response...</Text>
        ) : null}

        <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
}

function TextBubble({ message, isMine }) {
  return (
    <View style={[styles.bubbleWrap, isMine && styles.bubbleWrapMine]}>
      <View style={[styles.bubble, isMine && styles.bubbleMine]}>
        <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
          {message.text}
        </Text>
        <View style={styles.bubbleFooter}>
          <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
            {formatTime(message.timestamp)}
          </Text>
          {isMine && (
            <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.7)" />
          )}
        </View>
      </View>
    </View>
  );
}

export default function ChatThreadScreen({ route, navigation }) {
  // Supports two entry modes:
  // 1. From ListingDetail → { listingId, sellerId, listingTitle } — must create/find chat first
  // 2. From ChatsList → { chatId, listingId, listingTitle, sellerId }
  const { chatId: existingChatId, listingId, listingTitle, sellerId } = route.params ?? {};
  const { user, userProfile } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [chatId, setChatId] = useState(existingChatId ?? null);
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(!existingChatId);
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [offerInput, setOfferInput] = useState('');
  const listRef = useRef(null);

  const isSeller = user?.uid === sellerId;

  // Initialize chat (create or fetch) when entering from ListingDetail
  useEffect(() => {
    if (existingChatId) { setInitializing(false); return; }
    if (!user || !listingId || !sellerId) return;
    if (user.uid === sellerId) { setInitializing(false); return; }

    (async () => {
      try {
        const c = await getOrCreateChat({
          listingId,
          listingTitle: listingTitle ?? 'Listing',
          buyerId: user.uid,
          buyerName: userProfile?.name ?? 'Buyer',
          sellerId,
          sellerName: 'Seller',
        });
        setChatId(c.id);
        setChat(c);
      } catch {
        showToast('Could not open chat. Try again.', 'error');
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  // Subscribe to messages once chatId is known
  useEffect(() => {
    if (!chatId) return;
    const unsub = subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [chatId]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !chatId) return;
    setInput('');
    setSending(true);
    try {
      await sendMessage(chatId, user.uid, text);
    } catch {
      showToast('Failed to send message', 'error');
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, sending, chatId, user]);

  const handleSendOffer = async () => {
    const amount = Number(offerInput.replace(/[^0-9.]/g, ''));
    if (!amount || amount <= 0) {
      showToast('Enter a valid offer amount', 'error');
      return;
    }
    setOfferModalVisible(false);
    setOfferInput('');
    try {
      await sendOffer(chatId, user.uid, amount);
    } catch {
      showToast('Failed to send offer', 'error');
    }
  };

  const handleAcceptOffer = async (messageId) => {
    try {
      await acceptOffer(chatId, messageId);
      showToast('Offer accepted!', 'success');
    } catch {
      showToast('Failed to accept offer', 'error');
    }
  };

  const renderMessage = ({ item }) => {
    if (item.type === MESSAGE_TYPES.SYSTEM) {
      return <SystemBubble message={item} />;
    }
    const isMine = item.senderId === user?.uid;
    if (item.type === MESSAGE_TYPES.OFFER) {
      return (
        <OfferBubble
          message={item}
          isMine={isMine}
          isSeller={isSeller}
          onAccept={handleAcceptOffer}
        />
      );
    }
    return <TextBubble message={item} isMine={isMine} />;
  };

  const otherName = isSeller
    ? (chat?.buyerName ?? 'Buyer')
    : (chat?.sellerName ?? 'Seller');

  if (initializing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Opening chat...</Text>
        </View>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.topInfo}>
          <View style={styles.topAvatar}>
            <Text style={styles.topAvatarText}>{otherName?.[0]?.toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.topName}>{otherName}</Text>
            <Text style={styles.topListing} numberOfLines={1}>
              {listingTitle ?? chat?.listingTitle ?? ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.viewListingBtn}
          onPress={() => navigation.navigate('ListingDetail', { listingId })}
        >
          <Ionicons name="eye-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textDisabled} />
              <Text style={styles.emptyChatText}>
                Say hello! Ask about the item, negotiate a price, or arrange a meetup at one of the safe zones.
              </Text>
            </View>
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          {!isSeller && (
            <TouchableOpacity
              style={styles.offerBtn}
              onPress={() => setOfferModalVisible(true)}
            >
              <Ionicons name="pricetag" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.textDisabled}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Ionicons name="send" size={18} color="#FFF" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Make Offer modal */}
      <Modal
        visible={offerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOfferModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOfferModalVisible(false)}
        >
          <View style={styles.offerModal}>
            <View style={styles.modalHandle} />
            <Text style={styles.offerModalTitle}>Make an Offer</Text>
            <Text style={styles.offerModalSub}>
              Enter the amount you'd like to offer the seller.
            </Text>
            <View style={styles.offerInputRow}>
              <Text style={styles.currencySymbol}>₦</Text>
              <TextInput
                style={styles.offerInputField}
                placeholder="Enter amount"
                placeholderTextColor={COLORS.textDisabled}
                value={offerInput}
                onChangeText={setOfferInput}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            <View style={styles.offerModalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setOfferModalVisible(false); setOfferInput(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendOfferBtn} onPress={handleSendOffer}>
                <Text style={styles.sendOfferBtnText}>Send Offer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.small,
  },
  backBtn: { padding: SIZES.sm },
  topInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, marginLeft: 4 },
  topAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topAvatarText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  topName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  topListing: { fontSize: 11, color: COLORS.textSecondary, maxWidth: 180 },
  viewListingBtn: { padding: SIZES.sm },
  messageList: { padding: SIZES.md, gap: SIZES.sm, flexGrow: 1 },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.xxl,
    gap: SIZES.md,
  },
  emptyChatText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Bubbles
  bubbleWrap: { alignItems: 'flex-start', maxWidth: '78%' },
  bubbleWrapMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadiusLg,
    borderBottomLeftRadius: 4,
    padding: SIZES.sm + 2,
    paddingHorizontal: SIZES.md,
    ...SHADOWS.small,
  },
  bubbleMine: {
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: SIZES.borderRadiusLg,
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 21 },
  bubbleTextMine: { color: '#FFF' },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end' },
  bubbleTime: { fontSize: 10, color: COLORS.textDisabled },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.6)' },
  // System bubble
  systemWrap: { alignSelf: 'center', marginVertical: SIZES.sm },
  systemText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.divider,
    paddingHorizontal: SIZES.md,
    paddingVertical: 4,
    borderRadius: SIZES.borderRadiusFull,
    textAlign: 'center',
  },
  // Offer bubble
  offerBubble: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadiusLg,
    borderBottomLeftRadius: 4,
    padding: SIZES.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    gap: 6,
    minWidth: 180,
    ...SHADOWS.small,
  },
  offerBubbleMine: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
    borderBottomLeftRadius: SIZES.borderRadiusLg,
    borderBottomRightRadius: 4,
  },
  offerHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offerLabel: { fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  offerLabelMine: { color: 'rgba(255,255,255,0.8)' },
  offerAmount: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  offerAmountMine: { color: '#FFF' },
  offerPending: { fontSize: 12, color: COLORS.textDisabled, fontStyle: 'italic' },
  offerPendingMine: { color: 'rgba(255,255,255,0.5)' },
  offerAcceptedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offerAcceptedText: { fontSize: 12, fontWeight: '600', color: COLORS.success },
  offerAcceptedTextMine: { color: 'rgba(255,255,255,0.9)' },
  acceptBtn: {
    backgroundColor: COLORS.success,
    borderRadius: SIZES.borderRadiusFull,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    alignItems: 'center',
    marginTop: 2,
  },
  acceptBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SIZES.sm,
    gap: SIZES.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.medium,
  },
  offerBtn: {
    width: 40, height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadiusLg,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  sendBtnDisabled: { backgroundColor: COLORS.textDisabled },
  // Offer modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  offerModal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.borderRadiusLg,
    borderTopRightRadius: SIZES.borderRadiusLg,
    padding: SIZES.lg,
    paddingBottom: SIZES.xxl,
    gap: SIZES.md,
  },
  modalHandle: {
    width: 40, height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SIZES.sm,
  },
  offerModalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  offerModalSub: { fontSize: 13, color: COLORS.textSecondary },
  offerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
  },
  currencySymbol: {
    paddingHorizontal: SIZES.md,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    borderRightWidth: 1,
    borderRightColor: COLORS.primary,
    paddingVertical: SIZES.md,
  },
  offerInputField: {
    flex: 1,
    padding: SIZES.md,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  offerModalBtns: { flexDirection: 'row', gap: SIZES.md },
  cancelBtn: {
    flex: 1,
    padding: SIZES.md,
    borderRadius: SIZES.borderRadiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  sendOfferBtn: {
    flex: 1,
    padding: SIZES.md,
    borderRadius: SIZES.borderRadiusFull,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  sendOfferBtnText: { color: '#FFF', fontWeight: '700' },
});
