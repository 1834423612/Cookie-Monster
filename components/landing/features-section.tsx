import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: "mdi:magnify-scan",
    title: "Domain-by-Domain Inspection",
    description:
      "Open any website bucket, inspect exact cookie keys and values, and decide what the monster should eat with full context.",
    bgColor: "bg-primary/10",
    textColor: "text-primary",
  },
  {
    icon: "mdi:shield-lock",
    title: "Local-Only Handling",
    description:
      "The website talks to the installed extension inside the browser. Cookie reads, deletes, and restores happen locally on-device.",
    bgColor: "bg-chart-3/10",
    textColor: "text-chart-3",
  },
  {
    icon: "mdi:delete-sweep",
    title: "Preset Meals And Precision Bites",
    description:
      "Feed preset tracker batches, wipe an entire domain, or select specific cookie keys one by one from the website console.",
    bgColor: "bg-risk-high/10",
    textColor: "text-risk-high",
  },
  {
    icon: "mdi:backup-restore",
    title: "Batch Restore History",
    description:
      "Every cleanup becomes a recycle-bin batch so you can restore a single domain meal or a whole preset if something breaks.",
    bgColor: "bg-secondary/10",
    textColor: "text-secondary",
  },
  {
    icon: "mdi:chart-line",
    title: "Monster-Friendly Visualization",
    description:
      "Risk charts, feed queues, domain leaderboards, and cleanup recommendations make cookie clutter feel understandable and playful.",
    bgColor: "bg-chart-5/10",
    textColor: "text-chart-5",
  },
  {
    icon: "mdi:puzzle",
    title: "Website First, Extension Powered",
    description:
      "The website is where people browse, choose, and act. The extension stays focused on privileged cookie functions and local backups.",
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
            Built Around Feeding, Not Just Deleting
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            Cookie Monster is not just another cleanup utility. It is a playful website-first
            control surface with a serious local extension engine underneath.
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
