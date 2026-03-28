"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@iconify/react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Features", href: "/#features" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Docs", href: "/docs" },
    { label: "Privacy", href: "/privacy" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center transition-transform group-hover:scale-105 shadow-md shadow-blue-500/20">
              <Icon icon="mdi:cookie" className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg text-slate-800">
              Cookie Monster
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors px-4 py-2 font-medium"
            >
              Open Dashboard
            </Link>
            <a
              href="/#install"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md shadow-blue-500/20"
            >
              <Icon icon="mdi:puzzle" className="w-4 h-4" />
              Install Extension
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-500 hover:text-slate-800"
            aria-label="Toggle menu"
          >
            <Icon
              icon={mobileMenuOpen ? "mdi:close" : "mdi:menu"}
              className="w-6 h-6"
            />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  {item.label}
                </Link>
              ))}
              <hr className="my-2 border-slate-200" />
              <a
                href="/#install"
                onClick={() => setMobileMenuOpen(false)}
                className="mx-4 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md"
              >
                <Icon icon="mdi:puzzle" className="w-4 h-4" />
                Install Extension
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
