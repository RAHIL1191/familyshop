import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { ADMIN_EMAILS } from '../config';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          const isAdminEmail = user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
          // Auto-upgrade to admin if email matches
          if (isAdminEmail && data.role !== 'admin') {
            await setDoc(docRef, { ...data, role: 'admin' }, { merge: true });
            setProfile({ ...data, role: 'admin' });
          } else {
            setProfile(data);
          }
        } else {
          // Create default profile
          const isAdminEmail = user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email!,
            displayName: user.displayName || 'Guest',
            role: isAdminEmail ? 'admin' : 'customer'
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => signOut(auth);

  const isAdmin = profile?.role === 'admin' || (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) || false;

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
