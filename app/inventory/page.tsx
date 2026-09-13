"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Balance = {
  product_id: string;
  sku: string;
  product_name: string;
  location_id: string;
  location_code: string;
  location_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  weighted_average_cost: number;
  stock_value: number;
};

type Movement = {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  location_id: string;
  location_code: string;
  location_name: string;
  movement_type: string;
  quantity: number;
  unit_cost: number | null;
  currency: string | null;
  reference_type: string | null;
  reference_number: string | null;
  reason: string | null;
  notes: string | null;
  occurred_at: string;
  created_at: string;
};

export default function InventoryPage() {
  const router = useRouter();

  const [balances, setBalances] = useState<Balance[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"balances" | "movements">("balances");
  const [search, setSearch] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<Balance | null>(null);
  const [adjustType, setAdjustType] = useState<"adjustment_in" | "adjustment_out">("adjustment_out");
  const [adjustQty, setAdjustQty] = useState("1");
  const [adjustCost, setAdjustCost] = useState("");
  const [adjustReference, setAdjustReference] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const token = await user.getIdToken();

        const [balancesResponse, movementsResponse] = await Promise.all([
          fetch(`${API_URL}/api/inventory/balances`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_URL}/api/inventory/movements`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!balancesResponse.ok) {
          throw new Error(`Balances API: ${balancesResponse.status}`);
        }

        if (!movementsResponse.ok) {
          throw new Error(`Movements API: ${movementsResponse.status}`);
        }

        const balancesData = await balancesResponse.json();
        const movementsData = await movementsResponse.json();

        setBalances(balancesData.balances || []);
        setMovements(movementsData.movements || []);
      } catch (err) {
        console.error(err);
        setError("Unable to load inventory data.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  function openAdjustment(item: Balance) {
    setAdjustItem(item);
    setAdjustType("adjustment_out");
    setAdjustQty("1");
    setAdjustCost("");
    setAdjustReference("");
    setAdjustReason("");
    setAdjustNotes("");
    setAdjustOpen(true);
  }

  async function submitAdjustment() {
    if (!adjustItem || !auth.currentUser) return;
    if (Number(adjustQty) <= 0 || !adjustReason.trim()) {
      setError("Quantity and reason are required.");
      return;
    }
    if (
      adjustType === "adjustment_in" &&
      (adjustCost.trim() === "" || Number(adjustCost) < 0)
    ) {
      setError("Enter a valid unit cost.");
      return;
    }

    setAdjustSaving(true);
    setError("");

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_URL}/api/inventory/adjustments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: adjustItem.product_id,
          location_id: adjustItem.location_id,
          adjustment_type: adjustType,
          quantity: Number(adjustQty),
          unit_cost: adjustType === "adjustment_in" ? Number(adjustCost) : null,
          currency: "AOA",
          reference_number: adjustReference || null,
          reason: adjustReason,
          notes: adjustNotes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Adjustment failed: ${response.status}`);
      }

      setAdjustOpen(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adjustment failed.");
    } finally {
      setAdjustSaving(false);
    }
  }

  const filteredBalances = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return balances;

    return balances.filter(
      (item) =>
        item.sku.toLowerCase().includes(q) ||
        item.product_name.toLowerCase().includes(q) ||
        item.location_name.toLowerCase().includes(q)
    );
  }, [balances, search]);

  const filteredMovements = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return movements;

    return movements.filter(
      (item) =>
        item.sku.toLowerCase().includes(q) ||
        item.product_name.toLowerCase().includes(q) ||
        item.movement_type.toLowerCase().includes(q) ||
        (item.reference_number || "").toLowerCase().includes(q)
    );
  }, [movements, search]);

  const totalUnits = balances.reduce(
    (sum, item) => sum + Number(item.quantity_on_hand || 0),
    0
  );

  const totalStockValue = balances.reduce(
    (sum, item) => sum + Number(item.stock_value || 0),
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="text-slate-600">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <aside className="min-h-screen w-64 bg-slate-900 p-5 text-white">
          <div className="mb-8 text-xl font-bold">PEN Inventory</div>

          <nav className="space-y-2">
            {[
              ["Dashboard", "/dashboard"],
              ["Products", "/products"],
              ["Inventory", "/inventory"],
              ["Purchases", "/purchases"],
              ["Sales", "/sales"],
              ["Suppliers", "/suppliers"],
              ["Customers", "/customers"],
              ["Reports", "/reports"],
              ["Users", "/users"],
              ["Settings", "/settings"],
            ].map(([label, href]) => (
              <button
                key={label}
                onClick={() => router.push(href)}
                className={`w-full rounded-lg px-4 py-2 text-left ${
                  label === "Inventory"
                    ? "bg-slate-700"
                    : "hover:bg-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Inventory
              </h1>
              <p className="mt-1 text-slate-500">
                Stock balances and inventory movement history
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-lg bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryCard
              label="Products / Locations"
              value={String(balances.length)}
            />
            <SummaryCard
              label="Units On Hand"
              value={formatQty(totalUnits)}
            />
            <SummaryCard
              label="Stock Value"
              value={formatMoney(totalStockValue, "AOA")}
            />
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setTab("balances")}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                tab === "balances"
                  ? "bg-slate-900 text-white"
                  : "border bg-white text-slate-700"
              }`}
            >
              Stock Balances
            </button>

            <button
              onClick={() => setTab("movements")}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                tab === "movements"
                  ? "bg-slate-900 text-white"
                  : "border bg-white text-slate-700"
              }`}
            >
              Movement History
            </button>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU, product or reference..."
              className="ml-auto w-80 rounded-lg border bg-white px-4 py-2 text-sm"
            />
          </div>

          {tab === "balances" && (
            <div className="overflow-hidden rounded-xl border bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <Th>SKU</Th>
                      <Th>Product</Th>
                      <Th>Location</Th>
                      <Th>On Hand</Th>
                      <Th>Reserved</Th>
                      <Th>Available</Th>
                      <Th>Avg Cost</Th>
                      <Th>Stock Value</Th>
                      <Th>Action</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredBalances.map((item) => (
                      <tr
                        key={`${item.product_id}-${item.location_id}`}
                        className="border-t"
                      >
                        <Td>{item.sku}</Td>
                        <Td>{item.product_name}</Td>
                        <Td>{item.location_name}</Td>
                        <Td>{formatQty(item.quantity_on_hand)}</Td>
                        <Td>{formatQty(item.quantity_reserved)}</Td>
                        <Td>{formatQty(item.quantity_available)}</Td>
                        <Td>
                          {formatMoney(
                            Number(item.weighted_average_cost || 0),
                            "AOA"
                          )}
                        </Td>
                        <Td>
                          {formatMoney(
                            Number(item.stock_value || 0),
                            "AOA"
                          )}
                        </Td>
                        <Td>
                          <button
                            onClick={() => openAdjustment(item)}
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                          >
                            Adjust
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "movements" && (
            <div className="overflow-hidden rounded-xl border bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <Th>Date</Th>
                      <Th>SKU</Th>
                      <Th>Product</Th>
                      <Th>Location</Th>
                      <Th>Movement</Th>
                      <Th>Quantity</Th>
                      <Th>Unit Cost</Th>
                      <Th>Reference</Th>
                      <Th>Reason</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredMovements.map((item) => (
                      <tr key={item.id} className="border-t">
                        <Td>{formatDate(item.occurred_at)}</Td>
                        <Td>{item.sku}</Td>
                        <Td>{item.product_name}</Td>
                        <Td>{item.location_name}</Td>
                        <Td>{formatMovement(item.movement_type)}</Td>
                        <Td>{formatQty(item.quantity)}</Td>
                        <Td>
                          {item.unit_cost !== null
                            ? formatMoney(
                                Number(item.unit_cost),
                                item.currency || "AOA"
                              )
                            : "—"}
                        </Td>
                        <Td>{item.reference_number || "—"}</Td>
                        <Td>{item.reason || "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {adjustOpen && adjustItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Adjust Stock
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {adjustItem.sku} · {adjustItem.product_name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {adjustItem.location_name} · On hand: {formatQty(adjustItem.quantity_on_hand)}
                    </p>
                  </div>

                  <button
                    onClick={() => setAdjustOpen(false)}
                    className="text-xl text-slate-400 hover:text-slate-700"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Adjustment</label>
                    <select
                      value={adjustType}
                      onChange={(e) =>
                        setAdjustType(
                          e.target.value as "adjustment_in" | "adjustment_out"
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    >
                      <option value="adjustment_out">Decrease stock</option>
                      <option value="adjustment_in">Increase stock</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Quantity</label>
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  {adjustType === "adjustment_in" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Unit Cost (AOA)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={adjustCost}
                        onChange={(e) => setAdjustCost(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Reference
                    </label>
                    <input
                      value={adjustReference}
                      onChange={(e) => setAdjustReference(e.target.value)}
                      placeholder="e.g. GR-000002-REV"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Reason *
                    </label>
                    <input
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      placeholder="Reason for stock adjustment"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                    <textarea
                      value={adjustNotes}
                      onChange={(e) => setAdjustNotes(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setAdjustOpen(false)}
                    className="rounded-lg border px-4 py-2"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={submitAdjustment}
                    disabled={adjustSaving}
                    className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
                  >
                    {adjustSaving ? "Saving..." : "Confirm Adjustment"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-slate-700">{children}</td>;
}

function formatQty(value: number) {
  return Number(value || 0).toLocaleString("en-ZA", {
    maximumFractionDigits: 3,
  });
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMovement(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
