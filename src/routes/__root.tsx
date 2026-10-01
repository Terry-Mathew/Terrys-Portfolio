import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { SITE_URL } from "@/content/site";
import { reportError } from "../lib/error-reporting";

function NotFoundComponent() {
  return (
    <div
      id="main"
      data-skip-target
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-background px-4"
    >
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div
      id="main"
      data-skip-target
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-background px-4"
    >
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    const image = SITE_URL ? `${SITE_URL}/og-image.png` : "/og-image.png";
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "Terry Mathew" },
        { name: "description", content: "Product, data, AI and systems." },
        { name: "author", content: "Terry Mathew" },
        { property: "og:type", content: "website" },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: "Terry Mathew — Product, Data, AI & Systems" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
        { name: "theme-color", content: "#090b0b" },
      ],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..600&family=Caveat:wght@400..700&family=Inter+Tight:wght@300..700&display=swap",
        },
        { rel: "icon", href: "/icon-192.png", type: "image/png", sizes: "192x192" },
        { rel: "icon", href: "/icon-512.png", type: "image/png", sizes: "512x512" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // `suppressHydrationWarning` on the <html> below is required, not cosmetic.
  // The inline script in <head> adds `class="js"` to that element while the
  // document is still parsing, so by the time React hydrates, the DOM attribute
  // no longer matches what JSX declared, and React logs "some attributes of the
  // server rendered HTML didn't match" on every page load. The attribute is
  // correct — it is what gates the reveal stylesheet — so the warning is
  // reporting an intentional mutation whose cause it cannot see. It is scoped to
  // that single element; everything below it is still checked.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Must be a parser-blocking inline script in <head>. It sets the class
          that [data-reveal]'s hidden state in styles.css is gated on, so the
          hidden state is only ever applied when something can undo it.

          React reorders HeadContent's links ahead of this element, so it is not
          actually first in <head> — and it does not need to be. Body content is
          parsed after every head script has run, so no revealed element exists
          until the class is set, and the stylesheet is render-blocking besides.
          Without this script the hidden state is never applied at all, which is
          what keeps the page fully readable with JavaScript unavailable.
        */}
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
        <HeadContent />
      </head>
      <body>
        <a
          href="#main"
          data-skip-link
          className="label-eyebrow sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-70 focus:rounded-full focus:bg-ember focus:px-5 focus:py-3 focus:text-ink"
        >
          Skip to content
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
