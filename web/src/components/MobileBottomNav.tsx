"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

function MobileBottomNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onStep1 = pathname.startsWith("/book/step-1");
  const wantsStay = searchParams.get("service") === "stay";

  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      if (y < 40) {
        setHidden(false);
      } else if (delta > 8) {
        setHidden(true);
      } else if (delta < -8) {
        setHidden(false);
      }
      lastScrollY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-4 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-[20px] border border-[#ececec] bg-white/95 px-1.5 py-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] font-[family-name:var(--font-poppins)] shadow-[0_10px_24px_rgba(0,0,0,.1)] backdrop-blur-xl transition-transform duration-300 ease-out sm:hidden ${
        hidden ? "translate-y-[calc(100%+1.5rem)]" : "translate-y-0"
      }`}
      aria-label="Mobile navigation"
    >
      <MobileNavItem href="/" icon="home" label="Home" active={pathname === "/"} />
      <MobileNavItem href="/book/step-1" icon="safari" label="Safari" active={onStep1 && !wantsStay} />
      <MobileNavItem href="/book/step-1?service=stay" icon="stay" label="Stay" active={onStep1 && wantsStay} />
      <MobileNavItem href="/book/step-3" icon="booking" label="Booking" active={pathname.startsWith("/book/step-3")} />
    </nav>
  );
}

export function MobileBottomNav() {
  return (
    <Suspense fallback={null}>
      <MobileBottomNavInner />
    </Suspense>
  );
}

function MobileNavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: "home" | "safari" | "stay" | "booking";
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 transition active:scale-95 ${
        active ? "text-black" : "text-black/40 hover:text-black/70"
      }`}
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-full transition ${active ? "bg-[#fdcb08]" : "bg-transparent"}`}>
        {icon === "home" && (
          <svg viewBox="0 -960 960 960" className="h-[18px] w-[18px]" fill="currentColor">
            <path d="M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z" />
          </svg>
        )}
        {icon === "safari" && (
          <svg viewBox="0 -960 960 960" className="h-[18px] w-[18px]" fill="currentColor">
            <path d="M456-600h320q-27-69-82.5-118.5T566-788L456-600Zm-92 80 160-276q-11-2-22-3t-22-1q-66 0-123 25t-101 67l108 188ZM170-400h218L228-676q-32 41-50 90.5T160-480q0 21 2.5 40.5T170-400Zm224 228 108-188H184q27 69 82.5 118.5T394-172Zm86 12q66 0 123-25t101-67L596-440 436-164q11 2 21.5 3t22.5 1Zm252-124q32-41 50-90.5T800-480q0-21-2.5-40.5T790-560H572l160 276ZM480-480Zm0 400q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q83 0 155.5 31.5t127 86q54.5 54.5 86 127T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Z" />
          </svg>
        )}
        {icon === "stay" && (
          <svg viewBox="0 -960 960 960" className="h-[18px] w-[18px]" fill="currentColor">
            <path d="M160-120v-375l-72 55-48-64 120-92v-124h80v63l240-183 440 336-48 63-72-54v375H160Zm80-80h200v-160h80v160h200v-356L480-739 240-556v356Zm-80-560q0-50 35-85t85-35q17 0 28.5-11.5T320-920h80q0 50-35 85t-85 35q-17 0-28.5 11.5T240-760h-80Zm80 560h480-480Z" />
          </svg>
        )}
        {icon === "booking" && (
          <svg viewBox="0 -960 960 960" className="h-[18px] w-[18px]" fill="currentColor">
            <path d="m368-320 112-84 110 84-42-136 112-88H524l-44-136-44 136H300l110 88-42 136ZM160-160q-33 0-56.5-23.5T80-240v-135q0-11 7-19t18-10q24-8 39.5-29t15.5-47q0-26-15.5-47T105-556q-11-2-18-10t-7-19v-135q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v135q0 11-7 19t-18 10q-24 8-39.5 29T800-480q0 26 15.5 47t39.5 29q11 2 18 10t7 19v135q0 33-23.5 56.5T800-160H160Zm0-80h640v-102q-37-22-58.5-58.5T720-480q0-43 21.5-79.5T800-618v-102H160v102q37 22 58.5 58.5T240-480q0 43-21.5 79.5T160-342v102Zm320-240Z" />
          </svg>
        )}
      </span>
      <span className={`truncate text-[10px] leading-none ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
    </Link>
  );
}
