"use client";

import { useState } from "react";
import Link from "next/link";
import { FaGithub } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function Home() {
  // 🔹 role toggle
  const [role, setRole] = useState<"student" | "instructor">("student");

  // 🔹 lessons state (used for instructor uploads)
  const [lessons, setLessons] = useState<any[]>([]);

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
            {/* Role dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-xl bg-gray-800 px-4 py-2 text-sm font-semibold hover:bg-gray-700 focus:outline-none">
                {role === "student" ? "Students ▾" : "Instructors ▾"}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-xl">
                <DropdownMenuItem onClick={() => setRole("student")}>
                  🎓 Students
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRole("instructor")}>
                  🧑‍🏫 Instructors
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
          {role === "student" ? (
            <>
              <h2 className="text-2xl font-semibold mb-3">🎓 Student Video</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Learn from curated lessons designed for students.
              </p>
              <video controls className="w-full rounded-lg">
                <source src="/videos/student-lesson.mp4" type="video/mp4" />
              </video>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold mb-3">🧑‍🏫 Instructor Dashboard</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Upload a teaching script and let AI generate a learning course.
              </p>

              {/* Upload script form */}

                <form
                  className="mb-6 flex flex-col items-center justify-center border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-lg p-8 bg-gray-100 dark:bg-gray-800"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fileInput = document.getElementById("script-upload") as HTMLInputElement;
                    if (!fileInput?.files?.length) return;

                    const formData = new FormData();
                    formData.append("file", fileInput.files[0]);

                    const res = await fetch("/api/generate-lessons", {
                      method: "POST",
                      body: formData,
                    });

                    const data = await res.json();
                    setLessons(data.lessons || []);
                  }}
                >
                  {/* Hidden native input */}
                  <input
                    id="script-upload"
                    type="file"
                    accept=".txt,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const label = document.getElementById("file-label");
                      if (label && e.target.files?.[0]) {
                        label.textContent = e.target.files[0].name;
                      }
                    }}
                  />

                  {/* Custom clickable label */}
                  <label
                    htmlFor="script-upload"
                    className="cursor-pointer px-6 py-3 mb-4 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Choose File
                  </label>

                  {/* File name placeholder */}
                  <p id="file-label" className="text-sm text-gray-500 mb-4">
                    No file selected
                  </p>

                </form>


              {/* Generated Lessons */}
              {lessons.length > 0 && (
                <div className="mt-6 w-full max-w-2xl">
                  <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                    Generated Lesson Plan
                  </h3>
                  <ul className="space-y-3">
                    {lessons.map((lesson, idx) => (
                      <li
                        key={idx}
                        className="p-4 border rounded-lg shadow bg-white dark:bg-gray-700"
                      >
                        <h4 className="font-bold text-gray-800 dark:text-white">
                          {lesson.title || `Lesson ${idx + 1}`}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-300">
                          {lesson.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
