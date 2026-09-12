"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

export default function ImportProductsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function previewImport() {
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please sign in again.");
      }

      const token = await user.getIdToken();

      const form = new FormData();
      form.append("file", file);

      const response = await fetch(
        `${API_URL}/api/products/import/preview`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: form,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Import preview failed.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Import preview failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <a
          href="/products"
          className="text-sm font-semibold text-slate-600 hover:text-slate-950"
        >
          ← Back to Products
        </a>

        <h1 className="mt-6 text-3xl font-bold text-slate-950">
          Import Products
        </h1>

        <p className="mt-2 text-slate-500">
          Upload an Excel or CSV product catalogue.
        </p>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center transition hover:border-slate-500 hover:bg-slate-100">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-2xl text-white">
              ↑
            </div>

            <span className="text-base font-bold text-slate-900">
              Upload Excel or CSV
            </span>

            <span className="mt-1 text-sm text-slate-500">
              Click to select a file from your computer
            </span>

            <span className="mt-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
              .XLSX or .CSV · Maximum 10 MB
            </span>

            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>

          {file && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {file.name}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB · Ready to analyse
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  setError("");
                }}
                className="text-sm font-semibold text-slate-500 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          )}

          <button
            onClick={previewImport}
            disabled={!file || loading}
            className="mt-5 rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? "Analysing..." : "Analyse File"}
          </button>

          {error && (
            <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Import Summary
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review the analysis before importing anything.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <SummaryCard
                  label="Rows Analysed"
                  value={result.preview_count || 0}
                />
                <SummaryCard
                  label="New Products"
                  value={result.summary?.new || 0}
                  tone="green"
                />
                <SummaryCard
                  label="Existing Products"
                  value={result.summary?.existing || 0}
                  tone="amber"
                />
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h3 className="font-bold text-slate-950">
                    Product Preview
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Review every product before importing.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Row</th>
                        <th className="px-5 py-3">SKU</th>
                        <th className="px-5 py-3">Product</th>
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3">Cost</th>
                        <th className="px-5 py-3">Stock</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {result.rows?.map((row: any) => {
                        const source = row.source || {};
                        const map = result.mapping || {};

                        return (
                          <tr key={row.row_number}>
                            <td className="px-5 py-4 text-slate-500">
                              {row.row_number}
                            </td>

                            <td className="px-5 py-4 font-semibold text-slate-900">
                              {source[map.sku] || "—"}
                            </td>

                            <td className="px-5 py-4 text-slate-900">
                              {source[map.name] || "—"}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {source[map.category] || "—"}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {source[map.unit_cost] || "—"}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {source[map.opening_stock] || "0"}
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge status={row.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  File
                </div>
                <div className="mt-1 font-semibold text-slate-900">
                  {result.filename}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "green" | "amber";
}) {
  const styles = {
    slate: "border-slate-200 bg-white text-slate-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  };

  return (
    <div className={`rounded-2xl border p-5 ${styles[tone]}`}>
      <div className="text-sm font-semibold opacity-70">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const existing = status === "EXISTING";

  return (
    <span
      className={
        existing
          ? "inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800"
          : "inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"
      }
    >
      {existing ? "EXISTING" : "NEW"}
    </span>
  );
}
