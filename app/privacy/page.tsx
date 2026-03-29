import { Icon } from "@iconify/react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const sections = [
  {
    id: "overview",
    title: "Privacy Overview",
    content: `Cookie Monster is built with privacy as its core principle. We believe that a privacy tool should practice what it preaches. This means:

- All cookie analysis happens locally in your browser
- No cookie data is ever transmitted to our servers
- No user tracking or analytics on sensitive pages
- No accounts or registration required
- Complete transparency through open source code`,
  },
  {
    id: "data-collection",
    title: "Data Collection",
    content: `Cookie Monster does NOT collect:

- Your cookies or cookie values
- Your browsing history
- Any personal information
- Usage analytics on the dashboard
- IP addresses or device fingerprints

The only data that leaves your browser is standard web requests to load the website itself (HTML, CSS, JavaScript files). These requests are served by Vercel and may be logged in their standard access logs, but contain no cookie or analysis data.`,
  },
  {
    id: "local-processing",
    title: "Local Processing",
    content: `All sensitive operations happen entirely within your browser:

1. Cookie Scanning: The extension uses Chrome's cookies API to read cookies. Raw cookie values stay inside the extension.

2. Analysis: Risk classification, categorization, and statistics are computed locally using JavaScript in your browser.

3. Reports: When you export a report, it's saved directly to your device. When you view the dashboard, data is processed client-side.

4. Website-Extension Communication: When the website requests data from the extension, it can receive sanitized summaries plus limited cookie metadata such as names, keys, flags, and value size through a local browser bridge. Raw cookie values stay inside the extension and are NEVER transmitted to the website.`,
  },
  {
    id: "security",
    title: "Security Measures",
    content: `We implement several security measures to protect your data:

- Local Bridge Isolation: The website talks to the extension through a local page-to-content-script bridge that runs entirely in your browser
- No Raw Value Transfer: The website never receives actual cookie values
- No External APIs: The dashboard doesn't call any external APIs when displaying your data
- Backup Export Warning: Backup files are saved locally as plain JSON and may contain raw cookie values, so keep them on a trusted device
- Open Source: All code is publicly auditable on GitHub`,
  },
  {
    id: "cookies",
    title: "Our Use of Cookies",
    content: `The Cookie Monster website itself uses minimal cookies:

- Session Preferences: We may store your dashboard preferences (like dark mode) in localStorage, not cookies
- No Tracking Cookies: We don't use any analytics, advertising, or tracking cookies
- No Third-Party Cookies: We don't embed any third-party services that set cookies

Ironically, a cookie management tool should set as few cookies as possible!`,
  },
  {
    id: "third-parties",
    title: "Third Parties",
    content: `Our infrastructure involves these third parties:

- Vercel: Hosts our website. Standard web server logs may include IP addresses and request URLs. No cookie data is transmitted.
- GitHub: Hosts our open source code. No user data is shared with GitHub.
- Chrome Extensions: You can load the extension locally in developer mode from this repository. If we later distribute through a marketplace, their standard policies will apply.

We do not use any analytics services, advertising networks, or data processors.`,
  },
  {
    id: "your-rights",
    title: "Your Rights",
    content: `Since we don't collect personal data, traditional data rights (access, deletion, portability) don't apply in the usual sense. However:

- You can delete all local data by uninstalling the extension and clearing your browser's localStorage
- You can inspect all data the extension stores using browser developer tools
- You can audit our code on GitHub to verify our privacy claims
- You can use the extension entirely offline after installation`,
  },
  {
    id: "changes",
    title: "Policy Changes",
    content: `We will update this privacy policy if our practices change. Significant changes will be:

- Announced in our GitHub repository
- Noted in extension update release notes
- Dated at the top of this page

Our commitment to local-only processing is fundamental to Cookie Monster and will not change.`,
  },
  {
    id: "contact",
    title: "Contact",
    content: `For privacy-related questions or concerns:

- Open an issue on our GitHub repository
- Email: privacy@cookiemonster.app
- For security vulnerabilities: security@cookiemonster.app`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-chart-3/10 flex items-center justify-center">
                <Icon icon="mdi:shield-check" className="w-6 h-6 text-chart-3" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Privacy Policy
                </h1>
                <p className="text-sm text-muted-foreground">
                  Last updated: March 2026
                </p>
              </div>
            </div>
            <p className="text-lg text-muted-foreground">
              Cookie Monster is designed with privacy at its core. Here&apos;s exactly
              what we do and don&apos;t do with your data.
            </p>
          </div>

          {/* Key points summary */}
          <div className="bg-chart-3/5 border border-chart-3/20 rounded-2xl p-6 mb-12">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Icon icon="mdi:check-decagram" className="w-5 h-5 text-chart-3" />
              Key Points
            </h2>
            <ul className="space-y-2">
              {[
                "All processing happens locally in your browser",
                "We never see or store your cookie data",
                "No tracking, analytics, or advertising",
                "No account required - completely anonymous",
                "Open source and fully auditable",
              ].map((point, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-muted-foreground"
                >
                  <Icon
                    icon="mdi:check"
                    className="w-5 h-5 text-chart-3 flex-shrink-0 mt-0.5"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Table of contents */}
          <div className="bg-card rounded-xl border border-border p-5 mb-12">
            <h2 className="font-semibold text-foreground mb-3">Contents</h2>
            <nav className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </div>

          {/* Sections */}
          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.id} id={section.id}>
                <h2 className="text-xl font-bold text-foreground mb-4">
                  {section.title}
                </h2>
                <div className="prose prose-sm max-w-none">
                  {section.content.split("\n\n").map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-muted-foreground leading-relaxed mb-4 whitespace-pre-line"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="mt-16 pt-8 border-t border-border text-center">
            <p className="text-muted-foreground mb-4">
              Have questions about our privacy practices?
            </p>
            <a
              href="/docs#chrome-install"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <Icon icon="mdi:book-open-page-variant" className="w-5 h-5" />
              Review the install and privacy docs
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
