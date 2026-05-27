import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

import { auth, googleProvider, isFirebaseConfigured } from "../firebase.js";
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

async function sendBrandedPasswordReset(email: string) {
  let response: Response;
  try {
    response = await fetch(apiUrl("/api/auth/password-reset"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch (error) {
    throw Object.assign(new Error("Backend password reset is unavailable."), { backendUnavailable: true, cause: error });
  }
  await readApiJson<{ success: boolean; message: string }>(response);
}

async function sendBrandedEmailVerification(token: string) {
  const response = await fetch(apiUrl("/api/auth/email-verification"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  await readApiJson<{ success: boolean; message: string }>(response);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FirebaseUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    if (!auth?.currentUser) {
      setProfile(null);
      return;
    }
    await auth.currentUser.reload();
    setProfile(profileFromFirebaseUser(auth.currentUser));
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(profileFromFirebaseUser(nextUser));
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      authReady: isFirebaseConfigured,
      signInEmail: async (email, password) => {
        await signInWithEmailAndPassword(requireAuth(), email, password);
        await refreshSession();
      },
      registerEmail: async (fullName, email, password) => {
        await validateEmailBeforeRegistration(email);
        const credential = await createUserWithEmailAndPassword(requireAuth(), email, password);
        await updateProfile(credential.user, { displayName: fullName });
        const token = await credential.user.getIdToken(true);
        await sendBrandedEmailVerification(token);
        const sessionResponse = await fetch(apiUrl("/api/workspaces/session"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        await readApiJson(sessionResponse);
        await refreshSession();
      },
      signInGoogle: async () => {
        await signInWithPopup(requireAuth(), googleProvider);
        await refreshSession();
      },
      resetPassword: async (email) => {
        try {
          await sendBrandedPasswordReset(email);
        } catch (error) {
          if (!(error instanceof Error) || !(error as Error & { backendUnavailable?: boolean }).backendUnavailable) {
            throw error;
          }
          await sendPasswordResetEmail(requireAuth(), email);
        }
      },
      logout: async () => {
        await signOut(requireAuth());
        setProfile(null);
      },
      refreshSession,
    }),
    [loading, profile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
