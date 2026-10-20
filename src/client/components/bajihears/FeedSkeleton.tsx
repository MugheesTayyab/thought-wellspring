export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Getting the Wall ready">
      <span className="sr-only">Getting the Wall ready…</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border-border rounded-3xl border p-5" aria-hidden>
          <div className="space-y-3 opacity-70">
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
