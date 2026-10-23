import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/client/lib/supabase";
import { getOrCreateIdentity } from "@/client/lib/identity";
import { apiMigrateGuestToAccount } from "@/routes/api/auth";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/client/stores/auth-context";
import { authHeaders } from "@/client/lib/auth-headers";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Authenticating | BajiHears" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { setProfile } = useAuth();
  const [status, setStatus] = useState("Completing sign-in...");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function handleAuthReturn() {
      try {
        const params = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.slice(1));
        if (params.has("error") || hash.has("error")) {
          throw new Error("Sign-in was cancelled or declined. You can try again from Your Corner.");
        }
        // 1. Give supabase a short tick to parse auth hash or exchange tokens
        const { data: sessionData, error } = await supabase.auth.getSession();
        let activeSession = sessionData?.session;

        if (error || !activeSession) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          const retry = await supabase.auth.getSession();
          activeSession = retry.data?.session;
        }

        if (!activeSession) {
          throw new Error("This sign-in link has expired. Please start again from Your Corner.");
        }

        if (mounted) setStatus("Saving your profile...");

        // 2. Read local guest identity
        const identity = getOrCreateIdentity();

        // 3. Call server migration handler
        const result = await apiMigrateGuestToAccount({
          headers: await authHeaders(),
          data: {
            deviceToken: identity.deviceToken,
            handle: identity.handle,
            avatarSeed: identity.avatarSeed,
          },
        });

        if (!result.ok)
          throw new Error("You are signed in, but your profile could not be saved. Please retry.");
        if (mounted) setProfile(result.data.profile);
        window.history.replaceState({}, "", "/auth/callback");
        if (mounted) void navigate({ to: "/corner", replace: true });
      } catch (err) {
        if (mounted) {
          setFailed(true);
          setStatus(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
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
        {!failed && <Loader2 className="size-10 animate-spin text-primary" />}
        <h2 className="font-display text-xl font-bold text-foreground">Welcome to BajiHears</h2>
        <p className="font-vibe text-sm text-muted-foreground">{status}</p>
        {failed && (
          <div className="flex gap-4 text-sm">
            <button onClick={() => window.location.reload()} className="min-h-11 text-primary">
              Retry
            </button>
            <Link to="/corner" className="min-h-11 inline-flex items-center">
              Your Corner
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
