import {
  collection, doc, setDoc, addDoc, serverTimestamp, getDocs,
  query, where, limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const DEMO_SELLER_ID = 'demo_seller_uid_001';

const DEMO_SELLER = {
  name: 'Emeka Obi',
  email: 'emeka@demo.ugbowo',
  phone: '08031234567',
  department: 'Computer Science',
  studentIdNumber: '200401001',
  studentIdImageUrl: '',
  verificationStatus: 'verified',
  rating: 4.5,
  totalRatings: 12,
  totalSales: 8,
  isAdmin: false,
};

const DEMO_LISTINGS_FOR_BUYER = [
  {
    title: 'HP Laptop 14" (Core i5, 8GB RAM)',
    description: 'Perfect for school work. Battery lasts ~4 hours. Minor scratch on lid but screen is perfect. Comes with charger.',
    price: 155000,
    category: 'electronics',
    imageUrls: [],
    locationLabel: 'Ugbowo, UNIBEN',
    location: { latitude: 6.349, longitude: 5.6221 },
  },
  {
    title: 'Samsung Galaxy A14 (128GB)',
    description: 'Used for 6 months. Screen protector on since day one. Comes with original charger and box. No scratches.',
    price: 95000,
    category: 'electronics',
    imageUrls: [],
    locationLabel: 'Ugbowo, UNIBEN',
    location: { latitude: 6.3478, longitude: 5.6215 },
  },
];

const MY_DEMO_LISTINGS = [
  {
    title: 'Engineering Mathematics (Kreyszig 10th Ed)',
    description: 'Very clean copy. Barely used, no annotations. Great for 200L Engineering students.',
    price: 8500,
    category: 'textbooks',
    imageUrls: [],
    locationLabel: 'Ugbowo, UNIBEN',
    location: { latitude: 6.3490, longitude: 5.6221 },
  },
  {
    title: 'Standing Fan + Desk Lamp Bundle',
    description: 'Both in good working condition. Selling together since I\'m moving out of the hostel.',
    price: 12000,
    category: 'hostel_gear',
    imageUrls: [],
    locationLabel: 'Ugbowo, UNIBEN',
    location: { latitude: 6.3490, longitude: 5.6221 },
  },
  {
    title: 'Men\'s School Backpack (Navy Blue)',
    description: 'Used for one semester only. Has laptop compartment and multiple pockets.',
    price: 6000,
    category: 'fashion',
    imageUrls: [],
    locationLabel: 'Ugbowo, UNIBEN',
    location: { latitude: 6.3490, longitude: 5.6221 },
  },
];

export async function seedDemoData(currentUser) {
  const uid = currentUser.uid;
  const userName = currentUser.displayName || 'You';

  // 1. Create demo seller profile
  await setDoc(doc(db, 'users', DEMO_SELLER_ID), {
    ...DEMO_SELLER,
    createdAt: serverTimestamp(),
  });

  // 2. Create listings by demo seller (for the current user to browse/buy)
  const buyerListingIds = [];
  for (const listing of DEMO_LISTINGS_FOR_BUYER) {
    const ref = await addDoc(collection(db, 'listings'), {
      ...listing,
      sellerId: DEMO_SELLER_ID,
      sellerName: DEMO_SELLER.name,
      status: 'available',
      createdAt: serverTimestamp(),
    });
    buyerListingIds.push(ref.id);
  }

  // 3. Create listings by current user (shows in "My Listings" tab)
  for (const listing of MY_DEMO_LISTINGS) {
    await addDoc(collection(db, 'listings'), {
      ...listing,
      sellerId: uid,
      sellerName: userName,
      status: 'available',
      createdAt: serverTimestamp(),
    });
  }

  // 4. Create a demo chat (current user as buyer, demo seller as seller)
  const chatRef = await addDoc(collection(db, 'chats'), {
    listingId: buyerListingIds[0],
    listingTitle: DEMO_LISTINGS_FOR_BUYER[0].title,
    buyerId: uid,
    buyerName: userName,
    sellerId: DEMO_SELLER_ID,
    sellerName: DEMO_SELLER.name,
    lastMessage: 'Is this still available?',
    lastMessageTime: serverTimestamp(),
    status: 'active',
    createdAt: serverTimestamp(),
  });

  // 5. Seed messages in that chat
  const messages = [
    { senderId: uid, text: 'Hi, is this laptop still available?', type: 'text' },
    { senderId: DEMO_SELLER_ID, text: 'Yes it is! Available for pickup today.', type: 'text' },
    { senderId: uid, text: 'Can you do ₦140,000?', type: 'text' },
    {
      senderId: uid,
      text: 'Offer: ₦140,000',
      offerAmount: 140000,
      type: 'offer',
      offerStatus: 'pending',
    },
    { senderId: DEMO_SELLER_ID, text: 'Let me think about it...', type: 'text' },
  ];
  for (const msg of messages) {
    await addDoc(collection(db, 'chats', chatRef.id, 'messages'), {
      ...msg,
      timestamp: serverTimestamp(),
      delivered: true,
    });
  }

  // 6. Create a held payment (current user as buyer) — for testing QR/payment screens
  const paymentRef = await addDoc(collection(db, 'payments'), {
    listingId: buyerListingIds[1],
    listingTitle: DEMO_LISTINGS_FOR_BUYER[1].title,
    buyerId: uid,
    sellerId: DEMO_SELLER_ID,
    amount: 95000,
    fee: 1900,
    total: 96900,
    status: 'held',
    createdAt: serverTimestamp(),
  });

  // 7. Create a released payment (for testing the Rate Seller feature)
  await addDoc(collection(db, 'payments'), {
    listingId: buyerListingIds[0],
    listingTitle: DEMO_LISTINGS_FOR_BUYER[0].title,
    buyerId: uid,
    sellerId: DEMO_SELLER_ID,
    amount: 155000,
    fee: 3100,
    total: 158100,
    status: 'released',
    createdAt: serverTimestamp(),
  });

  return { chatId: chatRef.id, paymentId: paymentRef.id };
}
