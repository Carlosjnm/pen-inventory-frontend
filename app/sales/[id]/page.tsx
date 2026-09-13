"use client";

import { use, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type SaleItem = {
  id: string;
  product_id: string;
  variant_id: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
  sku: string;
  product_name: string;
};

type SalesOrder = {
  id: string;
  sale_number: string;
  status: string;
  sales_channel: string;
  currency: string;
  sale_date: string;
  subtotal_amount?: number;
  shipping_amount?: number;
  total_amount: number;
  customer_reference: string | null;
  customer_id: string | null;
  customer_name: string | null;
  location_id: string;
  location_code: string | null;
  location_name: string | null;
  amount_paid: number;
  balance_due: number;
  notes?: string | null;
  items: SaleItem[];
};

type Payment = {
  id: string;
  payment_number: string;
  payment_method: string;
  amount: number;
  currency: string;
  status: string;
  payment_reference: string | null;
  paid_at: string | null;
  notes: string | null;
};

export default function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [sale, setSale] = useState<SalesOrder | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      setFirebaseUser(user);
      await loadSale(user);
    });

    return () => unsubscribe();
  }, [id]);

  async function loadSale(user: User) {
    try {
      setLoading(true);
      setMessage("");

      const token = await user.getIdToken();

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [saleResponse, paymentsResponse] = await Promise.all([
        fetch(`${API_URL}/api/sales-orders/${id}`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/sales-orders/${id}/payments`, {
          headers,
          cache: "no-store",
        }),
      ]);

      const saleData = await saleResponse.json().catch(() => ({}));

      if (!saleResponse.ok) {
        throw new Error(
          saleData.detail || "Unable to load sales order."
        );
      }

      setSale(saleData.sales_order);

      if (paymentsResponse.ok) {
        const paymentData = await paymentsResponse.json();
        setPayments(paymentData.payments || []);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load sales order."
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitSale() {
    if (!firebaseUser || !sale) return;

    try {
      setActionLoading(true);
      setMessage("");
      setPaymentError("");

      const token = await firebaseUser.getIdToken();

      const response = await fetch(
        `${API_URL}/api/sales-orders/${sale.id}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to submit sales order."
        );
      }

      await loadSale(firebaseUser);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit sales order."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function recordPayment() {
    if (!firebaseUser || !sale) return;

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Enter a valid payment amount.");
      return;
    }

    try {
      setActionLoading(true);
      setMessage("");
      setPaymentError("");

      const token = await firebaseUser.getIdToken();

      const response = await fetch(
        `${API_URL}/api/sales-orders/${sale.id}/payments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payment_method: paymentMethod,
            amount,
            payment_reference:
              paymentReference.trim() || null,
            notes: paymentNotes.trim() || null,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to record payment."
        );
      }

      setShowPayment(false);
      setPaymentAmount("");
      setPaymentReference("");
      setPaymentNotes("");

      await loadSale(firebaseUser);
    } catch (error) {
      console.error(error);
      setPaymentError(
        error instanceof Error
          ? error.message
          : "Unable to record payment."
      );
    } finally {
      setActionLoading(false);
    }
  }

  function formatMoney(
    value: number | string | null | undefined,
    currency = "AOA"
  ) {
    const amount = Number(value || 0);

    return `${currency} ${amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatStatus(value: string) {
    return value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function statusClass(value: string) {
    if (value === "paid") {
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    }

    if (value === "pending_payment") {
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    }

    if (value === "draft") {
      return "bg-slate-100 text-slate-700 ring-slate-500/20";
    }

    return "bg-blue-50 text-blue-700 ring-blue-600/20";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-600">
        Loading sale...
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-white p-8 text-red-600 shadow-sm">
          {message || "Sales order not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-6 px-4 py-5 md:px-8">
          <div>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/sales";
              }}
              className="mb-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
            >
              ← Back to Sales
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                {sale.sale_number}
              </h1>

              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(
                  sale.status
                )}`}
              >
                {formatStatus(sale.status)}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {formatDate(sale.sale_date)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {sale.status === "draft" && (
              <button
                type="button"
                onClick={submitSale}
                disabled={actionLoading}
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {actionLoading
                  ? "Submitting..."
                  : "Submit Sale"}
              </button>
            )}

            {sale.status === "pending_payment" && (
              <button
                type="button"
                onClick={() => {
                  setPaymentAmount(
                    String(Number(sale.balance_due || 0))
                  );
                  setShowPayment(true);
                }}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Record Payment
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-8">
        {message && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Sale Information
              </h2>

              <div className="mt-5 grid gap-x-8 gap-y-5 md:grid-cols-2">
                <InfoRow
                  label="Customer"
                  value={sale.customer_name || "Walk-in customer"}
                />

                <InfoRow
                  label="Customer Reference"
                  value={sale.customer_reference || "—"}
                />

                <InfoRow
                  label="Sales Channel"
                  value={formatStatus(sale.sales_channel)}
                />

                <InfoRow
                  label="Location"
                  value={
                    sale.location_name ||
                    sale.location_code ||
                    "—"
                  }
                />

                <InfoRow
                  label="Currency"
                  value={sale.currency}
                />

                <InfoRow
                  label="Status"
                  value={formatStatus(sale.status)}
                />
              </div>

              {sale.notes && (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Notes
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {sale.notes}
                  </p>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-bold text-slate-950">
                  Items
                </h2>
              </div>

              {sale.items.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-500">
                  No items on this sale.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-6 py-4">Product</th>
                        <th className="px-6 py-4 text-right">
                          Qty
                        </th>
                        <th className="px-6 py-4 text-right">
                          Unit Price
                        </th>
                        <th className="px-6 py-4 text-right">
                          Discount
                        </th>
                        <th className="px-6 py-4 text-right">
                          Tax
                        </th>
                        <th className="px-6 py-4 text-right">
                          Total
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {sale.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-5">
                            <div className="font-semibold text-slate-900">
                              {item.product_name}
                            </div>
                            <div className="mt-1 font-mono text-xs text-slate-400">
                              {item.sku}
                            </div>
                            {item.description &&
                              item.description !==
                                item.product_name && (
                                <div className="mt-1 text-xs text-slate-500">
                                  {item.description}
                                </div>
                              )}
                          </td>

                          <td className="px-6 py-5 text-right text-sm">
                            {Number(item.quantity)}
                          </td>

                          <td className="px-6 py-5 text-right text-sm">
                            {formatMoney(
                              item.unit_price,
                              sale.currency
                            )}
                          </td>

                          <td className="px-6 py-5 text-right text-sm text-slate-500">
                            {formatMoney(
                              item.discount_amount,
                              sale.currency
                            )}
                          </td>

                          <td className="px-6 py-5 text-right text-sm text-slate-500">
                            {formatMoney(
                              item.tax_amount,
                              sale.currency
                            )}
                          </td>

                          <td className="px-6 py-5 text-right font-semibold text-slate-900">
                            {formatMoney(
                              item.line_total,
                              sale.currency
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-bold text-slate-950">
                  Payments
                </h2>
              </div>

              {payments.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  No payments recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-6 py-4">Payment</th>
                        <th className="px-6 py-4">Method</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4 text-right">
                          Amount
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-5">
                            <div className="font-mono text-sm font-semibold text-slate-900">
                              {payment.payment_number}
                            </div>
                            {payment.payment_reference && (
                              <div className="mt-1 text-xs text-slate-500">
                                Ref: {payment.payment_reference}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-5 text-sm text-slate-600">
                            {formatStatus(
                              payment.payment_method
                            )}
                          </td>

                          <td className="px-6 py-5 text-sm text-slate-600">
                            {formatDate(payment.paid_at)}
                          </td>

                          <td className="px-6 py-5 text-right font-semibold text-slate-900">
                            {formatMoney(
                              payment.amount,
                              payment.currency
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <aside>
            <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Payment Summary
              </h2>

              <div className="mt-6 space-y-4">
                <SummaryRow
                  label="Total"
                  value={formatMoney(
                    sale.total_amount,
                    sale.currency
                  )}
                />

                <SummaryRow
                  label="Paid"
                  value={formatMoney(
                    sale.amount_paid,
                    sale.currency
                  )}
                />

                <div className="border-t border-slate-200 pt-4">
                  <SummaryRow
                    label="Balance Due"
                    value={formatMoney(
                      sale.balance_due,
                      sale.currency
                    )}
                    strong
                  />
                </div>
              </div>

              {sale.status === "draft" && (
                <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  Submit this sale when the order is confirmed.
                  After submission, payments can be recorded.
                </div>
              )}

              {sale.status === "pending_payment" && (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentAmount(
                      String(Number(sale.balance_due || 0))
                    );
                    setShowPayment(true);
                  }}
                  className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Record Payment
                </button>
              )}

              {sale.status === "paid" && (
                <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  This sale has been paid in full.
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Record Payment
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Outstanding balance:{" "}
                  {formatMoney(
                    sale.balance_due,
                    sale.currency
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPayment(false)}
                className="text-xl text-slate-400 hover:text-slate-900"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {paymentError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                  <div className="font-bold">Cannot Complete Payment</div>
                  <div className="mt-1">{paymentError}</div>
                </div>
              )}

              <Field label="Payment Method">
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value)
                  }
                  className="input"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">
                    Bank Transfer
                  </option>
                  <option value="multicaixa">Multicaixa</option>
                  <option value="card">Card</option>
                  <option value="online">Online</option>
                  <option value="voucher">Voucher</option>
                  <option value="other">Other</option>
                </select>
              </Field>

              <Field label="Amount">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(event) =>
                    setPaymentAmount(event.target.value)
                  }
                  className="input"
                />
              </Field>

              <Field label="Reference">
                <input
                  value={paymentReference}
                  onChange={(event) =>
                    setPaymentReference(event.target.value)
                  }
                  placeholder="Optional payment reference"
                  className="input"
                />
              </Field>

              <Field label="Notes">
                <textarea
                  rows={3}
                  value={paymentNotes}
                  onChange={(event) =>
                    setPaymentNotes(event.target.value)
                  }
                  placeholder="Optional notes"
                  className="input resize-none"
                />
              </Field>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPayment(false)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={recordPayment}
                disabled={actionLoading}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading
                  ? "Saving..."
                  : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          padding: 0.75rem 1rem;
          color: rgb(15 23 42);
          outline: none;
        }

        .input:focus {
          border-color: rgb(148 163 184);
          background: white;
        }
      `}</style>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-slate-700">
        {label}
      </div>
      {children}
    </label>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={
          strong
            ? "font-bold text-slate-950"
            : "text-sm text-slate-500"
        }
      >
        {label}
      </span>

      <span
        className={
          strong
            ? "text-xl font-bold text-slate-950"
            : "text-sm font-semibold text-slate-800"
        }
      >
        {value}
      </span>
    </div>
  );
}
