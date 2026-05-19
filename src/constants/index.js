export const CATEGORIES = [
  { id: 'textbooks', label: 'Textbooks', icon: 'book' },
  { id: 'hostel_gear', label: 'Hostel Gear', icon: 'bed' },
  { id: 'electronics', label: 'Electronics', icon: 'laptop' },
  { id: 'fashion', label: 'Fashion', icon: 'shirt' },
  { id: 'food_snacks', label: 'Food & Snacks', icon: 'fast-food' },
  { id: 'services', label: 'Services', icon: 'construct' },
  { id: 'other', label: 'Other', icon: 'apps' },
];

export const SAFE_ZONES = [
  { id: 'main_gate', label: 'Main Gate', latitude: 6.3456, longitude: 5.6198 },
  { id: 'june12', label: 'June 12 / CBN Junction', latitude: 6.3512, longitude: 5.6234 },
  { id: 'engineering', label: 'Faculty of Engineering', latitude: 6.3478, longitude: 5.6215 },
];

export const UGBOWO_CENTER = { latitude: 6.3490, longitude: 5.6221 };

export const UGBOWO_BOUNDS = {
  minLat: 6.33,
  maxLat: 6.37,
  minLng: 5.60,
  maxLng: 5.65,
};

export const PLATFORM_FEE_PERCENT = 0.02;

export const DEPARTMENTS = [
  'Computer Science',
  'Electrical/Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Medicine and Surgery',
  'Pharmacy',
  'Law',
  'Accounting',
  'Business Administration',
  'Economics',
  'Mass Communication',
  'Political Science',
  'Sociology',
  'Psychology',
  'English and Literature',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Agricultural Science',
  'Architecture',
  'Other',
];

export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

export const LISTING_STATUS = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  SOLD: 'sold',
};

export const PAYMENT_STATUS = {
  HELD: 'held',
  RELEASED: 'released',
  REFUNDED: 'refunded',
};

export const CHAT_STATUS = {
  ACTIVE: 'active',
  OFFER_ACCEPTED: 'offer_accepted',
  COMPLETED: 'completed',
};

export const MESSAGE_TYPES = {
  TEXT: 'text',
  OFFER: 'offer',
  SYSTEM: 'system',
};
