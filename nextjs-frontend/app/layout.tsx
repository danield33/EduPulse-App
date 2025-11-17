import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import { NavbarClient } from "@/components/ui/NavbarClient";

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
      <body className={`${geistSans.variable} ${geistMono.variable} bg-gray-50`}>

        {/* Navbar with client-side auth check */}
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

            {/* Right controls - Client component for auth state */}
            <NavbarClient />
          </div>
        </nav>

        {children}

      </body>
    </html>
  );
}