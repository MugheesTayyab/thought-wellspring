import { Link } from "@tanstack/react-router";
import { COLLECTIONS } from "@/shared/constants/collections";
import { GUIDES } from "@/shared/content/guides";

const linkClass = "transition hover:text-foreground";

// Ordinary links, so every public page is reachable by crawlers from every other page.
export function SiteFooter() {
  return (
    <footer className="mt-8 space-y-4 border-t border-border/60 pb-2 pt-5 text-xs text-muted-foreground">
      <nav aria-label="Browse by theme">
        <p className="mb-1.5 font-semibold text-foreground">Browse by theme</p>
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {COLLECTIONS.map((collection) => (
            <li key={collection.slug}>
              <Link to="/wall/$slug" params={{ slug: collection.slug }} className={linkClass}>
                {collection.category}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <nav aria-label="About BajiHears">
        <ul className="flex flex-wrap gap-x-3 gap-y-1 font-medium">
          {GUIDES.length > 0 && (
            <li>
              <Link to="/guides" className={linkClass}>
                Guides
              </Link>
            </li>
          )}
          <li>
            <Link to="/about" className={linkClass}>
              About
            </Link>
          </li>
          <li>
            <Link to="/guidelines" className={linkClass}>
              Community Guidelines
            </Link>
          </li>
          <li>
            <Link to="/help" className={linkClass}>
              Get Help
            </Link>
          </li>
          <li>
            <Link to="/contact" className={linkClass}>
              Contact
            </Link>
          </li>
          <li>
            <Link to="/privacy" className={linkClass}>
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link to="/terms" className={linkClass}>
              Terms of Service
            </Link>
          </li>
        </ul>
      </nav>
      <p>&copy; {new Date().getFullYear()} BajiHears</p>
    </footer>
  );
}
