"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Row = { id: string; author?: string | null; created_at: string; preview: string };

export default function ScriptsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/scripts`);
        const data = await res.json();
        setRows(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Saved Scripts</h1>
          <Link href="/instructor" className="text-blue-600 hover:underline">← Back to Instructor</Link>
        </div>

        {loading ? <p>Loading…</p> : rows.length === 0 ? (
          <p>No scripts yet.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map(r => (
              <li key={r.id} className="rounded border p-4 bg-white">
                <div className="flex justify-between">
                  <div>
                    <div className="text-sm text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                    <div className="font-medium">{r.author ?? "Unknown author"}</div>
                  </div>
                  <Link
                    href={`/scripts/${r.id}`}
                    className="text-blue-600 hover:underline self-start"
                  >
                    Open
                  </Link>
                </div>
                <p className="mt-2 text-gray-700">{r.preview}…</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}