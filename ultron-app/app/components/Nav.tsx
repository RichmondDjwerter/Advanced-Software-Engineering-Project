"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/historical-records", label: "Historical Records" },
];

// Navigation bar component
export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <nav
        className="flex w-full items-center justify-between px-6 py-4 sm:px-10 lg:px-16 2xl:px-24"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          <Image
            className="h-auto w-[130px]"
            src="/ultron/logo.png"
            alt="Ultron"
            width={787}
            height={119}
            priority
          />
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          {links.map(({ href, label }) => {
            // The detail pages belong to Historical Records.
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "underline-offset-8 transition-colors hover:text-zinc-950 dark:hover:text-white",
                  active &&
                    "text-zinc-950 underline decoration-coral decoration-2 dark:text-white",
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
