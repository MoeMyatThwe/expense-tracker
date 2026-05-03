"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/auth-context";
import type { AuthError } from "@/app/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Image from "next/image";
import { Eye, EyeOff, Mail } from "lucide-react";

function AuthPageContent() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (tabParam === "signup") setTab("signup");
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Signed in successfully!");
      router.push("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const authError: AuthError = {
        code: "unknown",
        message,
        userMessage: "An unexpected error occurred. Please try again.",
      };
      setError(authError);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signUp(email, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSignUpSuccess(true);
      setEmail("");
      setPassword("");
      toast.success("Account created! Check your email to verify.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const authError: AuthError = {
        code: "unknown",
        message,
        userMessage: "An unexpected error occurred. Please try again.",
      };
      setError(authError);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);

    try {
      const result = await resetPassword(forgotEmail);
      if (result.error) {
        setError(result.error);
        return;
      }
      setResetSent(true);
      toast.success("Password reset link sent to your email!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const authError: AuthError = {
        code: "unknown",
        message,
        userMessage: "An unexpected error occurred. Please try again.",
      };
      setError(authError);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at center, 
          #FFFFFF 0%,
          #FFFFFF 30%,
          #E1EDFD 70%,
          #E1EDFD 100%)`,
      }}
    >
      {/* Left side sparkling accent */}
      <div
        className="absolute left-0 top-0 w-40 h-full opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 20% 30%, rgba(154, 196, 231, 0.4) 0%, transparent 50%),
                       radial-gradient(circle at 60% 70%, rgba(154, 196, 231, 0.3) 0%, transparent 40%)`,
        }}
      />

      {/* Right side sparkling accent */}
      <div
        className="absolute right-0 top-0 w-40 h-full opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 80% 30%, rgba(154, 196, 231, 0.4) 0%, transparent 50%),
                       radial-gradient(circle at 40% 70%, rgba(154, 196, 231, 0.3) 0%, transparent 40%)`,
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="mb-4 flex justify-center"
          >
            <Image
              src="/assets/cinamoroll_theme/App Logo/App_logo.png"
              alt="Cinnamoroll Expense Tracker"
              width={320}
              height={320}
              className="object-contain"
            />
          </motion.div>
        </div>

        {/* Auth Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-3xl border-2 shadow-lg p-8"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: "#859BB2",
          }}
        >
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab("signin")}
              className={`flex-1 py-3 rounded-2xl font-semibold transition-all duration-200 ${
                tab === "signin" ? "text-white shadow-md" : "text-gray-600"
              }`}
              style={{
                backgroundColor: tab === "signin" ? "#859BB2" : "#E1EDFD",
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`flex-1 py-3 rounded-2xl font-semibold transition-all duration-200 ${
                tab === "signup" ? "text-white shadow-md" : "text-gray-600"
              }`}
              style={{
                backgroundColor: tab === "signup" ? "#859BB2" : "#E1EDFD",
              }}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={tab === "signin" ? handleSignIn : handleSignUp}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border-2 focus:ring-0"
                style={{
                  borderColor: "#E1EDFD",
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl border-2 focus:ring-0 pr-10"
                  style={{
                    borderColor: "#E1EDFD",
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {tab === "signin" && (
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setForgotEmail(email);
                  }}
                  className="text-xs hover:text-[#859BB2] transition-colors"
                  style={{ color: "#859BB2" }}
                >
                  Forgot password?
                </button>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
              style={{
                backgroundColor: "#859BB2",
              }}
            >
              {loading
                ? "Loading..."
                : tab === "signin"
                  ? "Sign In"
                  : "Create Account"}
            </Button>
          </form>

          {/* Help Text */}
          <p className="text-xs text-gray-500 text-center mt-4">
            {tab === "signin"
              ? "Don't have an account? Click Sign Up above"
              : "Already have an account? Click Sign In above"}
          </p>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 p-6 rounded-2xl border-2"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "#859BB2",
              }}
            >
              <div className="flex items-start gap-4">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex-shrink-0"
                >
                  <div
                    className="relative w-16 h-16 rounded-full overflow-hidden border-3"
                    style={{ borderColor: "#859BB2" }}
                  >
                    <Image
                      src="/assets/cinamoroll_theme/status/error.png"
                      alt="Error"
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </motion.div>
                <div className="flex-1">
                  <h3
                    className="font-semibold text-sm mb-1"
                    style={{ color: "#859BB2" }}
                  >
                    {error.code === "email_not_confirmed"
                      ? "Email Not Verified"
                      : error.code === "invalid_credentials"
                        ? "Invalid Credentials"
                        : error.code === "user_already_exists"
                          ? "Email Already Exists"
                          : "Authentication Error"}
                  </h3>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {error.userMessage}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="mt-3 text-xs w-full py-2 rounded-lg transition-all hover:bg-[#E1EDFD]/70"
                style={{ color: "#859BB2" }}
              >
                Dismiss
              </button>
            </motion.div>
          )}

          {/* Email Verification Message */}
          {signUpSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-6 p-4 rounded-2xl border-2"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "#859BB2",
              }}
            >
              <div className="flex items-start gap-3">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex-shrink-0"
                >
                  <Mail size={28} color="#859BB2" />
                </motion.div>
                <div>
                  <h3
                    className="font-semibold text-sm mb-1"
                    style={{ color: "#859BB2" }}
                  >
                    Check Your Email
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    We&apos;ve sent a verification link to{" "}
                    <strong>{email}</strong>. Click the link in the email to
                    confirm your account.
                  </p>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    After verifying, you can sign in with your credentials.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSignUpSuccess(false)}
                className="mt-3 text-xs w-full py-2 rounded-lg transition-all hover:bg-white/50"
                style={{ color: "#859BB2" }}
              >
                Got it, take me back
              </button>
            </motion.div>
          )}

          {/* Forgot Password Modal */}
          {showForgotPassword && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => {
                if (!resetSent) setShowForgotPassword(false);
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="rounded-3xl border-2 shadow-2xl p-8 w-full max-w-md"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderColor: "#859BB2",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {!resetSent ? (
                  <>
                    <h2
                      className="text-2xl font-bold mb-2 text-center"
                      style={{ color: "#859BB2" }}
                    >
                      Reset Password
                    </h2>
                    <p className="text-sm text-gray-600 text-center mb-4">
                      Enter your email address and we&apos;ll send you a link to
                      reset your password.
                    </p>

                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="forgot-email"
                          className="text-gray-700 font-medium"
                        >
                          Email
                        </Label>
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="you@example.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="rounded-xl border-2 focus:ring-0"
                          style={{
                            borderColor: "#E1EDFD",
                          }}
                          required
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          onClick={() => setShowForgotPassword(false)}
                          className="flex-1 py-2 rounded-xl font-semibold"
                          style={{
                            backgroundColor: "#E1EDFD",
                            color: "#859BB2",
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={forgotLoading}
                          className="flex-1 text-white py-2 rounded-xl font-semibold hover:shadow-lg transition-all"
                          style={{
                            backgroundColor: "#859BB2",
                          }}
                        >
                          {forgotLoading ? "Sending..." : "Send Link"}
                        </Button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="text-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="mb-4 flex justify-center"
                    >
                      <Mail size={48} color="#859BB2" />
                    </motion.div>
                    <h2
                      className="text-xl font-bold mb-2"
                      style={{ color: "#859BB2" }}
                    >
                      Check Your Email
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">
                      We&apos;ve sent a password reset link to{" "}
                      <strong>{forgotEmail}</strong>. Click the link in your
                      email to create a new password.
                    </p>
                    <Button
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetSent(false);
                        setForgotEmail("");
                      }}
                      className="w-full text-white py-2 rounded-xl font-semibold"
                      style={{
                        backgroundColor: "#859BB2",
                      }}
                    >
                      Back to Sign In
                    </Button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </motion.div>

        {/* Floating sparkles - varying sizes and positions */}
        {/* Large sparkle - top left */}
        <motion.div
          animate={{
            y: [0, 20, 0],
            opacity: [0.5, 0.9, 0.5],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-20 left-10 w-4 h-4"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "50%",
            boxShadow:
              "0 0 12px rgba(255, 255, 255, 1), 0 0 20px rgba(255, 255, 255, 0.8)",
          }}
        />
        {/* Medium sparkle - top right - PASTEL BLUE */}
        <motion.div
          animate={{
            y: [0, -15, 0],
            opacity: [0.4, 0.8, 0.4],
            scale: [0.9, 1.1, 0.9],
          }}
          transition={{ duration: 3.5, repeat: Infinity }}
          className="absolute top-32 right-20 w-2 h-2"
          style={{
            backgroundColor: "#D4E4F7",
            borderRadius: "50%",
            boxShadow: "0 0 6px rgba(212, 228, 247, 0.7)",
          }}
        />
        {/* Small sparkle - left side - PASTEL BLUE */}
        <motion.div
          animate={{
            y: [0, 25, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [0.7, 1, 0.7],
          }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute left-12 top-1/3 w-1.5 h-1.5"
          style={{
            backgroundColor: "#D4E4F7",
            borderRadius: "50%",
            boxShadow: "0 0 4px rgba(212, 228, 247, 0.6)",
          }}
        />
        {/* Medium sparkle - right side upper - PASTEL BLUE */}
        <motion.div
          animate={{
            y: [0, -18, 0],
            opacity: [0.35, 0.75, 0.35],
            scale: [0.85, 1.15, 0.85],
          }}
          transition={{ duration: 4.5, repeat: Infinity }}
          className="absolute right-16 top-40 w-2 h-2"
          style={{
            backgroundColor: "#D4E4F7",
            borderRadius: "50%",
            boxShadow: "0 0 6px rgba(212, 228, 247, 0.7)",
          }}
        />
        {/* Tiny sparkle - bottom left */}
        <motion.div
          animate={{
            y: [0, 12, 0],
            opacity: [0.4, 0.75, 0.4],
            scale: [0.6, 0.95, 0.6],
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute bottom-32 left-20 w-2 h-2"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "50%",
            boxShadow: "0 0 8px rgba(255, 255, 255, 0.9)",
          }}
        />
        {/* Large sparkle - bottom right */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            opacity: [0.5, 0.9, 0.5],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute bottom-20 right-10 w-4 h-4"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "50%",
            boxShadow:
              "0 0 12px rgba(255, 255, 255, 1), 0 0 20px rgba(255, 255, 255, 0.8)",
          }}
        />
        {/* Small sparkle - right bottom side */}
        <motion.div
          animate={{
            y: [0, 22, 0],
            opacity: [0.4, 0.75, 0.4],
            scale: [0.7, 1, 0.7],
          }}
          transition={{ duration: 3.8, repeat: Infinity }}
          className="absolute right-8 bottom-1/3 w-2 h-2"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "50%",
            boxShadow: "0 0 8px rgba(255, 255, 255, 0.9)",
          }}
        />
        {/* Medium sparkle - left bottom - PASTEL BLUE */}
        <motion.div
          animate={{
            y: [0, -16, 0],
            opacity: [0.35, 0.75, 0.35],
            scale: [0.85, 1.15, 0.85],
          }}
          transition={{ duration: 4.2, repeat: Infinity }}
          className="absolute left-1/4 bottom-24 w-2 h-2"
          style={{
            backgroundColor: "#D4E4F7",
            borderRadius: "50%",
            boxShadow: "0 0 6px rgba(212, 228, 247, 0.7)",
          }}
        />

        {/* Additional sparkles across entire page */}
        {/* Top center - WHITE */}
        <motion.div
          animate={{
            y: [0, 15, 0],
            opacity: [0.3, 0.7, 0.3],
            scale: [0.7, 1.1, 0.7],
          }}
          transition={{ duration: 3.2, repeat: Infinity }}
          className="absolute top-10 left-1/2 transform -translate-x-1/2 w-2.5 h-2.5"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "50%",
            boxShadow: "0 0 10px rgba(255, 255, 255, 0.9)",
          }}
        />
        {/* Upper left area - PASTEL BLUE */}
        <motion.div
          animate={{
            y: [0, -12, 0],
            opacity: [0.35, 0.7, 0.35],
            scale: [0.8, 1.05, 0.8],
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-24 left-1/3 w-1.5 h-1.5"
          style={{
            backgroundColor: "#D4E4F7",
            borderRadius: "50%",
            boxShadow: "0 0 6px rgba(212, 228, 247, 0.8)",
          }}
        />
        {/* Upper right area - WHITE */}
        <motion.div
          animate={{
            y: [0, 18, 0],
            opacity: [0.4, 0.8, 0.4],
            scale: [0.75, 1.15, 0.75],
          }}
          transition={{ duration: 3.5, repeat: Infinity }}
          className="absolute top-16 right-1/3 w-2 h-2"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "50%",
            boxShadow: "0 0 8px rgba(255, 255, 255, 0.95)",
          }}
        />
        {/* Center left - PASTEL BLUE */}
        <motion.div
          animate={{
            y: [0, -14, 0],
            opacity: [0.3, 0.65, 0.3],
            scale: [0.65, 0.95, 0.65],
          }}
          transition={{ duration: 4.5, repeat: Infinity }}
          className="absolute left-16 top-1/2 w-1 h-1"
          style={{
            backgroundColor: "#D4E4F7",
            borderRadius: "50%",
            boxShadow: "0 0 5px rgba(212, 228, 247, 0.7)",
          }}
        />
        {/* Center right - WHITE */}
        <motion.div
          animate={{
            y: [0, 16, 0],
            opacity: [0.35, 0.75, 0.35],
            scale: [0.78, 1.08, 0.78],
          }}
          transition={{ duration: 3.8, repeat: Infinity }}
          className="absolute right-12 top-1/2 w-2.5 h-2.5"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "50%",
            boxShadow: "0 0 10px rgba(255, 255, 255, 0.92)",
          }}
        />
        {/* Lower center - PASTEL BLUE */}
        <motion.div
          animate={{
            y: [0, -18, 0],
            opacity: [0.32, 0.68, 0.32],
            scale: [0.8, 1.1, 0.8],
          }}
          transition={{ duration: 4.3, repeat: Infinity }}
          className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 w-2 h-2"
          style={{
            backgroundColor: "#D4E4F7",
            borderRadius: "50%",
            boxShadow: "0 0 7px rgba(212, 228, 247, 0.75)",
          }}
        />
        {/* Lower left area - WHITE */}
        <motion.div
          animate={{
            y: [0, 20, 0],
            opacity: [0.4, 0.85, 0.4],
            scale: [0.82, 1.12, 0.82],
          }}
          transition={{ duration: 3.6, repeat: Infinity }}
          className="absolute bottom-1/3 left-2/3 w-2.5 h-2.5"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "50%",
            boxShadow: "0 0 10px rgba(255, 255, 255, 0.88)",
          }}
        />
        {/* Lower right area - PASTEL BLUE */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.7, 0.3],
            scale: [0.76, 1.06, 0.76],
          }}
          transition={{ duration: 4.7, repeat: Infinity }}
          className="absolute bottom-10 right-1/3 w-1.5 h-1.5"
          style={{
            backgroundColor: "#D4E4F7",
            borderRadius: "50%",
            boxShadow: "0 0 6px rgba(212, 228, 247, 0.72)",
          }}
        />
        {/* Far left top - WHITE */}
        <motion.div
          animate={{
            y: [0, 16, 0],
            opacity: [0.35, 0.72, 0.35],
            scale: [0.7, 1, 0.7],
          }}
          transition={{ duration: 3.3, repeat: Infinity }}
          className="absolute left-8 top-1/4 w-1.5 h-1.5"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "50%",
            boxShadow: "0 0 7px rgba(255, 255, 255, 0.85)",
          }}
        />
        {/* Far right bottom - PASTEL BLUE */}
        <motion.div
          animate={{
            y: [0, -22, 0],
            opacity: [0.33, 0.73, 0.33],
            scale: [0.82, 1.1, 0.82],
          }}
          transition={{ duration: 4.1, repeat: Infinity }}
          className="absolute right-8 bottom-1/4 w-1.5 h-1.5"
          style={{
            backgroundColor: "#D4E4F7",
            borderRadius: "50%",
            boxShadow: "0 0 6px rgba(212, 228, 247, 0.75)",
          }}
        />
      </motion.div>
    </div>
  );
}

export default AuthPageContent;
