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
  // 🔹 Role toggle
  const [role, setRole] = useState<"student" | "instructor">("student");

  // 🔹 State for instructor script generation
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);

  // 🔹 Breakpoint system
  const [breakpoints, setBreakpoints] = useState<Record<number, string>>({});

  const handleAddBreakpoint = (index: number) => {
    const question = prompt("Enter a reflection question for this point:");
    if (question) {
      setBreakpoints((prev) => ({ ...prev, [index]: question }));
    }
  };

  const handleSaveScript = () => {
    if (!generatedScript) return;
    const paragraphs = generatedScript
      .split(/\n+/)
      .filter((p) => p.trim() !== "");
    const finalScript = paragraphs
      .map((p, i) =>
        breakpoints[i] ? `${p}\n\n[BREAKPOINT] ${breakpoints[i]}` : p,
      )
      .join("\n\n");
    console.log("✅ Final Script with Breakpoints:\n", finalScript);
    alert("Breakpoints saved! (Check console for combined output)");
  };

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
              <h2 className="text-2xl font-semibold mb-3">
                🧑‍🏫 Instructor Dashboard
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Upload a teaching scenario PDF to generate a 2-minute AI-powered
                teaching script.
              </p>

              {/* Upload script form */}
              <form
                className="mb-6 flex flex-col items-center justify-center border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-lg p-8 bg-gray-100 dark:bg-gray-800"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const input = document.getElementById(
                    "script-upload",
                  ) as HTMLInputElement;
                  if (!input?.files?.length)
                    return alert("Please select a PDF file first.");

                  const formData = new FormData();
                  formData.append("file", input.files[0]);
                  setLoading(true);
                  setGeneratedScript(null);

                  try {
                    const res = await fetch(
                      "http://localhost:8000/api/scripts/generate-script-from-pdf",
                      {
                        method: "POST",
                        body: formData,
                      },
                    );
                    if (!res.ok) throw new Error("Failed to generate script");
                    const data = await res.json();
                    setGeneratedScript(data.script);
                    setBreakpoints({});
                  } catch (err) {
                    console.error(err);
                    alert("Error generating script. Check backend logs.");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <input
                  id="script-upload"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setFileName(file ? file.name : "");
                  }}
                />

                <label
                  htmlFor="script-upload"
                  className="cursor-pointer px-6 py-3 mb-4 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Choose PDF
                </label>

                <p className="text-sm text-gray-500 mb-4">
                  {fileName || "No file selected"}
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                >
                  {loading ? "Generating..." : "Upload & Generate Script"}
                </button>
              </form>

              {/* Editable script with breakpoints */}
              {generatedScript && (
                <div className="mt-6 w-full bg-white dark:bg-gray-700 rounded-xl shadow p-6 whitespace-pre-wrap">
                  <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                    🎬 Generated Teaching Script
                  </h3>

                  {generatedScript
                    .split(/\n+/)
                    .filter((p) => p.trim() !== "")
                    .map((para, i) => (
                      <div key={i} className="mb-4">
                        <p className="text-gray-700 dark:text-gray-200">
                          {para}
                        </p>

                        {breakpoints[i] && (
                          <div className="bg-yellow-100 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-200 p-3 rounded-lg mt-2">
                            <strong>[BREAKPOINT]</strong> {breakpoints[i]}
                          </div>
                        )}

                        <button
                          className="mt-2 text-sm text-blue-600 hover:underline"
                          onClick={() => handleAddBreakpoint(i)}
                        >
                          ➕ Add Breakpoint Here
                        </button>
                      </div>
                    ))}

                  <button
                    onClick={handleSaveScript}
                    className="mt-6 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
                  >
                    💾 Save Script with Breakpoints
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
