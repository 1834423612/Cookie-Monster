import { Icon } from "@iconify/react";

const steps = [
  {
    number: "01",
    icon: "mdi:download",
    title: "Install The Engine",
    description:
      "Load the extension in Chrome so Cookie Monster gets local permission to read, back up, delete, and restore cookies.",
  },
  {
    number: "02",
    icon: "mdi:web-check",
    title: "Open The Website Console",
    description:
      "Use the website as your main cockpit. It asks the extension for a fresh local scan and renders the domain inventory.",
  },
  {
    number: "03",
    icon: "mdi:cookie-open",
    title: "Choose What To Feed",
    description:
      "Inspect a site, review cookie keys and values, protect trusted domains, and choose a preset meal or hand-picked cookies.",
  },
  {
    number: "04",
    icon: "mdi:backup-restore",
    title: "Delete And Restore Safely",
    description:
      "The extension performs the local cleanup, stores a recycle-bin batch, and lets you restore individual cleanup batches later.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
            A Website-Led Cleanup Loop
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            The playful layer lives on the site. The dangerous layer stays inside the browser
            extension. That split keeps the product intuitive without giving up local control.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-border" />
              )}

              <div className="relative z-10 flex flex-col items-center text-center">
                {/* Step number */}
                <div className="mb-4 relative">
                  <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Icon icon={step.icon} className="w-10 h-10 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {step.number}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
