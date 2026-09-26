import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/client/lib/supabase";
import { getOrCreateIdentity } from "@/client/lib/identity";
import { apiMigrateGuestToAccount } from "@/routes/api/auth";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/client/stores/auth-context";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Authenticating — BajiHears" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { setProfile } = useAuth();
  const [status, setStatus] = useState("Securing your whispers...");

  useEffect(() => {
    let mounted = true;

    async function handleAuthReturn() {
      try {
        // 1. Give supabase a short tick to parse auth hash or exchange tokens
        const { data: sessionData, error } = await supabase.auth.getSession();
        let activeSession = sessionData?.session;

        if (error || !activeSession) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          const retry = await supabase.auth.getSession();
          activeSession = retry.data?.session;
        }

        if (!activeSession) {
          if (mounted) navigate({ to: "/" });
          return;
        }

        if (mounted) setStatus("Linking your anonymous tea & badges...");

        // 2. Read local guest identity
        const identity = getOrCreateIdentity();

        // 3. Call server migration handler
        const result = await apiMigrateGuestToAccount({
          data: {
            deviceToken: identity.deviceToken,
            handle: identity.handle,
            avatarSeed: identity.avatarSeed,
            jwt: activeSession.access_token,
          },
        });

        if (result.success && result.data?.profile) {
          setProfile(result.data.profile);
        }
      } catch (err) {
        console.error("[Auth Callback] Migration error:", err);
      } finally {
        if (mounted) {
          navigate({ to: "/" });
        }
      }
    }

    handleAuthReturn();

    return () => {
      mounted = false;
    };
  }, [navigate, setProfile]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center gap-4 max-w-sm rounded-3xl border border-white/10 bg-card/60 p-8 shadow-2xl backdrop-blur-xl">
        <Loader2 className="size-10 animate-spin text-primary" />
        <h2 className="font-display text-xl font-bold text-foreground">Welcome to BajiHears</h2>
        <p className="font-vibe text-sm text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
