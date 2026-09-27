import Link from "next/link";
import Image from "next/image";

export default function Nav() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <nav
        className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-8"
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
          <Link
            href="/"
            className="transition-colors hover:text-zinc-950 dark:hover:text-white"
          >
            Home
          </Link>
          <Link
            href="/historical-records"
            className="transition-colors hover:text-zinc-950 dark:hover:text-white"
          >
            Historical Records
          </Link>
        </div>
      </nav>
    </header>
  );
}