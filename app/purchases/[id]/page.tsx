"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type PurchaseOrderItem = {
  id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  supplier_sku: string | null;
  description: string | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  line_total: number;
};

type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  destination_location_id: string;
  destination_location_name: string;
  status: string;
  currency: string;
  order_date: string | null;
  expected_date: string | null;
  supplier_reference: string | null;
  notes: string | null;
  freight_cost: number;
  customs_cost: number;
  tax_cost: number;
  other_cost: number;
  subtotal: number;
  total: number;
  item_count: number;
  items: PurchaseOrderItem[];
};

type ReceiptItem = {
  id: string;
  product_sku: string;
  product_name: string;
  quantity_received: number;
  unit_cost: number;
  landed_unit_cost: number;
  base_landed_unit_cost: number;
  inventory_currency: string | null;
  inventory_unit_cost: number | null;
};

type GoodsReceipt = {
  id: string;
  receipt_number: string;
  received_at: string;
  source_currency: string;
  base_currency: string;
  exchange_rate_to_base: number;
  supplier_delivery_reference: string | null;
  notes: string | null;
  items: ReceiptItem[];
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const purchaseOrderId = String(params.id || "");

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [purchaseOrder, setPurchaseOrder] =
    useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [exchangeRate, setExchangeRate] = useState("");
  const [deliveryReference, setDeliveryReference] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");
  const [receiveQuantities, setReceiveQuantities] =
    useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      setFirebaseUser(user);

      if (purchaseOrderId) {
        await loadPurchaseOrder(user);
      }
    });

    return () => unsubscribe();
  }, [purchaseOrderId]);

  async function loadPurchaseOrder(user: User) {
    try {
      setLoading(true);
      setMessage("");

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/purchase-orders/${purchaseOrderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load purchase order.");
      }

      setPurchaseOrder(data.purchase_order || null);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load purchase order."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  function openReceiveGoods() {
    if (!purchaseOrder) return;

    const quantities: Record<string, string> = {};

    for (const item of purchaseOrder.items) {
      const remaining =
        Number(item.quantity_ordered) - Number(item.quantity_received || 0);

      quantities[item.id] = remaining > 0 ? String(remaining) : "0";
    }

    setReceiveQuantities(quantities);
    setExchangeRate(purchaseOrder.currency === "AOA" ? "1" : "");
    setDeliveryReference("");
    setReceiptNotes("");
    setMessage("");
    setReceiveOpen(true);
  }

  async function submitGoodsReceipt() {
    if (!firebaseUser || !purchaseOrder) return;

    const rate = Number(exchangeRate);

    if (!Number.isFinite(rate) || rate <= 0) {
      setMessage("Enter a valid exchange rate greater than zero.");
      return;
    }

    const selected = purchaseOrder.items
      .map((item) => {
        const quantity = Number(receiveQuantities[item.id] || 0);
        const remaining =
          Number(item.quantity_ordered) -
          Number(item.quantity_received || 0);

        return { item, quantity, remaining };
      })
      .filter((row) => row.quantity > 0);

    if (selected.length === 0) {
      setMessage("Enter a quantity to receive.");
      return;
    }

    for (const row of selected) {
      if (row.quantity > row.remaining) {
        setMessage(
          `${row.item.product_sku}: maximum remaining quantity is ${row.remaining}.`
        );
        return;
      }
    }

    try {
      setReceiving(true);
      setMessage("");

      const token = await firebaseUser.getIdToken();

      const receiptResponse = await fetch(
        `${API_URL}/api/purchase-orders/${purchaseOrder.id}/receipts`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            exchange_rate_to_base: rate,
            supplier_delivery_reference:
              deliveryReference.trim() || null,
            notes: receiptNotes.trim() || null,
          }),
        }
      );

      const receiptData = await receiptResponse.json();

      if (!receiptResponse.ok) {
        throw new Error(
          receiptData.detail || "Unable to create goods receipt."
        );
      }

      const receiptId = receiptData.goods_receipt.id;

      for (const row of selected) {
        const response = await fetch(
          `${API_URL}/api/goods-receipts/${receiptId}/items`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              purchase_order_item_id: row.item.id,
              quantity_received: row.quantity,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to receive purchase order item."
          );
        }
      }

      setReceiveOpen(false);
      await loadPurchaseOrder(firebaseUser);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to receive goods."
      );
    } finally {
      setReceiving(false);
    }
  }

  async function runAction(
    action: "submit" | "approve" | "mark-ordered" | "cancel",
    body?: Record<string, unknown>
  ) {
    if (!firebaseUser || !purchaseOrder) return;

    try {
      setMessage("");

      const token = await firebaseUser.getIdToken();

      const response = await fetch(
        `${API_URL}/api/purchase-orders/${purchaseOrder.id}/${action}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to update purchase order.");
      }

      await loadPurchaseOrder(firebaseUser);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update purchase order."
      );
    }
  }

  async function handleCancel() {
    const reason = window.prompt("Reason for cancellation:");

    if (!reason?.trim()) return;

    await runAction("cancel", {
      reason: reason.trim(),
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading purchase order...
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="font-semibold text-slate-950">
            Purchase order unavailable
          </div>
          <div className="mt-2 text-sm text-red-600">
            {message || "Unable to load this purchase order."}
          </div>
          <a
            href="/purchases"
            className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Back to Purchases
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-slate-950 text-white lg:block">
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <div>
            <div className="text-xl font-bold">PEN</div>
            <div className="text-xs text-slate-400">Inventory</div>
          </div>
        </div>

        <nav className="space-y-1 px-3 py-5 text-sm">
          <NavItem label="Dashboard" icon="⌂" href="/dashboard" />
          <NavItem label="Products" icon="▦" href="/products" />
          <NavItem label="Inventory" icon="▣" href="/inventory" />
          <NavItem label="Purchases" icon="↓" href="/purchases" active />
          <NavItem label="Sales" icon="↑" href="/sales" />
          <NavItem label="Suppliers" icon="♢" href="/suppliers" />
          <NavItem label="Customers" icon="♙" href="/customers" />
          <NavItem label="Reports" icon="▤" href="/reports" />
          <NavItem label="Users" icon="♧" href="/users" />
          <NavItem label="Settings" icon="⚙" href="/settings" />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/10 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
            <div>
              <a
                href="/purchases"
                className="text-sm font-semibold text-slate-500 hover:text-slate-950"
              >
                ← Back to Purchases
              </a>
              <div className="mt-1 flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                  {purchaseOrder.po_number}
                </h1>
                <StatusBadge status={purchaseOrder.status} />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {purchaseOrder.supplier_name}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {purchaseOrder.status === "draft" && (
                <>
                  <button
                    onClick={() => runAction("submit")}
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Submit for Approval
                  </button>

                  <button
                    onClick={handleCancel}
                    className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Cancel PO
                  </button>
                </>
              )}

              {purchaseOrder.status === "pending_approval" && (
                <>
                  <button
                    onClick={() => runAction("approve")}
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Approve
                  </button>

                  <button
                    onClick={handleCancel}
                    className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Cancel PO
                  </button>
                </>
              )}

              {purchaseOrder.status === "approved" && (
                <button
                  onClick={() => runAction("mark-ordered")}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Mark as Ordered
                </button>
              )}

              {["ordered", "partially_received"].includes(
                purchaseOrder.status
              ) && (
                <button
                  type="button"
                  onClick={openReceiveGoods}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Receive Goods
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            {message && (
              <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {message}
              </div>
            )}

            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Supplier"
                value={purchaseOrder.supplier_name}
                detail={purchaseOrder.supplier_reference || "No supplier reference"}
              />
              <SummaryCard
                label="Destination"
                value={purchaseOrder.destination_location_name}
                detail="Receiving location"
              />
              <SummaryCard
                label="Currency"
                value={purchaseOrder.currency}
                detail="Purchase order currency"
              />
              <SummaryCard
                label="Total"
                value={formatMoney(
                  purchaseOrder.total,
                  purchaseOrder.currency
                )}
                detail={`${purchaseOrder.item_count} item${
                  purchaseOrder.item_count === 1 ? "" : "s"
                }`}
              />
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="font-bold text-slate-950">
                    Purchase Order Items
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Products ordered from this supplier
                  </p>
                </div>

                {purchaseOrder.status === "draft" && (
                  <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    + Add Item
                  </button>
                )}
              </div>

              {purchaseOrder.items.length === 0 ? (
                <div className="p-8 text-sm text-slate-500">
                  No items have been added to this purchase order.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <TableHead>Product</TableHead>
                        <TableHead>Supplier SKU</TableHead>
                        <TableHead align="right">Ordered</TableHead>
                        <TableHead align="right">Received</TableHead>
                        <TableHead align="right">Unit Cost</TableHead>
                        <TableHead align="right">Line Total</TableHead>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {purchaseOrder.items.map((item) => (
                        <tr key={item.id}>
                          <TableCell>
                            <div className="font-semibold text-slate-950">
                              {item.product_sku}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              {item.product_name}
                            </div>
                          </TableCell>

                          <TableCell>
                            {item.supplier_sku || "—"}
                          </TableCell>

                          <TableCell align="right">
                            {item.quantity_ordered}
                          </TableCell>

                          <TableCell align="right">
                            {item.quantity_received}
                          </TableCell>

                          <TableCell align="right">
                            {formatMoney(
                              item.unit_cost,
                              purchaseOrder.currency
                            )}
                          </TableCell>

                          <TableCell align="right">
                            <span className="font-semibold text-slate-950">
                              {formatMoney(
                                Number(item.quantity_ordered) *
                                  Number(item.unit_cost),
                                purchaseOrder.currency
                              )}
                            </span>
                          </TableCell>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </div>
        </main>
      </div>

      {receiveOpen && purchaseOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Receive Goods
                </h2>
                <p className="text-sm text-slate-500">
                  {purchaseOrder.po_number} · {purchaseOrder.supplier_name}
                </p>
              </div>

              <button
                onClick={() => setReceiveOpen(false)}
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Exchange Rate to AOA
                  <input
                    type="number"
                    step="0.00000001"
                    min="0"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    disabled={purchaseOrder.currency === "AOA"}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-slate-950"
                    placeholder="e.g. 150"
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Supplier Delivery Reference
                  <input
                    value={deliveryReference}
                    onChange={(e) => setDeliveryReference(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-slate-950"
                    placeholder="Optional"
                  />
                </label>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                {purchaseOrder.items.map((item) => {
                  const remaining =
                    Number(item.quantity_ordered) -
                    Number(item.quantity_received || 0);

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1fr_120px] gap-4 border-b border-slate-100 p-4 last:border-b-0"
                    >
                      <div>
                        <div className="font-semibold text-slate-950">
                          {item.product_sku} · {item.product_name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Ordered {item.quantity_ordered} · Already received{" "}
                          {item.quantity_received} · Remaining {remaining}
                        </div>
                      </div>

                      <label className="text-xs font-semibold text-slate-500">
                        Receive Now
                        <input
                          type="number"
                          min="0"
                          max={remaining}
                          step="1"
                          value={receiveQuantities[item.id] || ""}
                          onChange={(e) =>
                            setReceiveQuantities((current) => ({
                              ...current,
                              [item.id]: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-950"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>

              <label className="block text-sm font-semibold text-slate-700">
                Receipt Notes
                <textarea
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-slate-950"
                  placeholder="Optional notes"
                />
              </label>

              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                Receiving goods creates permanent inventory movements. Confirm
                the quantities and exchange rate carefully before posting.
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setReceiveOpen(false)}
                disabled={receiving}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>

              <button
                onClick={submitGoodsReceipt}
                disabled={receiving}
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {receiving ? "Receiving..." : "Confirm Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({
  label,
  icon,
  href,
  active = false,
}: {
  label: string;
  icon: string;
  href: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
        active
          ? "bg-white/10 font-semibold text-white"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="w-5 text-center">{icon}</span>
      <span>{label}</span>
    </a>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-bold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{detail}</div>
    </div>
  );
}

function TableHead({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={`px-5 py-4 text-sm text-slate-700 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    pending_approval: "bg-amber-100 text-amber-800",
    approved: "bg-blue-100 text-blue-800",
    ordered: "bg-indigo-100 text-indigo-800",
    partially_received: "bg-violet-100 text-violet-800",
    received: "bg-emerald-100 text-emerald-800",
    closed: "bg-slate-200 text-slate-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
        styles[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatMoney(value: number | string | null, currency: string) {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
