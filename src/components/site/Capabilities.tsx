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
                <h2 className="display-xl mt-6 text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.05]">
                  From requirements
                  <br />to working systems.
                </h2>
                <p className="mt-5 max-w-sm leading-relaxed text-graphite-dim">
                  I connect product decisions, data logic, and operational needs. My work includes
                  product requirements, analytics, SQL, reporting, user acceptance testing, and
                  applied AI prototypes.
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
                    className="grid min-w-0 gap-x-8 gap-y-3 border-b border-graphite/20 py-6 sm:grid-cols-[9rem_1fr] sm:py-7"
                  >
                    <dt className="flex items-center gap-3">
                      <Icon className="size-4 shrink-0 text-ember-ink" aria-hidden />
                      <span className="label-eyebrow text-graphite">{group.title}</span>
                    </dt>
                    <dd className="flex min-w-0 flex-wrap gap-x-2 gap-y-1.5">
                      {group.skills.map((skill) => (
                        <span
                          key={skill}
                          className="label-eyebrow max-w-full break-words text-graphite-dim"
                        >
                          {skill}
                          <span className="ml-2.5 text-ember/40" aria-hidden>
                            ·
                          </span>
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
