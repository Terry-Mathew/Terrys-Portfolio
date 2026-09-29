import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { SelectedWork } from "@/components/site/SelectedWork";
import { About } from "@/components/site/About";
import { Experience } from "@/components/site/Experience";
import { Capabilities } from "@/components/site/Capabilities";
import { Experiments } from "@/components/site/Experiments";
import { OffTheClock } from "@/components/site/OffTheClock";
import { Contact } from "@/components/site/Contact";

// Placeholder RAG chat UI — lazy, closed by default, zero impact on current layout.
const ChatWidget = lazy(() =>
  import("@/components/site/ChatWidget").then((m) => ({ default: m.ChatWidget })),
);

const title = "Terry Mathew — Product, Data, AI & Systems";
const description =
  "I build things around complicated problems. Product, data, AI and systems work, independent experiments and life off the clock.";

export const Route = createFileRoute("/")({
  head: () => ({
    // og:image / twitter:image are owned by the root route so the share card is
    // defined in exactly one place.
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="bg-ink">
      {/* Placeholder person schema — same data as before, no visual change. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: "Terry Mathew",
            jobTitle: "Product, Data & AI Builder",
            email: "mailto:terry.perangat@gmail.com",
            sameAs: [
              "https://www.linkedin.com/in/terry-mathew",
              "https://www.instagram.com/teddsy/",
              "https://www.youtube.com/@terrymathew-p",
            ],
          }),
        }}
      />
      <Nav />
      <Hero />
      <Experiments />
      <About />
      <Experience />
      <SelectedWork />
      <Capabilities />
      <OffTheClock />
      <Contact />
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </main>
  );
}
