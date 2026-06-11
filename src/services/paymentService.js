import {
  collection, addDoc, updateDoc, doc, getDoc,
  query, where, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { PAYMENT_STATUS, LISTING_STATUS, PLATFORM_FEE_PERCENT } from '../constants';

export function calcFee(price) {
  const fee = Math.round(price * PLATFORM_FEE_PERCENT);
  return { price, fee, total: price + fee };
}

// Buyer initiates payment — creates held record, reserves listing
export async function initiatePayment({ listingId, buyerId, sellerId, amount }) {
  const { fee, total } = calcFee(amount);

  const ref = await addDoc(collection(db, 'payments'), {
    listingId,
    buyerId,
    sellerId,
    amount,
    fee,
    total,
    status: PAYMENT_STATUS.HELD,
    createdAt: serverTimestamp(),
  });

  // Reserve the listing
  await updateDoc(doc(db, 'listings', listingId), {
    status: LISTING_STATUS.RESERVED,
    reservedBy: buyerId,
    reservedAt: serverTimestamp(),
  });

  return ref.id;
}

// Buyer scans QR — releases funds and marks listing sold
export async function releasePayment(paymentId, buyerId) {
  const payRef = doc(db, 'payments', paymentId);
  const paySnap = await getDoc(payRef);

  if (!paySnap.exists()) throw new Error('Payment not found');
  const payment = paySnap.data();

  if (payment.buyerId !== buyerId) throw new Error('You are not the buyer for this payment');
  if (payment.status !== PAYMENT_STATUS.HELD) throw new Error(`Payment is already ${payment.status}`);

  await updateDoc(payRef, {
    status: PAYMENT_STATUS.RELEASED,
    releasedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'listings', payment.listingId), {
    status: LISTING_STATUS.SOLD,
    soldAt: serverTimestamp(),
  });

  return payment;
}

// Admin refunds — restores listing to available
export async function refundPayment(paymentId) {
  const payRef = doc(db, 'payments', paymentId);
  const paySnap = await getDoc(payRef);
  if (!paySnap.exists()) throw new Error('Payment not found');
  const payment = paySnap.data();

  await updateDoc(payRef, {
    status: PAYMENT_STATUS.REFUNDED,
    refundedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'listings', payment.listingId), {
    status: LISTING_STATUS.AVAILABLE,
    reservedBy: null,
  });
}

export async function fetchPaymentById(paymentId) {
  const snap = await getDoc(doc(db, 'payments', paymentId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function fetchPaymentForListing(listingId) {
  const q = query(
    collection(db, 'payments'),
    where('listingId', '==', listingId),
    where('status', '==', PAYMENT_STATUS.HELD),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function fetchMyPayments(userId) {
  const q = query(
    collection(db, 'payments'),
    where('buyerId', '==', userId),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
