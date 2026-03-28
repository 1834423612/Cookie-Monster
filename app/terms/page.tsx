import { Icon } from "@iconify/react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const sections = [
  {
    title: "Acceptance of Terms",
    content: `By installing the Cookie Monster browser extension or using the Cookie Monster website, you agree to these Terms of Service. If you do not agree to these terms, please do not use our software.`,
  },
  {
    title: "Description of Service",
    content: `Cookie Monster is a browser extension and companion website that helps users analyze, manage, and delete browser cookies. The service includes:

- A browser extension for cookie scanning, analysis, and deletion
- A web dashboard for viewing cookie reports and statistics
- Tools for exporting and importing cookie analysis data

All core functionality operates locally within your browser.`,
  },
  {
    title: "License",
    content: `Cookie Monster is open source software released under the MIT License. You are free to:

- Use the software for any purpose
- Study and modify the source code
- Distribute copies of the software
- Distribute modified versions

The full license text is available in our GitHub repository.`,
  },
  {
    title: "User Responsibilities",
    content: `When using Cookie Monster, you agree to:

- Use the software only for lawful purposes
- Not attempt to exploit or harm our services
- Not use the software to violate others&apos; privacy
- Take responsibility for cookies you choose to delete

You understand that deleting cookies may log you out of websites and affect site functionality.`,
  },
  {
    title: "No Warranty",
    content: `Cookie Monster is provided "AS IS" without warranty of any kind, express or implied. We do not warrant that:

- The software will be error-free or uninterrupted
- The cookie analysis will be 100% accurate
- Deleted cookies can always be restored
- The software will work with all websites

Use Cookie Monster at your own risk. We recommend backing up important cookies before bulk deletion.`,
  },
  {
    title: "Limitation of Liability",
    content: `To the maximum extent permitted by law, Cookie Monster and its contributors shall not be liable for any:

- Direct, indirect, incidental, or consequential damages
- Loss of data, profits, or business opportunities
- Damages arising from use or inability to use the software

This limitation applies regardless of the legal theory under which liability is sought.`,
  },
  {
    title: "Privacy",
    content: `Your use of Cookie Monster is also governed by our Privacy Policy. Key points:

- All cookie processing happens locally in your browser
- We do not collect, store, or transmit your cookie data
- The website does not use tracking or analytics

Please review our full Privacy Policy for complete details.`,
  },
  {
    title: "Changes to Terms",
    content: `We may update these Terms of Service from time to time. Changes will be:

- Posted on this page with an updated date
- Announced in our GitHub repository for significant changes

Continued use of Cookie Monster after changes constitutes acceptance of the new terms.`,
  },
  {
    title: "Governing Law",
    content: `These terms shall be governed by and construed in accordance with applicable law, without regard to conflict of law principles.`,
  },
  {
    title: "Contact",
    content: `For questions about these Terms of Service:

- Open an issue on our GitHub repository
- Email: legal@cookiemonster.app`,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon icon="mdi:file-document" className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Terms of Service
                </h1>
                <p className="text-sm text-muted-foreground">
                  Last updated: March 2026
                </p>
              </div>
            </div>
            <p className="text-lg text-muted-foreground">
              Please read these terms carefully before using Cookie Monster.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-8">
            {sections.map((section, index) => (
              <section key={index}>
                <h2 className="text-lg font-bold text-foreground mb-3">
                  {index + 1}. {section.title}
                </h2>
                <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </section>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-border">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                By using Cookie Monster, you agree to these terms.
              </p>
              <a
                href="/privacy"
                className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
              >
                <Icon icon="mdi:shield-check" className="w-4 h-4" />
                Read Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
