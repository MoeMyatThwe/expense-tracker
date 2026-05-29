"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CinnamorollLoader } from "@/components/loading-states";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Completing sign in...");

  useEffect(() => {
    let cancelled = false;

    const finishAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error && !cancelled) {
          console.error("OAuth code exchange failed:", error);
          router.replace("/auth");
          return;
        }
      }

      const { data } = await supabase.auth.getSession();

      if (cancelled) {
        return;
      }

      if (data.session?.user) {
        router.replace("/");
        return;
      }

      setMessage("Checking session...");

      const timeout = window.setTimeout(async () => {
        const { data: sessionData } = await supabase.auth.getSession();

        if (cancelled) {
          return;
        }

        if (sessionData.session?.user) {
          router.replace("/");
        } else {
          router.replace("/auth");
        }
      }, 300);

      return () => window.clearTimeout(timeout);
    };

    void finishAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <CinnamorollLoader label={message} />
    </div>
  );
}
