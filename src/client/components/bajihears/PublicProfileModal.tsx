import { useEffect, useState } from "react";
import { X, Sparkles, Flame, CheckCircle2, Gift, MessageCircle, Heart, Share2, Award } from "lucide-react";
import { CornerAvatar } from "./CornerAvatar";
import { apiFetchPublicProfile } from "@/routes/api/wall";
import { getTier, compactCount, relativeTime, stripHandle } from "@/shared/utils";
import { triggerHaptic } from "@/client/lib/haptics";
import { useWarmth } from "@/client/stores/warmth-context";
import type { Unsaid } from "@/shared/types/unsaid";

export interface PublicProfileModalProps {
  identifier: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileData {
  id: string;
  handle: string;
  avatarSeed: number;
  memberSince: string;
  visitStreak: number;
  warmthTotal: number;
  totalActions: number;
}

export function PublicProfileModal({
  identifier,
  isOpen,
  onClose,
}: PublicProfileModalProps) {
  const { totalWarmth, spendWarmth, awardWarmth } = useWarmth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Unsaid[]>([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [gifted, setGifted] = useState(false);

  useEffect(() => {
    if (!isOpen || !identifier) return;

    let mounted = true;
    setLoading(true);
    setGifted(false);

    apiFetchPublicProfile({ data: { identifier } })
      .then((res) => {
        if (!mounted) return;
        if (res.ok && res.data) {
          setProfile(res.data.profile);
          setPosts(res.data.posts);
          setTotalLikes(res.data.totalLikesReceived);
        } else {
          setProfile(null);
          setPosts([]);
        }
      })
      .catch((err) => {
        console.error("[PublicProfile] Failed to fetch:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, identifier]);

  if (!isOpen || !identifier) return null;

  const tier = profile ? getTier(profile.warmthTotal) : getTier(0);

  const handleGiftWarmth = () => {
    if (totalWarmth < 10 || gifted) return;
    triggerHaptic("celebration");
    spendWarmth(10, `Gifted 10 Warmth to @${profile?.handle || identifier}`);
    setGifted(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[360px] rounded-3xl border border-border-card bg-card p-5 text-foreground shadow-[0_20px_50px_-15px_rgba(62,43,38,0.2)] max-h-[88vh] overflow-y-auto no-scrollbar animate-[scaleUp_0.18s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame className="size-3.5 text-primary" />
            <span className="font-sans text-[11px] font-semibold uppercase tracking-wider">
              Public Corner
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground animate-pulse font-sans">
            Opening public corner…
          </div>
        ) : profile ? (
          <div className="pt-4 space-y-4">
            {/* Profile Hero Header */}
            <div className="text-center">
              <div className="relative inline-block">
                <CornerAvatar seed={String(profile.avatarSeed)} size={72} />
                <span className="absolute bottom-0 right-0 size-3.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>

              <h3 className="mt-2.5 font-display text-xl font-bold tracking-tight text-foreground">
                @{profile.handle}
              </h3>

              <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                <span className="font-sans font-medium text-[11px]">
                  Verified Baji Member
                </span>
                <span>•</span>
                <span className="font-sans text-[11px] text-primary font-semibold">
                  {tier.name}
                </span>
              </div>
            </div>

            {/* Stat Badges Grid */}
            <div className="grid grid-cols-3 gap-2 text-center font-sans">
              <div className="rounded-2xl border border-border-card bg-secondary/50 p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Visits</p>
                <p className="text-sm font-bold text-foreground mt-0.5 tabular-nums">
                  {profile.visitStreak}d
                </p>
              </div>

              <div className="rounded-2xl border border-border-card bg-secondary/50 p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Thoughts</p>
                <p className="text-sm font-bold text-foreground mt-0.5 tabular-nums">
                  {posts.length}
                </p>
              </div>

              <div className="rounded-2xl border border-border-card bg-secondary/50 p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Reactions</p>
                <p className="text-sm font-bold text-primary mt-0.5 tabular-nums">
                  {compactCount(totalLikes)}
                </p>
              </div>
            </div>

            {/* Gift Ember Action Button */}
            <button
              type="button"
              onClick={handleGiftWarmth}
              disabled={totalWarmth < 10 || gifted}
              className={`w-full min-h-11 py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold transition-all shadow-xs active:scale-[0.98] cursor-pointer ${
                gifted
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
              }`}
            >
              <Gift className="size-3.5" />
              <span>
                {gifted ? "10 Ember sent" : "Send 10 Ember to author"}
              </span>
            </button>

            {/* Published Thoughts Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-sans">
                  Thoughts on The Wall ({posts.length})
                </span>
              </div>

              {posts.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground font-sans">
                  No public thoughts posted yet.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
                  {posts.map((post) => {
                    const postLikes =
                      (post.reactions.heart || 0) +
                      (post.reactions.fire || 0) +
                      (post.reactions.hug || 0) +
                      (post.reactions.sad || 0);

                    return (
                      <div
                        key={post.id}
                        className="rounded-2xl border border-border-card bg-secondary/30 p-3 text-left font-sans transition-all hover:bg-secondary/60"
                      >
                        <p className="font-serif text-[13px] text-foreground leading-relaxed line-clamp-3">
                          &ldquo;{post.text}&rdquo;
                        </p>

                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground font-sans">
                          <span className="text-primary font-medium">
                            #{post.category.toLowerCase().replace(/\s+/g, "")}
                          </span>

                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center gap-1 text-primary font-semibold tabular-nums">
                              <Heart className="size-3 fill-current" />
                              <span>{postLikes}</span>
                            </span>
                            <span>{relativeTime(post.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-muted-foreground font-sans">
            Unable to load profile. This member may have posted anonymously.
          </div>
        )}
      </div>
    </div>
  );
}
