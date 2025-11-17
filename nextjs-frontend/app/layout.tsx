import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Edpulse",
  description: "Generate AI tailored lessons",
    icons: {
      icon: 'images/favicon.svg'
    }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">

        {/* 👇 Your navbar goes here — now global */}
        <nav className="w-full sticky top-0 z-50 bg-gray-900 text-white">
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">

            {/* Brand */}
            <Link href="/" className="font-bold text-lg tracking-tight">
              <Image
                src="/images/logo.svg"
                alt="Edpulse logo"
                width={128}
                height={128}
                className="object-cover transition-transform duration-200 hover:scale-105 bg-gray-300 rounded"
              />
            </Link>

            {/* Right controls */}
            <div className="flex items-center gap-3">
              <Link href="/register">
                <Button
                  variant="outline"
                  className="rounded-xl border-white text-white bg-transparent shadow-none hover:bg-gray-800/60 hover:text-white focus:ring-0"
                >
                  Sign up
                </Button>
              </Link>

              <Link href="/login">
                <Button className="rounded-xl bg-lime-400 text-black hover:bg-lime-500">
                  Log in
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {children}

      </body>
    </html>
  );
}