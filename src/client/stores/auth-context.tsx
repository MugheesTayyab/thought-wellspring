import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/client/lib/supabase";
import type { DbProfile } from "@/shared/types/profile";
import { apiRefreshProfile } from "@/routes/api/auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authHeaders } from "@/client/lib/auth-headers";
import { embeddedAuthBrowserName, BROWSER_SIGNIN_URL } from "@/client/lib/embedded-browser";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/client/components/ui/dialog";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: DbProfile | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setProfile: (profile: DbProfile | null) => void;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [embeddedBrowser, setEmbeddedBrowser] = useState<string | null>(null);
  const profileEpoch = useRef(0);
  const invalidateProfileRequests = () => {
    profileEpoch.current += 1;
  };

  const fetchProfile = async () => {
    const epoch = profileEpoch.current;
    try {
      const res = await apiRefreshProfile({ headers: await authHeaders() });
      if (epoch === profileEpoch.current && !res.ok) {
        toast.error("Your profile could not load. Try refreshing Your Corner.");
      }
      if (epoch === profileEpoch.current && res.ok && res.data?.profile) {
        setProfile(res.data.profile);
      }
    } catch (err) {
      console.warn("[Auth] Failed to load server profile:", err);
    }
  };

  useEffect(() => {
    let mounted = true;
    let restoredToken: string | null | undefined;
    const restoreSession = (next: Session | null) => {
      if (!mounted || restoredToken === (next?.access_token ?? null)) return;
      restoredToken = next?.access_token ?? null;
      invalidateProfileRequests();
      setSession(next);
      setUser(next?.user ?? null);
      if (next?.access_token) {
        // Supabase auth callbacks hold a lock; start profile work afterwards.
        window.setTimeout(() => {
          if (mounted)
            void fetchProfile().finally(() => {
              if (mounted) setIsLoading(false);
            });
        }, 0);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    };

    // Check active session on mount
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (!mounted) return;
        if (error) toast.error("Your session could not be restored. Please sign in again.");
        restoreSession(initialSession);
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      restoreSession(newSession);
    });

    return () => {
      mounted = false;
      invalidateProfileRequests();
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (typeof window === "undefined") return;
    const embedded = embeddedAuthBrowserName(window.navigator.userAgent);
    if (embedded) {
      setEmbeddedBrowser(embedded);
      return;
    }
    try {
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (error) toast.error("Sign-in could not start. Please try again.");
    } catch {
      toast.error("Sign-in could not start. Check your connection and try again.");
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        toast.error("Sign-out failed. Please try again.");
        return;
      }
      setSession(null);
      setUser(null);
      setProfile(null);
      queryClient.clear();
    } catch {
      toast.error("Sign-out failed. Check your connection and try again.");
    }
  };

  const refreshProfileManual = async () => {
    if (session?.access_token) {
      await fetchProfile();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signInWithGoogle,
        signOut,
        setProfile,
        refreshProfile: refreshProfileManual,
      }}
    >
      {children}
      <Dialog
        open={embeddedBrowser !== null}
        onOpenChange={(open) => {
          if (!open) setEmbeddedBrowser(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogTitle>Open BajiHears in your browser</DialogTitle>
          <DialogDescription>
            For Google sign-in, open {embeddedBrowser}&apos;s menu and choose Open in browser. You
            can keep reading and post anonymously here.
          </DialogDescription>
          <button
            type="button"
            className="tap-44 rounded-xl bg-coral px-4 text-sm font-semibold text-white"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(BROWSER_SIGNIN_URL);
                toast.success("Browser link copied.");
              } catch {
                toast.error("Copy the link below, then open it in Chrome or Safari.");
              }
            }}
          >
            Copy browser link
          </button>
          <input
            aria-label="Browser link"
            type="url"
            readOnly
            value={BROWSER_SIGNIN_URL}
            className="w-full min-w-0 rounded-xl border border-border bg-secondary px-3 py-2 text-xs"
          />
          <button
            type="button"
            className="tap-44 rounded-xl border border-border px-4 text-sm"
            onClick={() => setEmbeddedBrowser(null)}
          >
            Continue reading
          </button>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
