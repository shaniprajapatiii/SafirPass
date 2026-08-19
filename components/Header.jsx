"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ShieldCheck,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  QrCode,
  Siren,
  PhoneCall,
  UserCheck
} from "lucide-react";
import { useAuth } from "../lib/auth-context";

export function Header() {
  const pathname = usePathname();
  const { user, signOut, signInWithGoogle } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navLinks = [
    { href: "/how-it-works", label: "How It Works" },
    { href: "/services", label: "Services" },
    { href: "/safety", label: "Safety Grid" },
    { href: "/authorities", label: "Command Hub" },
  ];

  const isActive = (path) => pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md transition-all">
      <div className="container-page flex h-18 items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md transition-transform group-hover:scale-105">
            <ShieldCheck className="size-6 text-blue-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
              SafirPass
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 flex items-center gap-1">
              <span>Smart Tourist Identity</span>
            </span>
          </div>
        </Link>

        {/* Streamlined Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                isActive(link.href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action Controls & Auth Status */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="tel:1363"
            className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors"
          >
            <PhoneCall className="size-3.5 text-amber-600" />
            <span>1363 Helpline</span>
          </a>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 pr-3 text-sm font-medium text-slate-800 hover:bg-slate-100 transition-colors"
              >
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="User Profile"
                    className="size-7 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex size-7 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-xs">
                    {user.user_metadata?.full_name ? user.user_metadata.full_name[0] : (user.email ? user.email[0].toUpperCase() : "T")}
                  </div>
                )}
                <span className="max-w-[120px] truncate text-xs font-bold text-slate-900">
                  {user.user_metadata?.full_name || user.email?.split("@")[0] || "Tourist"}
                </span>
                <ChevronDown className="size-3.5 text-slate-500" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl animate-in fade-in slide-in-from-top-2">
                  <div className="border-b border-slate-100 p-2.5 text-xs space-y-0.5">
                    <p className="font-bold text-slate-900">{user.user_metadata?.full_name || "Tourist Profile"}</p>
                    <p className="truncate text-slate-500">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <LayoutDashboard className="size-4 text-blue-600" /> Dashboard Overview
                    </Link>
                    <Link
                      href="/dashboard/id"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <QrCode className="size-4 text-blue-600" /> Digital ID &amp; QR
                    </Link>
                    <Link
                      href="/dashboard/sos"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Siren className="size-4 text-red-600" /> Emergency SOS
                    </Link>
                  </div>
                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        signOut();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="size-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition-all hover:shadow-lg"
            >
              <UserCheck className="size-4" /> Sign in with Google
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex md:hidden rounded-lg p-2 text-slate-700 hover:bg-slate-100"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white px-4 pt-2 pb-6 md:hidden animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-xl px-4 py-3 text-base font-semibold ${
                  isActive(link.href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 border-t border-slate-100 pt-4 space-y-2">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white"
                >
                  <LayoutDashboard className="size-4" /> Go to Dashboard
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-red-600"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white"
              >
                <UserCheck className="size-4" /> Sign in with Google
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
