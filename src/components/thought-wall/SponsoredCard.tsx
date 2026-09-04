import { SPONSORED } from "@/lib/thought-wall";

// MOCKED: sponsored placement comes from a hardcoded object for now.
export function SponsoredCard() {
  return (
    <aside className="border-border/70 bg-secondary/30 rounded-2xl border border-dashed p-5">
      <div className="text-muted-foreground flex items-center justify-between text-[11px] tracking-widest uppercase">
        <span>Sponsored</span>
        <span>{SPONSORED.brand}</span>
      </div>
      <p className="mt-3 text-base leading-snug">{SPONSORED.text}</p>
      <a
        href={SPONSORED.url}
        className="text-primary mt-3 inline-block text-sm font-semibold"
      >
        {SPONSORED.cta} →
      </a>
    </aside>
  );
}
