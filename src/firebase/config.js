import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, browserLocalPersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyA1TFHSoYhbKtIhDbUysLA2Gu5un0kEtws",
  authDomain: "p2p-marketplace-92895.firebaseapp.com",
  projectId: "p2p-marketplace-92895",
  storageBucket: "p2p-marketplace-92895.firebasestorage.app",
  messagingSenderId: "1034362432289",
  appId: "1:1034362432289:android:296321588887de27e06c60",
};

const app = initializeApp(firebaseConfig);

export const auth = Platform.OS === 'web'
  ? initializeAuth(app, { persistence: browserLocalPersistence })
  : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
