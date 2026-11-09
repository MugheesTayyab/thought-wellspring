import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Logo } from "./Logo";
import { SiteFooter } from "./SiteFooter";

/** Shared layout for the public reading pages (help, guidelines, guides, collections). */
export function ContentPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="flex min-h-11 items-center gap-2 rounded-xl p-1.5 text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            <span className="text-xs font-semibold">Back to Wall</span>
          </Link>
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-serif text-sm font-bold tracking-tight text-ink">BajiHears</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        {intro && (
          <div className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {intro}
          </div>
        )}
        <div className="mt-8">{children}</div>
        <SiteFooter />
      </main>
    </div>
  );
}

export function ContentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="font-serif text-xl font-bold tracking-tight text-ink">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-7 text-foreground/90 sm:text-base">
        {children}
      </div>
    </section>
  );
}
