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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[360px] rounded-3xl border border-white/12 bg-gradient-to-b from-[#1f1712]/95 via-[#17110D]/95 to-[#100b08]/98 p-5 text-[#F5EFE9] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl max-h-[88vh] overflow-y-auto no-scrollbar animate-[scaleUp_0.18s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-[#9C8F87]">
            <Flame className="size-3 text-[#E8552E]" />
            <span className="font-sans text-[11px] font-semibold uppercase tracking-wider">
              Public Corner
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-full text-[#9C8F87] hover:text-[#F5EFE9] transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#9C8F87] animate-pulse font-sans">
            Opening public corner…
          </div>
        ) : profile ? (
          <div className="pt-4 space-y-4">
            {/* Profile Hero Header */}
            <div className="text-center">
              <div className="relative inline-block">
                <CornerAvatar seed={String(profile.avatarSeed)} size={72} />
                <span className="absolute bottom-0 right-0 size-3.5 rounded-full bg-emerald-500 ring-2 ring-[#17110D]" />
              </div>

              <h3 className="mt-2.5 font-display text-xl font-bold tracking-tight text-[#F5EFE9]">
                @{profile.handle}
              </h3>

              <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-[#9C8F87]">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                <span className="font-sans font-medium text-[11px]">
                  Verified Baji Member
                </span>
                <span>•</span>
                <span className="font-mono text-[11px] text-[#E8552E] font-semibold">
                  {tier.name}
                </span>
              </div>
            </div>

            {/* Stat Badges Grid */}
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2.5">
                <p className="text-[10px] text-[#9C8F87] uppercase">Streak</p>
                <p className="text-sm font-bold text-[#F5EFE9] mt-0.5">
                  {profile.visitStreak}d 🔥
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2.5">
                <p className="text-[10px] text-[#9C8F87] uppercase">Thoughts</p>
                <p className="text-sm font-bold text-[#F5EFE9] mt-0.5">
                  {posts.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2.5">
                <p className="text-[10px] text-[#9C8F87] uppercase">Likes</p>
                <p className="text-sm font-bold text-[#E8552E] mt-0.5">
                  {compactCount(totalLikes)}
                </p>
              </div>
            </div>

            {/* Gift Warmth Action Button */}
            <button
              type="button"
              onClick={handleGiftWarmth}
              disabled={totalWarmth < 10 || gifted}
              className={`w-full py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
                gifted
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-brand-gradient text-white hover:opacity-95 disabled:opacity-40"
              }`}
            >
              <Gift className="size-3.5" />
              <span>
                {gifted ? "10 Warmth Gifted! 🔥" : "Send 10 Warmth to @author 🔥"}
              </span>
            </button>

            {/* Published Thoughts Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
                <span className="text-[11px] font-bold text-[#9C8F87] uppercase tracking-wider font-mono">
                  Thoughts on The Wall ({posts.length})
                </span>
              </div>

              {posts.length === 0 ? (
                <p className="py-4 text-center text-xs text-[#9C8F87] font-sans">
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
                        className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 text-left font-sans transition-all hover:bg-white/[0.04]"
                      >
                        <p className="font-quote text-xs text-[#F5EFE9] leading-relaxed line-clamp-3">
                          &ldquo;{post.text}&rdquo;
                        </p>

                        <div className="mt-2 flex items-center justify-between text-[11px] text-[#9C8F87] font-mono">
                          <span className="text-[#E8552E] font-medium">
                            #{post.category.toLowerCase().replace(/\s+/g, "")}
                          </span>

                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center gap-1 text-rose-400 font-semibold">
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
          <div className="py-8 text-center text-xs text-[#9C8F87] font-sans">
            Unable to load profile. This member may have chosen total anonymity.
          </div>
        )}
      </div>
    </div>
  );
}
