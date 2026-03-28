import Link from "next/link";
import { Icon } from "@iconify/react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const sections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "mdi:rocket-launch",
    content: [
      {
        question: "How do I install Cookie Monster?",
        answer:
          "Visit the Chrome Web Store (or your browser&apos;s extension store) and search for Cookie Monster. Click &apos;Add to Browser&apos; and the extension will be installed automatically. You can also download from our GitHub releases page.",
      },
      {
        question: "What browsers are supported?",
        answer:
          "Cookie Monster currently supports Chrome, Firefox, and Microsoft Edge. Safari support is planned for a future release.",
      },
      {
        question: "Do I need to create an account?",
        answer:
          "No! Cookie Monster works entirely locally without any account or registration. Your data never leaves your browser.",
      },
    ],
  },
  {
    id: "features",
    title: "Features",
    icon: "mdi:star",
    content: [
      {
        question: "What is cookie risk classification?",
        answer:
          "Cookie Monster analyzes cookies based on several factors: whether they&apos;re from third-party domains, their expiry length, security flags (Secure, HttpOnly, SameSite), and known tracking domains. High-risk cookies typically come from advertising or analytics networks.",
      },
      {
        question: "How does the smart cleanup work?",
        answer:
          "Smart cleanup identifies cookies that are likely used for tracking or advertising, expired cookies, and cookies from sites you haven&apos;t visited recently. It preserves essential cookies needed for login sessions and site functionality.",
      },
      {
        question: "Can I restore deleted cookies?",
        answer:
          "Yes! Before any deletion, Cookie Monster creates a backup in the recycle bin. You can restore cookies within 30 days of deletion. For permanent backups, use the export feature to save a backup.json file.",
      },
    ],
  },
  {
    id: "api",
    title: "Website-Extension API",
    icon: "mdi:api",
    content: [
      {
        question: "How does the website communicate with the extension?",
        answer:
          "The website uses Chrome&apos;s external messaging API to communicate with the extension. Only summary data (never raw cookie values) is transferred. The extension validates the sender origin before responding.",
      },
      {
        question: "What data is shared with the website?",
        answer:
          "Only sanitized summary data: cookie counts, domain statistics, risk distributions, and security flag counts. Raw cookie names and values are NEVER transmitted to the website.",
      },
      {
        question: "Can I use the dashboard without the extension?",
        answer:
          "Yes! You can export a report.json file from the extension and import it into the dashboard manually. This allows you to view analysis on any device.",
      },
    ],
  },
  {
    id: "faq",
    title: "FAQ",
    icon: "mdi:help-circle",
    content: [
      {
        question: "Is Cookie Monster free?",
        answer:
          "Yes, Cookie Monster is completely free and open source. There are no premium features, subscriptions, or ads.",
      },
      {
        question: "Does Cookie Monster collect my data?",
        answer:
          "No. Cookie Monster processes all data locally in your browser. We don&apos;t have servers that receive your cookie data. The website is a static application that runs entirely client-side.",
      },
      {
        question: "Will deleting cookies log me out of websites?",
        answer:
          "Deleting session cookies will log you out of websites. Cookie Monster&apos;s smart cleanup feature tries to preserve login cookies, but you can also manually exclude specific domains from cleanup.",
      },
      {
        question: "How can I contribute or report issues?",
        answer:
          "Cookie Monster is open source! Visit our GitHub repository to report issues, suggest features, or contribute code. We welcome all contributions.",
      },
    ],
  },
  {
    id: "support",
    title: "Support",
    icon: "mdi:lifebuoy",
    content: [
      {
        question: "Where can I get help?",
        answer:
          "For questions and support, open an issue on our GitHub repository. For security vulnerabilities, please email security@cookiemonster.app directly.",
      },
      {
        question: "How do I report a bug?",
        answer:
          "Visit our GitHub Issues page and create a new issue with the bug report template. Include your browser version, extension version, and steps to reproduce the issue.",
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Documentation
            </h1>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about using Cookie Monster to manage
              your browser cookies.
            </p>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-12">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all text-center"
              >
                <Icon
                  icon={section.icon}
                  className="w-6 h-6 text-primary"
                />
                <span className="text-sm font-medium text-foreground">
                  {section.title}
                </span>
              </a>
            ))}
          </div>

          {/* Sections */}
          <div className="space-y-12">
            {sections.map((section) => (
              <section key={section.id} id={section.id}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon icon={section.icon} className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {section.title}
                  </h2>
                </div>

                <div className="space-y-4">
                  {section.content.map((item, index) => (
                    <div
                      key={index}
                      className="bg-card rounded-xl border border-border p-5"
                    >
                      <h3 className="font-semibold text-foreground mb-2">
                        {item.question}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 bg-primary/5 rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground mb-6">
              Install Cookie Monster and take control of your browser cookies.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/#install"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                <Icon icon="mdi:puzzle" className="w-5 h-5" />
                Install Extension
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-muted text-foreground px-6 py-3 rounded-xl font-medium hover:bg-muted/80 transition-colors"
              >
                <Icon icon="mdi:github" className="w-5 h-5" />
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
