export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border-border rounded-2xl border p-5">
          <div className="animate-pulse space-y-3">
            <div className="bg-muted h-4 w-11/12 rounded-full" />
            <div className="bg-muted h-4 w-8/12 rounded-full" />
            <div className="flex gap-2 pt-2">
              <div className="bg-muted h-7 w-14 rounded-full" />
              <div className="bg-muted h-7 w-14 rounded-full" />
              <div className="bg-muted h-7 w-14 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
