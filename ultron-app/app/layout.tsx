import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/app/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ultron",
  description: "Historical manuscripts analysis and transcription tool.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-muted has-data-[page=home]:bg-background">
        <Nav />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 bg-background px-6 py-8 sm:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
