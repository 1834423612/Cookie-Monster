"use client";

import { Icon } from "@iconify/react";

const browsers = [
  {
    name: "Chrome",
    icon: "mdi:google-chrome",
    available: true,
    url: "/docs#chrome-install",
  },
  {
    name: "Firefox",
    icon: "mdi:firefox",
    available: false,
    url: "/docs#roadmap",
  },
  {
    name: "Edge",
    icon: "mdi:microsoft-edge",
    available: false,
    url: "/docs#roadmap",
  },
  {
    name: "Safari",
    icon: "mdi:apple-safari",
    available: false,
    url: "#safari",
  },
];

export function InstallSection() {
  return (
    <section id="install" className="py-20 px-4 sm:px-6 lg:px-8 bg-primary/5">
      <div className="max-w-4xl mx-auto text-center">
        {/* Section header */}
        <div className="mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <Icon icon="mdi:puzzle" className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
            Install Cookie Monster Extension
          </h2>
          <p className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto">
            The current repo ships a Chrome-first MV3 extension. Load it unpacked
            in a minute, then connect the website dashboard to the same local summary report.
          </p>
        </div>

        {/* Browser options */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {browsers.map((browser) => (
            <a
              key={browser.name}
              href={browser.url}
              className={`group relative flex flex-col items-center p-6 rounded-2xl border transition-all ${
                browser.available
                  ? "bg-card border-border hover:border-primary hover:shadow-lg cursor-pointer"
                  : "bg-muted/50 border-border cursor-not-allowed opacity-60"
              }`}
            >
              <Icon
                icon={browser.icon}
                className={`w-12 h-12 mb-3 transition-transform ${
                  browser.available
                    ? "text-foreground group-hover:scale-110"
                    : "text-muted-foreground"
                }`}
              />
              <span className="font-medium text-foreground">{browser.name}</span>
              {!browser.available && (
                <span className="text-xs text-muted-foreground mt-1">
                  Planned
                </span>
              )}
              {browser.available && (
                <span className="text-xs text-primary mt-1 flex items-center gap-1">
                  <Icon icon="mdi:book-open-variant" className="w-3 h-3" />
                  Open Guide
                </span>
              )}
            </a>
          ))}
        </div>

        {/* Privacy notice */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-left">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-chart-3/10 flex items-center justify-center">
                <Icon icon="mdi:shield-check" className="w-6 h-6 text-chart-3" />
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-semibold text-foreground mb-1">
                Privacy Guaranteed
              </h3>
              <p className="text-sm text-muted-foreground">
                Cookie Monster never uploads raw cookie values to any server. The
                extension owns scanning, cleanup, restore, and backups; the website
                only handles imported or bridged summary data.
              </p>
            </div>
            <a
              href="/docs#chrome-install"
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              <Icon icon="mdi:book-open-page-variant" className="w-4 h-4" />
              Install Steps
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
