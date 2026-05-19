import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchUserProfile(firebaseUser.uid);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const fetchUserProfile = async (uid) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile({ id: uid, ...docSnap.data() });
      } else {
        // Profile doc missing (e.g. registration write failed) — recreate it
        const firebaseUser = auth.currentUser;
        const fallback = {
          name: firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'User',
          email: firebaseUser?.email || '',
          phone: '',
          department: 'Other',
          studentIdNumber: '',
          studentIdImageUrl: '',
          verificationStatus: 'pending',
          rating: 0,
          totalRatings: 0,
          totalSales: 0,
          isAdmin: false,
          createdAt: serverTimestamp(),
        };
        await setDoc(docRef, fallback);
        setUserProfile({ id: uid, ...fallback });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserProfile(result.user.uid);
    return result;
  };

  const register = async (email, password, profileData) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const uid = result.user.uid;
    const newProfile = {
      name: profileData.name,
      email: profileData.email,
      phone: profileData.phone,
      department: profileData.department,
      studentIdNumber: profileData.studentIdNumber,
      studentIdImageUrl: '',
      verificationStatus: 'pending',
      rating: 0,
      totalRatings: 0,
      totalSales: 0,
      isAdmin: false,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', uid), newProfile);
    setUserProfile({ id: uid, ...newProfile });
    return result;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const refreshProfile = () => fetchUserProfile(user?.uid);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
