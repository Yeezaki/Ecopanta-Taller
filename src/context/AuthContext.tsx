import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { AppUser, UserRole } from '../types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeRole(raw: unknown): UserRole {
  if (raw === 'admin' || raw === 'taller') return raw;
  return 'usuario';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(
          userRef,
          {
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            displayName:
              firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'Usuario',
            role: 'usuario',
            workshopId: null,
          },
          { merge: true }
        );
      }

      unsubscribeUserDoc = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUser({
            uid: docSnap.id,
            email: data.email ?? firebaseUser.email ?? '',
            displayName:
              data.displayName ??
              data.name ??
              firebaseUser.displayName ??
              firebaseUser.email?.split('@')[0] ??
              'Usuario',
            role: normalizeRole(data.storeRole ?? data.role),
            workshopId: data.workshopId ?? null,
          });
        }
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email: string, password: string, displayName: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(
      doc(db, 'users', credential.user.uid),
      {
        uid: credential.user.uid,
        email,
        displayName,
        role: 'usuario',
        workshopId: null,
      },
      { merge: true }
    );
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider');
  }
  return ctx;
}