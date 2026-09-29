import { useEffect, useState } from "react";
import portraitSide from "@/assets/portrait-side.png";
import mountains from "@/assets/hero-mountains.jpg";
import { profile } from "@/content/site";
import { useSmoothPointer } from "@/lib/motion-hooks";

export function Hero() {
  const p = useSmoothPointer();
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScroll(Math.min(1, window.scrollY / Math.max(1, window.innerHeight)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // mx/my = pointer travel in px, s = scroll travel in px
  const layer = (mx: number, my: number, s: number) => ({
    transform: `translate3d(${p.x * mx}px, ${p.y * my + scroll * s}px, 0)`,
  });

  return (
    <section
      id="top"
      data-tone="dark"
      className="film-grain relative isolate min-h-[100svh] overflow-hidden bg-ink"
    >
      {/* L1 background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: "radial-gradient(90% 80% at 55% 35%, var(--ink-3) 0%, var(--ink) 70%)",
          transform: `translate3d(0, ${scroll * 14}px, 0)`,
        }}
      />

      {/* L2 seamless cinematic landscape window, right side (desktop) */}
      <div
        className="pointer-events-none absolute top-0 right-0 z-0 hidden h-full w-[40vw] max-w-[640px] lg:block 2xl:w-[36vw] 2xl:max-w-[760px] min-[1920px]:max-w-[820px]"
        style={layer(5, 4, -50)}
      >
        <img
          src={mountains}
          alt=""
          width={704}
          height={1408}
          className="h-full w-full object-cover opacity-75 2xl:opacity-65 min-[1920px]:opacity-55"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.06) 12%, rgba(0,0,0,0.2) 24%, rgba(0,0,0,0.45) 38%, rgba(0,0,0,0.72) 54%, rgba(0,0,0,0.92) 72%, #000 88%), linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, #000 26%, #000 70%, rgba(0,0,0,0.35) 88%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.06) 12%, rgba(0,0,0,0.2) 24%, rgba(0,0,0,0.45) 38%, rgba(0,0,0,0.72) 54%, rgba(0,0,0,0.92) 72%, #000 88%), linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, #000 26%, #000 70%, rgba(0,0,0,0.35) 88%, transparent 100%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        />
      </div>

      {/* L2 very large screens: gentle ink veil so the window never dominates */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[12vw] bg-gradient-to-l from-ink/60 to-transparent min-[1920px]:block" />

      {/* L2 mobile/tablet — faint atmospheric mountains, top-right */}
      <div className="pointer-events-none absolute top-0 right-0 z-0 h-[62svh] w-[85vw] md:h-[72svh] md:w-[62vw] lg:hidden">
        <img
          src={mountains}
          alt=""
          width={704}
          height={1408}
          className="h-full w-full object-cover opacity-30 md:opacity-40"
          style={{
            maskImage:
              "radial-gradient(90% 75% at 85% 40%, #000 0%, rgba(0,0,0,0.5) 45%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(90% 75% at 85% 40%, #000 0%, rgba(0,0,0,0.5) 45%, transparent 80%)",
          }}
        />
      </div>

      {/* L2b warm ambient sunset glow behind the silhouette */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(70%_36%_at_50%_82%,color-mix(in_oklab,var(--ember)_14%,transparent)_0%,transparent_72%)] lg:bg-[radial-gradient(48%_46%_at_62%_62%,color-mix(in_oklab,var(--ember)_16%,transparent)_0%,transparent_70%)]"
        style={{ transform: `translate3d(0, ${scroll * -20}px, 0)` }}
      />

      {/* L3 portrait — wide side profile, bleeding off the bottom */}
      <div
        className="pointer-events-none absolute bottom-0 left-[calc(50vw-38svh)] z-10 hidden h-[64svh] lg:block"
        style={layer(-15, -12, -30)}
      >
        <img
          src={portraitSide}
          alt="Terry Mathew"
          fetchPriority="high"
          width={1672}
          height={941}
          decoding="async"
          className="h-full w-auto max-w-none"
        />
      </div>

      {/* Header readability scrim — keeps nav, Resume and Let's Talk crisp */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[26svh] bg-gradient-to-b from-ink/90 via-ink/50 to-transparent" />

      <div className="relative mx-auto flex min-h-[100svh] max-w-[1600px] flex-col justify-end px-5 pt-28 pb-12 md:px-10 lg:justify-center lg:pb-16">
        {/* L5 giant type — sits beneath portrait in z, typographic block ~42% */}
        <div className="relative z-[5] lg:w-[46%]" style={layer(8, 6, -110)}>
          <p className="label-eyebrow text-bone-dim">{profile.role}</p>
          <h1 className="display-xl mt-4 text-[clamp(4rem,11.5vw,12rem)] leading-[0.82]">
            <span className="block text-bone">Terry</span>
            <span className="block text-bone-dim">Mathew</span>
          </h1>
        </div>

        {/* Text that must stay readable above the portrait */}
        <div className="relative z-20 mt-7 max-w-md" style={layer(8, 6, -110)}>
          <p className="font-editorial text-[clamp(1.05rem,1.5vw,1.3rem)] leading-[1.5] text-bone">
            {profile.statement}
          </p>
          <p className="mt-4 max-w-sm text-[0.95rem] leading-[1.7] text-bone-dim">
            {profile.background}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <a
              href="#experiments"
              className="link-arrow label-eyebrow text-bone transition-colors hover:text-ember"
            >
              <span className="grid size-10 place-items-center rounded-full border border-bone/40">
                ↓
              </span>
              Explore my work
            </a>
            <a
              href={profile.resume}
              className="link-arrow label-eyebrow text-bone-dim transition-colors hover:text-ember"
            >
              View resume <span className="arrow">↗</span>
            </a>
          </div>
        </div>

        {/* Mobile portrait, recomposed */}
        <div className="relative -mx-5 mt-8 lg:hidden">
          <img
            src={portraitSide}
            alt="Terry Mathew"
            loading="lazy"
            decoding="async"
            width={1672}
            height={941}
            className="mx-auto w-full max-w-md object-contain"
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-ink to-transparent" />
    </section>
  );
}
