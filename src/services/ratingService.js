import {
  collection, addDoc, getDocs, query, where,
  updateDoc, doc, serverTimestamp, runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export async function hasRated(paymentId) {
  const q = query(collection(db, 'ratings'), where('paymentId', '==', paymentId));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function submitRating({ sellerId, buyerId, listingId, paymentId, stars, comment }) {
  await runTransaction(db, async (tx) => {
    const sellerRef = doc(db, 'users', sellerId);
    const sellerSnap = await tx.get(sellerRef);
    if (!sellerSnap.exists()) throw new Error('Seller not found');

    const { rating = 0, totalRatings = 0, totalSales = 0 } = sellerSnap.data();
    const newTotal = totalRatings + 1;
    const newRating = ((rating * totalRatings) + stars) / newTotal;

    tx.update(sellerRef, {
      rating: newRating,
      totalRatings: newTotal,
      totalSales: totalSales + 1,
    });

    const ratingRef = doc(collection(db, 'ratings'));
    tx.set(ratingRef, {
      sellerId,
      buyerId,
      listingId,
      paymentId,
      stars,
      comment: comment?.trim() ?? '',
      createdAt: serverTimestamp(),
    });
  });
}

export async function fetchRatingsForSeller(sellerId) {
  const q = query(collection(db, 'ratings'), where('sellerId', '==', sellerId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
