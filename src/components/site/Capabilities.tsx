import { BrainCircuit, ChartNoAxesColumnIncreasing, Boxes, Package } from "lucide-react";
import { capabilityGroups } from "@/content/expertise";
import { Reveal, SectionLabel } from "./Reveal";

// Declared as data in expertise.ts so the string names are part of the exported
// contract; resolved here so only this component knows about icon components.
const ICONS = {
  package: Package,
  chart: ChartNoAxesColumnIncreasing,
  brain: BrainCircuit,
  boxes: Boxes,
} as const;

export function Capabilities() {
  return (
    <section
      id="capabilities"
      data-tone="light"
      className="paper-texture relative bg-paper-2 section-reading-padding px-5 text-graphite md:px-10"
    >
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <div className="grid gap-10 sm:gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-4">
            <div className="reading-sticky">
              <Reveal>
                <SectionLabel tone="light">Capabilities</SectionLabel>
                <h2 className="display-xl capabilities-heading mt-6 leading-[var(--leading-display-capability)]">
                  What I work with
                </h2>
                <p className="mt-6 max-w-[30ch] leading-relaxed text-graphite-dim">
                  My work brings analytics, business operations, and people together to solve
                  practical problems. I also explore emerging technologies through independent
                  projects.
                </p>
              </Reveal>
            </div>
          </div>

          <div className="lg:col-span-8">
            <dl className="border-t border-graphite/20">
              {capabilityGroups.map((group, i) => {
                const Icon = ICONS[group.icon];
                return (
                  <Reveal
                    key={group.title}
                    delay={i * 70}
                    className="grid min-w-0 gap-x-8 gap-y-4 border-b border-graphite/20 py-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:py-6"
                  >
                    <dt className="flex min-w-0 items-center gap-3 sm:items-start sm:pt-1">
                      <Icon className="size-4 shrink-0 text-ember-ink" aria-hidden />
                      <span className="label-eyebrow text-graphite">{group.title}</span>
                    </dt>
                    <dd className="flex min-w-0 flex-wrap gap-x-5 gap-y-2 sm:gap-x-6 sm:gap-y-3">
                      {group.skills.map((skill) => (
                        <span
                          key={skill}
                          className="font-sans capability-skill whitespace-nowrap text-graphite-dim"
                        >
                          {skill}
                        </span>
                      ))}
                    </dd>
                  </Reveal>
                );
              })}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
