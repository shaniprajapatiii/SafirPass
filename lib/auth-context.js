"use client";

import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext({
  user: null,
  isAdmin: false,
  loading: true,
  signInWithGoogle: () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signInAsAdmin: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      setUser(data?.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const signInWithGoogle = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/api/auth/google";
    }
  };

  const signInWithEmail = async (email, password) => {
    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Sign in failed");
    setUser(data.user);
    return data;
  };

  const signUpWithEmail = async (email, password, fullName) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    setUser(data.user);
    return data;
  };

  const signInAsAdmin = async (email, password) => {
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Admin authentication failed");
    setUser(data.user);
    return data;
  };

  const signOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const isAdmin = user?.role === "admin" || user?.user_metadata?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAsAdmin,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

