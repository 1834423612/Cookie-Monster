import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: "mdi:magnify-scan",
    title: "Deep Cookie Analysis",
    description:
      "Scan and analyze all cookies across your browser with detailed risk classification, expiry tracking, and domain grouping.",
    bgColor: "bg-primary/10",
    textColor: "text-primary",
  },
  {
    icon: "mdi:shield-lock",
    title: "Privacy Focused",
    description:
      "All analysis happens locally in your browser. No cookie data ever leaves your device. We never see your browsing history.",
    bgColor: "bg-chart-3/10",
    textColor: "text-chart-3",
  },
  {
    icon: "mdi:delete-sweep",
    title: "Smart Cleanup",
    description:
      "Intelligently remove tracking cookies, expired cookies, and unnecessary data while preserving essential site functionality.",
    bgColor: "bg-risk-high/10",
    textColor: "text-risk-high",
  },
  {
    icon: "mdi:backup-restore",
    title: "Safe Restore",
    description:
      "Made a mistake? Our recycle bin keeps deleted cookies safe for easy restoration. Never lose important session data again.",
    bgColor: "bg-secondary/10",
    textColor: "text-secondary",
  },
  {
    icon: "mdi:chart-line",
    title: "Visual Reports",
    description:
      "Beautiful charts and visualizations help you understand your cookie landscape at a glance. Export reports for records.",
    bgColor: "bg-chart-5/10",
    textColor: "text-chart-5",
  },
  {
    icon: "mdi:puzzle",
    title: "Extension + Dashboard",
    description:
      "Powerful browser extension for real-time management, plus a beautiful web dashboard for detailed analysis and reports.",
    bgColor: "bg-chart-1/10",
    textColor: "text-chart-1",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
            Everything You Need to Manage Cookies
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            A complete toolkit for analyzing, managing, and protecting your browser 
            privacy without compromising your browsing experience.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-shadow group"
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform",
                  feature.bgColor
                )}
              >
                <Icon
                  icon={feature.icon}
                  className={cn("w-6 h-6", feature.textColor)}
                />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
