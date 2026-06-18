import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

import { auth, authPersistenceReady, googleProvider, isFirebaseConfigured } from "../firebase.js";
import { apiUrl, readApiJson } from "../config";

export interface FirebaseUserProfile {
  firebase_uid: string;
  email: string;
  full_name: string;
  auth_provider: string;
  profile_picture: string;
  email_verified: boolean;
  subscription_plan: "free" | "go" | "pro" | "enterprise" | string;
  credits_remaining: number | null;
  created_at: string | null;
  last_login: string | null;
}

interface AuthContextValue {
  user: User | null;
  profile: FirebaseUserProfile | null;
  loading: boolean;
  authReady: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (fullName: string, email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function requireAuth() {
  if (!auth) {
    throw new Error("Secure sign-in is not available right now.");
  }
  return auth;
}

function profileFromFirebaseUser(user: User): FirebaseUserProfile {
  const primaryProvider = user.providerData[0]?.providerId || "password";
  return {
    firebase_uid: user.uid,
    email: user.email || "",
    full_name: user.displayName || "",
    auth_provider: primaryProvider === "google.com" ? "google" : "password",
    profile_picture: user.photoURL || "",
    email_verified: user.emailVerified,
    subscription_plan: "free",
    credits_remaining: null,
    created_at: user.metadata.creationTime || null,
    last_login: user.metadata.lastSignInTime || null,
  };
}

interface EmailValidationResponse {
  success: boolean;
  valid: boolean;
  message?: string;
}

async function validateEmailBeforeRegistration(email: string) {
  const response = await fetch(apiUrl("/api/auth/validate-email"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const result = await readApiJson<EmailValidationResponse>(response);
  if (!result.valid) {
    throw new Error(result.message || "Please use a valid permanent email address.");
  }
}

async function sendBrandedEmailVerification(token: string) {
  const response = await fetch(apiUrl("/api/auth/email-verification"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  await readApiJson<{ success: boolean; message: string }>(response);
}

async function sendBrandedPasswordReset(email: string) {
  const response = await fetch(apiUrl("/api/auth/password-reset"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  await readApiJson<{ success: boolean; message: string }>(response);
}

async function syncBackendWorkspaceSession(user: User) {
  try {
    const token = await user.getIdToken(true);
    const sessionResponse = await fetch(apiUrl("/api/workspaces/session"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    await readApiJson(sessionResponse);
    return true;
  } catch (error) {
    console.warn("Backend workspace session sync failed. Auth session will remain active.", error);
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FirebaseUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    if (!auth?.currentUser) {
      setProfile(null);
      return;
    }
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken();
    setProfile(profileFromFirebaseUser(auth.currentUser));
  }, []);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    setLoading(true);

    authPersistenceReady.finally(() => {
      if (cancelled) return;
      unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
        setUser(nextUser);
        if (!nextUser) {
          setProfile(null);
          setLoading(false);
          return;
        }

        try {
          await nextUser.getIdToken();
        } catch (error) {
          console.warn("Firebase session restore token refresh failed.", error);
        }

        if (!cancelled) {
          setProfile(profileFromFirebaseUser(nextUser));
          setLoading(false);
        }
      });
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!auth || !user) return undefined;

    let cancelled = false;
    const refreshFirebaseToken = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== user.uid) return;

      try {
        await currentUser.getIdToken(true);
        if (!cancelled) {
          setProfile(profileFromFirebaseUser(currentUser));
        }
      } catch (error) {
        console.warn("Silent Firebase token refresh failed.", error);
      }
    };

    const timer = window.setInterval(refreshFirebaseToken, 50 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user]);

  useEffect(() => {
    if (!auth || !user) return undefined;

    const refreshOnReturn = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== user.uid) return;
      try {
        await currentUser.getIdToken();
        setProfile(profileFromFirebaseUser(currentUser));
      } catch (error) {
        console.warn("Firebase session refresh on return failed.", error);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshOnReturn();
      }
    };

    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      authReady: isFirebaseConfigured,
      signInEmail: async (email, password) => {
        await authPersistenceReady;
        const credential = await signInWithEmailAndPassword(requireAuth(), email, password);
        await syncBackendWorkspaceSession(credential.user);
        await refreshSession();
      },
      registerEmail: async (fullName, email, password) => {
        await authPersistenceReady;
        await validateEmailBeforeRegistration(email);
        const credential = await createUserWithEmailAndPassword(requireAuth(), email, password);
        await updateProfile(credential.user, { displayName: fullName });
        const token = await credential.user.getIdToken(true);
        await sendBrandedEmailVerification(token);
        await syncBackendWorkspaceSession(credential.user);
        await refreshSession();
      },
      signInGoogle: async () => {
        await authPersistenceReady;
        const credential = await signInWithPopup(requireAuth(), googleProvider);
        await syncBackendWorkspaceSession(credential.user);
        await refreshSession();
      },
      resetPassword: async (email) => {
        await authPersistenceReady;
        const normalizedEmail = email.trim().toLowerCase();
        await sendBrandedPasswordReset(normalizedEmail);
      },
      logout: async () => {
        await authPersistenceReady;
        await signOut(requireAuth());
        setProfile(null);
      },
      refreshSession,
    }),
    [loading, profile, refreshSession, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
