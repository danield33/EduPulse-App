/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function InstructorPage() {
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [breakpoints, setBreakpoints] = useState<Record<number, string>>({});

  const handleAddBreakpoint = (index: number) => {
    const question = prompt("Enter a reflection question for this point:");
    if (question) setBreakpoints((prev) => ({ ...prev, [index]: question }));
  };

  const handleSaveScript = async () => {
    if (!generatedScript) return;

    const paragraphs = generatedScript
      .split(/\n+/)
      .filter((p) => p.trim() !== "");

    const finalScript = paragraphs
      .map((p, i) =>
        breakpoints[i] ? `${p}\n\n[BREAKPOINT] ${breakpoints[i]}` : p,
      )
      .join("\n\n");

    try {
      const res = await fetch(`${API_BASE}/api/scripts/save-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: finalScript }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Save failed (${res.status}): ${text}`);
      }

      const data = await res.json(); // { id, message }
      alert(`Script saved successfully (ID: ${data.id})`);
    } catch (err: any) {
      console.error(err);
      alert(`Error saving script to backend: ${err?.message ?? err}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* NAVBAR */}
      <nav className="w-full sticky top-0 z-50 bg-gray-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg tracking-tight">
            EduPulse
          </Link>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-xl bg-gray-800 px-4 py-2 text-sm font-semibold hover:bg-gray-700 focus:outline-none">
                Instructors ▾
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-xl">
                <DropdownMenuItem asChild>
                  <Link href="/student">🎓 Switch to Student View</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/register">
              <Button
                variant="outline"
                className="rounded-xl border-white text-white bg-transparent hover:bg-gray-800/60"
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
          <h2 className="text-2xl font-semibold mb-3">
            🧑‍🏫 Instructor Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Upload a teaching scenario PDF to generate a 2-minute AI-powered
            teaching script.
          </p>

          {/* Upload + Generate */}
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
                  `${API_BASE}/api/scripts/generate-script-from-pdf`,
                  {
                    method: "POST",
                    body: formData,
                  },
                );
                if (!res.ok) {
                  const text = await res.text();
                  throw new Error(`Generate failed (${res.status}): ${text}`);
                }
                const data = await res.json();
                setGeneratedScript(data.script);
                setBreakpoints({});
              } catch (err: any) {
                console.error(err);
                alert(
                  `Error generating script. ${err?.message ?? ""} Check backend logs.`,
                );
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
              onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
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

          {/* Generated script + breakpoints */}
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
                    <p className="text-gray-700 dark:text-gray-200">{para}</p>

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
        </section>
      </main>
    </div>
  );
}
