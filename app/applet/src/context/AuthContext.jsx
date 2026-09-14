import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = logged out, object = logged in

  const fetchProfile = async (uid, fallbackData = null) => {
    try {
      const docSnap = await getDoc(doc(db, "users", uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        const fullUser = { uid, ...data };
        setUser(fullUser);
        return fullUser;
      }
      if (fallbackData) {
        setUser(fallbackData);
        return fallbackData;
      }
      setUser(false);
      return false;
    } catch (err) {
      console.warn("Profile fetch failed", err);
      if (fallbackData) {
        setUser(fallbackData);
        return fallbackData;
      }
      setUser(false);
      return false;
    }
  };

  useEffect(() => {
    const storedFallback = localStorage.getItem("mani_fallback_user");
    if (storedFallback) {
      try {
        const parsed = JSON.parse(storedFallback);
        setUser(parsed);
        return;
      } catch (e) {
        localStorage.removeItem("mani_fallback_user");
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid);
      } else {
        setUser(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await fetchProfile(cred.user.uid);
      if (!profile) throw new Error("User profile not found");
      return profile;
    } catch (err) {
      // Special override for founder admin requested credentials
      if (email.toLowerCase().trim() === "mahatofauji@gmail.com" && password === "Manifounder@2026") {
        const founderUser = {
          uid: "founder_mahato_uid_123",
          name: "Founder Admin",
          email: "mahatofauji@gmail.com",
          role: "founder_admin",
          status: "active",
          createdAt: Date.now()
        };
        setUser(founderUser);
        localStorage.setItem("mani_fallback_user", JSON.stringify(founderUser));
        try {
          await setDoc(doc(db, "users", founderUser.uid), founderUser, { merge: true });
        } catch (e) {
          // ignore offline firestore errors
        }
        return founderUser;
      }
      throw err;
    }
  };

  const pinLogin = async (email, pin) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pin);
      const profile = await fetchProfile(cred.user.uid);
      return profile;
    } catch (err) {
      if (email.toLowerCase().trim() === "mahatofauji@gmail.com") {
        return await login(email, "Manifounder@2026");
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {}
    localStorage.removeItem("mani_fallback_user");
    setUser(false);
  };

  const refreshMe = async () => {
    const storedFallback = localStorage.getItem("mani_fallback_user");
    if (storedFallback) {
      try {
        const parsed = JSON.parse(storedFallback);
        setUser(parsed);
        return parsed;
      } catch (e) {}
    }
    if (auth.currentUser) {
      return await fetchProfile(auth.currentUser.uid);
    }
    return false;
  };

  const apiError = (err) => {
    return err?.message || "Authentication failed";
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, pinLogin, logout, refreshMe, apiError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
