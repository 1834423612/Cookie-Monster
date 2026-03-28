"use client";

import { Icon } from "@iconify/react";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Icon icon="mdi:shield-check" className="w-4 h-4" />
            <span>Privacy-first cookie management</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance mb-6">
            Take Control of Your
            <span className="text-primary"> Browser Cookies</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty">
            Cookie Monster helps you analyze, manage, and delete browser cookies 
            with complete privacy. All data processing happens locally in your browser.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a
              href="#install"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl text-base font-medium hover:bg-primary/90 transition-all hover:scale-105"
            >
              <Icon icon="mdi:puzzle" className="w-5 h-5" />
              Install Free Extension
            </a>
            <a
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-muted text-foreground px-8 py-3 rounded-xl text-base font-medium hover:bg-muted/80 transition-all"
            >
              <Icon icon="mdi:chart-bar" className="w-5 h-5" />
              View Demo Dashboard
            </a>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Icon icon="mdi:check-circle" className="w-5 h-5 text-chart-3" />
              <span>100% Free & Open Source</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon icon="mdi:lock" className="w-5 h-5 text-chart-3" />
              <span>No Data Collection</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon icon="mdi:lightning-bolt" className="w-5 h-5 text-chart-3" />
              <span>Fast & Lightweight</span>
            </div>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="mt-16 relative">
          <div className="relative max-w-5xl mx-auto">
            {/* Browser mockup */}
            <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
              {/* Browser chrome */}
              <div className="bg-muted px-4 py-3 flex items-center gap-2 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-risk-high/60" />
                  <div className="w-3 h-3 rounded-full bg-risk-medium/60" />
                  <div className="w-3 h-3 rounded-full bg-chart-3/60" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-background rounded-lg px-4 py-1.5 text-sm text-muted-foreground flex items-center gap-2 max-w-md mx-auto">
                    <Icon icon="mdi:lock" className="w-4 h-4" />
                    <span>cookie-monster.app/dashboard</span>
                  </div>
                </div>
              </div>

              {/* Dashboard preview */}
              <div className="p-6 bg-background">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Stat cards */}
                  <div className="bg-muted/50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon icon="mdi:cookie" className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">2,847</p>
                        <p className="text-sm text-muted-foreground">Total Cookies</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-risk-high/10 flex items-center justify-center">
                        <Icon icon="mdi:alert-circle" className="w-5 h-5 text-risk-high" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">156</p>
                        <p className="text-sm text-muted-foreground">High Risk</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                        <Icon icon="mdi:web" className="w-5 h-5 text-chart-3" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">183</p>
                        <p className="text-sm text-muted-foreground">Domains</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart placeholder */}
                <div className="bg-muted/30 rounded-xl p-4 h-48 flex items-center justify-center">
                  <div className="flex items-end gap-2 h-32">
                    {[65, 45, 80, 35, 90, 55, 70, 40, 85, 50, 75, 60].map((height, i) => (
                      <div
                        key={i}
                        className="w-6 rounded-t-md bg-primary/60 transition-all hover:bg-primary"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 bg-card rounded-xl shadow-lg border border-border p-4 hidden lg:flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-chart-3/20 flex items-center justify-center">
                <Icon icon="mdi:shield-check" className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Secure Analysis</p>
                <p className="text-xs text-muted-foreground">All local, no uploads</p>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-4 bg-card rounded-xl shadow-lg border border-border p-4 hidden lg:flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Icon icon="mdi:delete-sweep" className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Quick Cleanup</p>
                <p className="text-xs text-muted-foreground">Remove 847 tracking cookies</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
