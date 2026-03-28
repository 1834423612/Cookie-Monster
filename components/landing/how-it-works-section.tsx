import { Icon } from "@iconify/react";

const steps = [
  {
    number: "01",
    icon: "mdi:download",
    title: "Install Extension",
    description:
      "Load the Chrome extension locally in developer mode, then pin Cookie Monster to your toolbar.",
  },
  {
    number: "02",
    icon: "mdi:magnify",
    title: "Scan Cookies",
    description:
      "The extension automatically scans all cookies and classifies them by risk level, type, and domain.",
  },
  {
    number: "03",
    icon: "mdi:chart-box",
    title: "Review Dashboard",
    description:
      "View detailed reports and visualizations in the dashboard. Understand exactly what&apos;s tracking you.",
  },
  {
    number: "04",
    icon: "mdi:delete-sweep",
    title: "Clean Up",
    description:
      "Remove unwanted cookies with smart cleanup. Keep essential cookies, delete tracking ones.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
            How Cookie Monster Works
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            Get started in minutes. Our simple four-step process makes cookie 
            management easy for everyone.
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
