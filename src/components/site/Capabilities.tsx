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
      className="paper-texture relative bg-paper-2 px-5 py-24 text-graphite md:px-10 md:py-32"
    >
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <Reveal>
                <SectionLabel tone="light">Capabilities</SectionLabel>
                <h2 className="display-xl mt-6 text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.05]">
                  Different skills.
                  <br />A connected way
                  <br />
                  of thinking.
                </h2>
                <p className="mt-6 max-w-sm leading-relaxed text-graphite-dim">
                  The value is rarely in one discipline. It is in the seams between them — where the
                  product decision, the data model, and the thing people actually need to do line
                  up.
                </p>
              </Reveal>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="grid gap-px bg-graphite/15 sm:grid-cols-2">
              {capabilityGroups.map((group, i) => {
                const Icon = ICONS[group.icon];
                return (
                  <Reveal key={group.title} delay={i * 70} className="bg-paper-2 p-8 md:p-10">
                    <div className="flex items-center gap-3">
                      <Icon className="size-5 shrink-0 text-ember" aria-hidden />
                      <h3 className="display-xl text-2xl text-graphite md:text-3xl">
                        {group.title}
                      </h3>
                    </div>
                    <ul className="mt-6 flex flex-wrap gap-x-2 gap-y-2">
                      {group.skills.map((skill) => (
                        <li
                          key={skill}
                          className="label-eyebrow rounded-full border border-graphite/20 px-3 py-1.5 text-graphite-dim transition-colors hover:border-ember/60 hover:text-graphite"
                        >
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
