"use client";

import { Icon } from "@iconify/react";

const browsers = [
  {
    name: "Chrome",
    icon: "mdi:google-chrome",
    available: true,
    url: "#chrome",
  },
  {
    name: "Firefox",
    icon: "mdi:firefox",
    available: true,
    url: "#firefox",
  },
  {
    name: "Edge",
    icon: "mdi:microsoft-edge",
    available: true,
    url: "#edge",
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
            Choose your browser below to install the free Cookie Monster extension. 
            Takes less than 10 seconds to get started.
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
                  Coming Soon
                </span>
              )}
              {browser.available && (
                <span className="text-xs text-primary mt-1 flex items-center gap-1">
                  <Icon icon="mdi:download" className="w-3 h-3" />
                  Install
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
                Cookie Monster never uploads your cookie data to any server. All 
                analysis happens locally in your browser. The extension is open 
                source and can be audited by anyone.
              </p>
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              <Icon icon="mdi:github" className="w-4 h-4" />
              View Source
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
