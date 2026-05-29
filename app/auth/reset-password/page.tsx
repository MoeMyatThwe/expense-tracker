"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password updated successfully");
      router.push("/auth");
    } finally {
      setLoading(false);
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
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="mb-4 flex justify-center"
          >
            <Image
              src="/assets/cinamoroll_theme/App Logo/App_logo.png"
              alt="Cinnamoroll Expense Tracker"
              width={220}
              height={220}
              className="object-contain"
            />
          </motion.div>
        </div>

        <div
          className="rounded-3xl border-2 shadow-lg p-8"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: "#859BB2",
          }}
        >
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#E1EDFD] text-[#859BB2]">
              <Lock size={24} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "#859BB2" }}>
              Reset Password
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter a new password for your account.
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl border-2 focus:ring-0 pr-10"
                  style={{ borderColor: "#E1EDFD" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className="text-gray-700 font-medium"
              >
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-xl border-2 focus:ring-0 pr-10"
                  style={{ borderColor: "#E1EDFD" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
              style={{ backgroundColor: "#859BB2" }}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/auth")}
              className="w-full rounded-xl border-2 py-3 font-semibold"
            >
              Back to Sign In
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
