"use client";

import * as React from "react";
import { AuthUser, UserRole } from "./types";
import { toast } from "sonner";

export interface AuthContextValue {
  user: AuthUser | null;
  role: UserRole;
  isStaff: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: "signin" | "signup" | "switch_role";
  openAuthModal: (mode?: "signin" | "signup" | "switch_role") => void;
  closeAuthModal: () => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [authModalMode, setAuthModalMode] = React.useState<"signin" | "signup" | "switch_role">("signin");

  const refreshSession = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const json = await res.json();
        setUser(json.data?.user || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (isMounted) {
          setUser(json?.data?.user || null);
        }
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const openAuthModal = React.useCallback((mode: "signin" | "signup" | "switch_role" = "signin") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = React.useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error?.message || "Sign in failed");
        return false;
      }

      setUser(json.data.user);
      toast.success(`Signed in as ${json.data.user.displayName}`);
      closeAuthModal();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in request failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error?.message || "Sign up failed");
        return false;
      }

      setUser(json.data.user);
      toast.success(`Account created! Welcome, ${json.data.user.displayName}`);
      closeAuthModal();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up request failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
      setUser(null);
      toast.success("Signed out successfully");
      await refreshSession();
    } catch {
      toast.error("Failed to sign out");
    } finally {
      setIsLoading(false);
    }
  };

  const switchDemoRole = async (targetRole: UserRole) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });

      const json = await res.json();
      if (res.ok && json.data?.user) {
        setUser(json.data.user);
        toast.success(json.data.message || `Switched to ${targetRole.toUpperCase()}`);
        closeAuthModal();
      } else {
        toast.error("Failed to switch role");
      }
    } catch {
      toast.error("Role switch error");
    } finally {
      setIsLoading(false);
    }
  };

  const role: UserRole = user?.role || "reporter";
  const isStaff = Boolean(user?.isStaff || role === "staff" || role === "admin");
  const isAdmin = Boolean(user?.isAdmin || role === "admin");
  const isAuthenticated = Boolean(user);

  const value: AuthContextValue = {
    user,
    role,
    isStaff,
    isAdmin,
    isAuthenticated,
    isLoading,
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    signIn,
    signUp,
    signOut,
    switchDemoRole,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
