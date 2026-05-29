"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  email: string;
}

export interface AuthError {
  code: string;
  message: string;
  userMessage: string; // User-friendly message for UI
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signInWithProvider: (
    provider: "google" | "github",
  ) => Promise<{ error?: AuthError }>;
  resetPassword: (email: string) => Promise<{ error?: AuthError }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to convert Supabase errors to user-friendly messages
function getErrorMessage(error: unknown): AuthError {
  if (error === null || error === undefined) {
    return {
      code: "unknown",
      message: "Unknown error",
      userMessage: "An error occurred. Please try again.",
    };
  }

  const err = error as Record<string, string | number>;
  const code = (err.code as string) || (err.status as string) || "unknown";
  const message = (err.message as string) || "An error occurred";

  if (
    message.includes("Email not confirmed") ||
    message.includes("email_not_confirmed")
  ) {
    return {
      code: "email_not_confirmed",
      message,
      userMessage:
        "Please verify your email first. Check your inbox for the verification link we sent you.",
    };
  }

  if (
    message.includes("Invalid login credentials") ||
    message.includes("invalid_credentials")
  ) {
    return {
      code: "invalid_credentials",
      message,
      userMessage: "Invalid email or password. Please check and try again.",
    };
  }

  if (message.includes("already registered")) {
    return {
      code: "user_already_exists",
      message,
      userMessage:
        "This email is already registered. Try signing in instead, or use a different email.",
    };
  }

  if (message.includes("Password should be")) {
    return {
      code: "weak_password",
      message,
      userMessage:
        "Password is too weak. Use at least 6 characters with a mix of letters and numbers.",
    };
  }

  if (message.includes("Invalid email")) {
    return {
      code: "invalid_email",
      message,
      userMessage: "Please enter a valid email address.",
    };
  }

  if (message.includes("rate limit")) {
    return {
      code: "rate_limited",
      message,
      userMessage: "Too many attempts. Please wait a moment and try again.",
    };
  }

  if (message.includes("User already registered")) {
    return {
      code: "user_already_exists",
      message,
      userMessage:
        "This email is already registered. Try signing in instead, or use a different email.",
    };
  }

  if (code === "400") {
    return {
      code: "bad_request",
      message,
      userMessage: "Invalid email or password. Please check and try again.",
    };
  }

  return {
    code,
    message,
    userMessage:
      "Authentication failed. Please try again or contact support if the problem persists.",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
          });
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        const authError = getErrorMessage(error);
        return { error: authError };
      }

      // Create user record in database
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: authUser.id,
            email: authUser.email,
          }),
        });
      }

      return {};
    } catch (error: unknown) {
      const authError = getErrorMessage(error);
      return { error: authError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        const authError = getErrorMessage(error);
        return { error: authError };
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
        });

        await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: session.user.id,
            email: session.user.email,
          }),
        });
      }

      router.push("/");
      return {};
    } catch (error: unknown) {
      const authError = getErrorMessage(error);
      return { error: authError };
    }
  };

  const signInWithProvider = async (provider: "google" | "github") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        const authError = getErrorMessage(error);
        return { error: authError };
      }

      return {};
    } catch (error: unknown) {
      const authError = getErrorMessage(error);
      return { error: authError };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        const authError = getErrorMessage(error);
        return { error: authError };
      }

      return {};
    } catch (error: unknown) {
      const authError = getErrorMessage(error);
      return { error: authError };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.push("/auth");
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signInWithProvider,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
