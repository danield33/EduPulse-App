"use client";
import React, { useState } from "react";

interface Props {
  script: string;
}

export default function BreakpointEditor({ script }: Props) {
  const paragraphs = script.split(/\n+/).filter((p) => p.trim() !== "");
  const [breakpoints, setBreakpoints] = useState<Record<number, string>>({});

  const handleAddBreakpoint = (index: number) => {
    const question = prompt("Enter a reflection question for students:");
    if (question) {
      setBreakpoints((prev) => ({ ...prev, [index]: question }));
    }
  };

  return (
    <div className="mt-6 w-full bg-white dark:bg-gray-700 rounded-xl shadow p-6 whitespace-pre-wrap">
      <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        🎬 Generated Teaching Script
      </h3>
      {paragraphs.map((para, i) => (
        <div key={i} className="mb-4">
          <p className="text-gray-700 dark:text-gray-200">{para}</p>

          {/* Existing breakpoint (if added) */}
          {breakpoints[i] && (
            <div className="bg-yellow-100 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-200 p-3 rounded-lg mt-2">
              <strong>[BREAKPOINT]</strong> {breakpoints[i]}
            </div>
          )}

          {/* Add breakpoint button */}
          <button
            className="mt-2 text-sm text-blue-600 hover:underline"
            onClick={() => handleAddBreakpoint(i)}
          >
            ➕ Add Breakpoint Here
          </button>
        </div>
      ))}

      {/* Save button (placeholder for DB integration) */}
      <button
        className="mt-6 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
        onClick={() => {
          const finalScript = paragraphs
            .map((p, i) =>
              breakpoints[i] ? `${p}\n\n[BREAKPOINT] ${breakpoints[i]}` : p,
            )
            .join("\n\n");
          console.log("Final Script with Breakpoints:\n", finalScript);
          alert("Breakpoints saved! (Check console for output)");
        }}
      >
        💾 Save Script with Breakpoints
      </button>
    </div>
  );
}
