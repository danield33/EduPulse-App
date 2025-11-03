"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* NAVBAR */}
      <nav className="w-full sticky top-0 z-50 bg-gray-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="font-bold text-lg tracking-tight">
            EduPulse
          </Link>

          {/* Right controls */}
          <div className="flex items-center gap-3">

            {/* Auth buttons */}
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

      {/* MAIN */}
      <main className="flex flex-col items-center justify-center px-8 py-14">

        {/* ROLE-BASED SECTION */}
        <section className="mt-12 w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-800 shadow p-6">
              <h2 className="text-2xl font-semibold mb-3">Welcome to Edupulse!</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We're an AI lesson video creation tool. Learn from curated lessons designed for students by educators.
                To start creating lessons, log in or sign up to get started!
              </p>

          <div className={'flex flex-row justify-around'}>
            <Link href="/login">
              <Button className="rounded-xl bg-lime-400 text-black hover:bg-lime-500">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button
                  variant="outline"
                  className="rounded-xl border-gray-900 text-gray-900 bg-transparent shadow-none hover:bg-gray-800/60 hover:text-white focus:ring-0"
              >
                Sign up
              </Button>
            </Link>
          </div>

        </section>
      </main>
    </div>
  );
}
