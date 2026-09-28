"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/jungles/tadoba", label: "Tadoba" },
  { href: "/jungles/pench", label: "Pench" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="sticky top-3 z-40 mx-3 sm:mx-6">
      <nav
        aria-label="Main navigation"
        className="wild-navbar-glass mx-auto flex w-auto max-w-[1640px] items-center justify-between rounded-[1.6rem] px-4 py-3 sm:px-6 lg:px-8"
      >
        <Link href="/" className="flex items-center gap-3" aria-label="Wild Excursions home">
          <Image
            src="/logo.webp"
            alt=""
            width={44}
            height={44}
            className="h-9 w-9 rounded-full object-cover sm:h-11 sm:w-11"
          />
          <span className="font-wordmark text-[1.4rem] leading-none tracking-wide text-white sm:text-[1.7rem]">
            Wild Excursions
          </span>
        </Link>

        <ul className="hidden items-center gap-7 text-[10px] font-bold uppercase tracking-[0.11em] text-white lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="wild-nav-link">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href="/book/step-1"
            className="hidden whitespace-nowrap rounded-full bg-accent px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.08em] text-brand-dark transition hover:bg-[#a97e00] sm:block"
          >
            Plan My Safari
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            className="grid h-9 w-9 place-content-center gap-1 rounded-full text-white lg:hidden"
          >
            <span className={`block h-0.5 w-5 rounded-full bg-current transition ${menuOpen ? "translate-y-1.5 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 rounded-full bg-current transition ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 rounded-full bg-current transition ${menuOpen ? "-translate-y-1.5 -rotate-45" : ""}`} />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="mt-2 grid gap-1 rounded-[1.5rem] bg-[#080808] p-3 shadow-[0_22px_55px_rgba(0,0,0,0.55)] lg:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white/85 transition hover:bg-accent/10 hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/book/step-1"
            onClick={() => setMenuOpen(false)}
            className="mt-1 flex items-center justify-between rounded-2xl bg-accent px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-brand-dark"
          >
            Plan My Safari
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      )}
    </div>
  );
}
