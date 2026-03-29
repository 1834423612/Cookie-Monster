"use client";

import { Icon } from "@iconify/react";

const monsterStats = [
  { label: "Feedable Cookies", value: "1,310", hint: "Low-regret bites in a sample scan" },
  { label: "Protected Domains", value: "12", hint: "Trusted websites kept out of danger" },
  { label: "Recycle Bin Batches", value: "8", hint: "Every cleanup stays reversible" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(30,111,217,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(183,121,31,0.22),transparent_34%),linear-gradient(180deg,#fffaf2_0%,#ffffff_46%,#f4f7fb_100%)]" />
      <div className="absolute left-[8%] top-28 -z-10 h-44 w-44 rounded-full bg-chart-3/10 blur-3xl" />
      <div className="absolute right-[10%] top-16 -z-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,0.95fr)]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-4 py-2 text-sm font-medium text-foreground shadow-sm">
            <Icon icon="mdi:cookie-open-outline" className="h-4 w-4 text-primary" />
            <span>Website control shell, extension-powered local execution</span>
          </div>

          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.04em] text-foreground sm:text-6xl lg:text-7xl">
            Feed a monster your browser cookies, one domain at a time.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Cookie Monster turns cleanup into a playful ritual: inspect each website, choose
            which cookies become monster food, protect the domains you trust, and restore any
            batch from the recycle bin. The website is the cockpit. The extension is the private
            chewing engine.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-7 py-3.5 text-base font-medium text-background transition-transform hover:scale-[1.02]"
            >
              <Icon icon="mdi:cookie-cog-outline" className="h-5 w-5" />
              Open Monster Console
            </a>
            <a
              href="#install"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white/85 px-7 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-white"
            >
              <Icon icon="mdi:puzzle-outline" className="h-5 w-5 text-primary" />
              Install Extension Engine
            </a>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {monsterStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-[0_16px_50px_rgba(39,33,24,0.06)]"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{stat.hint}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-6 top-12 hidden h-28 w-28 rounded-full bg-secondary/25 blur-2xl lg:block" />
          <div className="absolute -right-8 bottom-10 hidden h-24 w-24 rounded-full bg-primary/20 blur-2xl lg:block" />

          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,249,252,0.92))] p-5 shadow-[0_28px_90px_rgba(31,42,68,0.14)]">
            <div className="flex items-center justify-between rounded-[1.5rem] border border-border bg-background/80 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-risk-high/70" />
                <span className="h-3 w-3 rounded-full bg-risk-medium/70" />
                <span className="h-3 w-3 rounded-full bg-chart-3/70" />
              </div>
              <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                cookie-monster.app/dashboard
              </div>
              <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Live Local Session
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[1.75rem] border border-border bg-[#fff7ed] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Monster Console
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-foreground">
                      Feed selected trackers, not your favorite websites.
                    </h2>
                  </div>
                  <div className="relative h-28 w-28 flex-shrink-0">
                    <div className="absolute inset-0 rounded-full bg-foreground" />
                    <div className="absolute left-5 top-7 h-4 w-4 rounded-full bg-background" />
                    <div className="absolute right-5 top-7 h-4 w-4 rounded-full bg-background" />
                    <div className="absolute left-4 right-4 top-14 h-9 rounded-b-[999px] rounded-t-[14px] bg-risk-high/90" />
                    <div className="absolute left-1/2 top-3 h-5 w-5 -translate-x-1/2 rounded-full bg-primary/70 blur-[2px]" />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-white/90 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Domains
                    </p>
                    <p className="mt-2 text-2xl font-bold text-foreground">183</p>
                  </div>
                  <div className="rounded-2xl bg-white/90 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Queue
                    </p>
                    <p className="mt-2 text-2xl font-bold text-foreground">3</p>
                  </div>
                  <div className="rounded-2xl bg-white/90 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Restorable
                    </p>
                    <p className="mt-2 text-2xl font-bold text-foreground">182</p>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-[#e7d9c5] bg-white/90 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">facebook.com</p>
                      <p className="text-sm text-muted-foreground">
                        65 cookies, 41 feedable, 33 high-risk
                      </p>
                    </div>
                    <button className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
                      Queue Domain Review
                    </button>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {[
                      ["fr", "23 chars kept local", "high"],
                      ["presence", "15 chars kept local", "medium"],
                      ["datr", "31 chars kept local", "high"],
                    ].map(([name, metadata, risk]) => (
                      <div
                        key={name}
                        className="grid items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 sm:grid-cols-[auto_1fr_auto]"
                      >
                        <input type="checkbox" checked readOnly className="h-4 w-4 rounded" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{name}</p>
                          <p className="truncate text-xs text-muted-foreground">{metadata}</p>
                        </div>
                        <span className="rounded-full bg-risk-high/10 px-2.5 py-1 text-xs font-medium text-risk-high">
                          {risk}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.75rem] border border-border bg-card p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Extension Engine
                  </p>
                  <div className="mt-3 space-y-3">
                    {[
                      "Reads cookies locally with Chrome permissions",
                      "Backs up every cleanup batch before deletion",
                      "Protects whitelisted domains from accidental feeding",
                      "Restores selected recycle-bin batches on demand",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-chart-3/15 p-1.5">
                          <Icon icon="mdi:shield-check-outline" className="h-4 w-4 text-chart-3" />
                        </div>
                        <p className="text-sm text-muted-foreground">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-border bg-card p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Cleanup Flow
                  </p>
                  <div className="mt-4 space-y-3">
                    {[
                      "Inspect a domain on the website",
                      "Pick exact cookies or trigger a preset meal",
                      "Let the extension delete and back up locally",
                      "Restore any batch if a website breaks",
                    ].map((step, index) => (
                      <div key={step} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                          {index + 1}
                        </div>
                        <p className="text-sm text-muted-foreground">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
