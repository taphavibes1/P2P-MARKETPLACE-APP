import {
  collection, query, where, orderBy, getDocs,
  getDoc, doc, limit, startAfter, addDoc, updateDoc,
  deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const PAGE_SIZE = 20;

export async function fetchListings({ category, search, lastDoc } = {}) {
  let q = query(
    collection(db, 'listings'),
    where('status', '==', 'available'),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE),
  );

  if (category && category !== 'all') {
    q = query(
      collection(db, 'listings'),
      where('status', '==', 'available'),
      where('category', '==', category),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE),
    );
  }

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snap = await getDocs(q);
  const listings = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const filtered = search
    ? listings.filter(l =>
        l.title?.toLowerCase().includes(search.toLowerCase()) ||
        l.description?.toLowerCase().includes(search.toLowerCase())
      )
    : listings;

  return {
    listings: filtered,
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === PAGE_SIZE,
  };
}

export async function fetchListingById(listingId) {
  const snap = await getDoc(doc(db, 'listings', listingId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function fetchSellerProfile(sellerId) {
  const snap = await getDoc(doc(db, 'users', sellerId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createListing(data, userId) {
  const ref = await addDoc(collection(db, 'listings'), {
    ...data,
    sellerId: userId,
    status: 'available',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateListing(listingId, data) {
  await updateDoc(doc(db, 'listings', listingId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteListing(listingId) {
  await deleteDoc(doc(db, 'listings', listingId));
}

export async function fetchMyListings(userId) {
  // No orderBy — avoids needing a composite index; sort client-side instead
  const q = query(collection(db, 'listings'), where('sellerId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}
