import Link from "next/link"

export default function Nav() {
  return (
    <nav className="border-b px-8 py-3 flex gap-6 text-sm font-medium bg-white">
      <Link href="/" className="hover:underline">Home</Link>
      <Link href="/historical-records" className="hover:underline">Historical Records</Link>
    </nav>
  )
}
