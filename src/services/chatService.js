import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, getDoc, getDocs,
  serverTimestamp, or,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { MESSAGE_TYPES, CHAT_STATUS } from '../constants';

// Find existing chat or create new one for this listing + buyer pair
export async function getOrCreateChat({ listingId, listingTitle, buyerId, buyerName, sellerId, sellerName }) {
  const q = query(
    collection(db, 'chats'),
    where('listingId', '==', listingId),
    where('buyerId', '==', buyerId),
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  }

  const ref = await addDoc(collection(db, 'chats'), {
    listingId,
    listingTitle,
    buyerId,
    buyerName,
    sellerId,
    sellerName,
    lastMessage: '',
    lastMessageTime: serverTimestamp(),
    status: CHAT_STATUS.ACTIVE,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, listingId, listingTitle, buyerId, buyerName, sellerId, sellerName };
}

// Real-time listener for all chats belonging to a user
export function subscribeToMyChats(userId, onUpdate) {
  // No orderBy on Firestore to avoid requiring a composite index — sort client-side
  const q = query(collection(db, 'chats'), where('buyerId', '==', userId));
  const q2 = query(collection(db, 'chats'), where('sellerId', '==', userId));

  const results = {};
  let settled1 = false;
  let settled2 = false;

  const emit = () => {
    if (!settled1 || !settled2) return;
    onUpdate(Object.values(results).sort((a, b) => {
      const ta = a.lastMessageTime?.toMillis?.() ?? 0;
      const tb = b.lastMessageTime?.toMillis?.() ?? 0;
      return tb - ta;
    }));
  };

  const unsub1 = onSnapshot(q, snap => {
    snap.docs.forEach(d => { results[d.id] = { id: d.id, ...d.data() }; });
    settled1 = true;
    emit();
  }, err => {
    console.error('Chat buyer query error:', err);
    settled1 = true;
    emit();
  });

  const unsub2 = onSnapshot(q2, snap => {
    snap.docs.forEach(d => { results[d.id] = { id: d.id, ...d.data() }; });
    settled2 = true;
    emit();
  }, err => {
    console.error('Chat seller query error:', err);
    settled2 = true;
    emit();
  });

  return () => { unsub1(); unsub2(); };
}

// Real-time listener for messages in a chat thread
export function subscribeToMessages(chatId, onUpdate) {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('timestamp', 'asc'),
  );
  return onSnapshot(q, snap => {
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(messages);
  });
}

// Send a text message
export async function sendMessage(chatId, senderId, text) {
  const msg = {
    senderId,
    text,
    type: MESSAGE_TYPES.TEXT,
    timestamp: serverTimestamp(),
    delivered: true,
  };
  await addDoc(collection(db, 'chats', chatId, 'messages'), msg);
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: text,
    lastMessageTime: serverTimestamp(),
  });
}

// Send an offer message
export async function sendOffer(chatId, senderId, amount) {
  const text = `Offer: ₦${Number(amount).toLocaleString()}`;
  const msg = {
    senderId,
    text,
    offerAmount: Number(amount),
    type: MESSAGE_TYPES.OFFER,
    offerStatus: 'pending',
    timestamp: serverTimestamp(),
    delivered: true,
  };
  await addDoc(collection(db, 'chats', chatId, 'messages'), msg);
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: text,
    lastMessageTime: serverTimestamp(),
  });
}

// Seller accepts an offer
export async function acceptOffer(chatId, messageId) {
  await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
    offerStatus: 'accepted',
  });
  await updateDoc(doc(db, 'chats', chatId), {
    status: CHAT_STATUS.OFFER_ACCEPTED,
    lastMessage: 'Offer accepted ✓',
    lastMessageTime: serverTimestamp(),
  });
  // System message
  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    senderId: 'system',
    text: 'Offer accepted! Proceed to payment to complete the purchase.',
    type: MESSAGE_TYPES.SYSTEM,
    timestamp: serverTimestamp(),
  });
}
