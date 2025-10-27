"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StudentPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="w-full sticky top-0 z-50 bg-gray-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg tracking-tight">
            EduPulse
          </Link>
          <div className="flex items-center gap-3">
          </div>
        </div>
      </nav>

      <main className="flex flex-col items-center justify-center px-8 py-14">
        <section className="mt-12 w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-800 shadow p-6">
          <h2 className="text-2xl font-semibold mb-3">🎓 Student Video</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Learn from curated lessons designed for students.
          </p>
          <video controls className="w-full rounded-lg">
            <source src="/videos/student-lesson.mp4" type="video/mp4" />
          </video>
        </section>
      </main>
    </div>
  );
}