"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type SalesOrder = {
  id: string;
  sale_number: string;
  status: string;
  sales_channel: string;
  currency: string;
  sale_date: string;
  total_amount: number;
  customer_reference: string | null;
  customer_id: string | null;
  customer_name: string | null;
  location_id: string;
  location_code: string | null;
  location_name: string | null;
  amount_paid: number;
  balance_due: number;
};

export default function SalesPage() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      try {
        const token = await user.getIdToken();

        const response = await fetch(`${API_URL}/api/sales-orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.detail || "Unable to load sales orders.");
        }

        const data = await response.json();
        setSalesOrders(data.sales_orders || []);
      } catch (error) {
        console.error(error);
        setMessage(
          error instanceof Error ? error.message : "Unable to load sales orders."
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const statuses = useMemo(
    () =>
      Array.from(new Set(salesOrders.map((order) => order.status))).sort(),
    [salesOrders]
  );

  const channels = useMemo(
    () =>
      Array.from(
        new Set(salesOrders.map((order) => order.sales_channel))
      ).sort(),
    [salesOrders]
  );

  const filteredSales = useMemo(() => {
    const query = search.trim().toLowerCase();

    return salesOrders.filter((order) => {
      const matchesSearch =
        !query ||
        order.sale_number.toLowerCase().includes(query) ||
        (order.customer_name || "").toLowerCase().includes(query) ||
        (order.customer_reference || "").toLowerCase().includes(query) ||
        (order.location_name || "").toLowerCase().includes(query);

      const matchesStatus = !status || order.status === status;
      const matchesChannel = !channel || order.sales_channel === channel;

      return matchesSearch && matchesStatus && matchesChannel;
    });
  }, [salesOrders, search, status, channel]);

  const totalSales = salesOrders.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0
  );

  const totalPaid = salesOrders.reduce(
    (sum, order) => sum + Number(order.amount_paid || 0),
    0
  );

  const totalOutstanding = salesOrders.reduce(
    (sum, order) => sum + Number(order.balance_due || 0),
    0
  );

  const paidOrders = salesOrders.filter(
    (order) => order.status === "paid"
  ).length;

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  function clearFilters() {
    setSearch("");
    setStatus("");
    setChannel("");
  }

  function formatStatus(value: string) {
    return value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function formatMoney(value: number | string | null, currency = "AOA") {
    const amount = Number(value || 0);

    return `${currency} ${amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatDate(value: string) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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

    if (value === "cancelled") {
      return "bg-red-50 text-red-700 ring-red-600/20";
    }

    return "bg-blue-50 text-blue-700 ring-blue-600/20";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-slate-950 text-white lg:block">
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <div>
            <div className="text-xl font-bold tracking-tight">PEN</div>
            <div className="text-xs text-slate-400">Inventory</div>
          </div>
        </div>

        <nav className="space-y-1 px-3 py-5 text-sm">
          <NavItem label="Dashboard" icon="⌂" href="/dashboard" />
          <NavItem label="Products" icon="▦" href="/products" />
          <NavItem label="Inventory" icon="▣" href="/inventory" />
          <NavItem label="Purchases" icon="↓" href="/purchases" />
          <NavItem label="Sales" icon="↑" active href="/sales" />
          <NavItem label="Suppliers" icon="♢" href="/suppliers" />
          <NavItem label="Customers" icon="♙" href="/customers" />
          <NavItem label="Reports" icon="▤" href="/reports" />
          <NavItem label="Users" icon="♧" href="/users" />
          <NavItem label="Settings" icon="⚙" href="/settings" />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-20 items-center justify-between px-4 md:px-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                Sales
              </h1>
              <p className="text-sm text-slate-500">
                Manage sales orders and payments
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                onClick={() => {
                  window.location.href = "/sales/new";
                }}
              >
                New Sale
              </button>

              <div className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:block">
                {salesOrders.length} orders
              </div>

              <button
                onClick={handleLogout}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total Sales"
                value={formatMoney(totalSales)}
                detail={`${salesOrders.length} sales orders`}
              />
              <SummaryCard
                label="Paid"
                value={formatMoney(totalPaid)}
                detail={`${paidOrders} fully paid`}
              />
              <SummaryCard
                label="Outstanding"
                value={formatMoney(totalOutstanding)}
                detail="Amount still to collect"
              />
              <SummaryCard
                label="Paid Orders"
                value={String(paidOrders)}
                detail="Completed payment"
              />
            </section>

            <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr_1fr_auto]">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    ⌕
                  </span>

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search sale, customer, reference..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                >
                  <option value="">All statuses</option>
                  {statuses.map((value) => (
                    <option key={value} value={value}>
                      {formatStatus(value)}
                    </option>
                  ))}
                </select>

                <select
                  value={channel}
                  onChange={(event) => setChannel(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                >
                  <option value="">All channels</option>
                  {channels.map((value) => (
                    <option key={value} value={value}>
                      {formatStatus(value)}
                    </option>
                  ))}
                </select>

                <button
                  onClick={clearFilters}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
            </section>

            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-800">
                  {filteredSales.length}
                </span>{" "}
                of {salesOrders.length} orders
              </p>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                Loading sales orders...
              </div>
            ) : message ? (
              <div className="rounded-2xl border border-red-200 bg-white p-8 text-red-600 shadow-sm">
                {message}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead className="border-b border-slate-200 bg-slate-50/80">
                      <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-6 py-4">Sale</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Channel</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4 text-right">Total</th>
                        <th className="px-6 py-4 text-right">Paid</th>
                        <th className="px-6 py-4 text-right">Balance</th>
                        <th className="w-12 px-4 py-4" />
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredSales.map((order) => (
                        <tr
                          key={order.id}
                          onClick={() => {
                            window.location.href = `/sales/${order.id}`;
                          }}
                          className="group cursor-pointer transition hover:bg-slate-50"
                        >
                          <td className="px-6 py-5">
                            <div className="font-mono text-sm font-semibold text-slate-900">
                              {order.sale_number}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {order.location_name ||
                                order.location_code ||
                                "—"}
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <div className="font-semibold text-slate-900">
                              {order.customer_name || "Walk-in customer"}
                            </div>
                            {order.customer_reference && (
                              <div className="mt-1 text-xs text-slate-500">
                                Ref: {order.customer_reference}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-5 text-sm text-slate-600">
                            {formatStatus(order.sales_channel)}
                          </td>

                          <td className="px-6 py-5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(
                                order.status
                              )}`}
                            >
                              {formatStatus(order.status)}
                            </span>
                          </td>

                          <td className="px-6 py-5 text-sm text-slate-600">
                            {formatDate(order.sale_date)}
                          </td>

                          <td className="px-6 py-5 text-right font-semibold text-slate-800">
                            {formatMoney(order.total_amount, order.currency)}
                          </td>

                          <td className="px-6 py-5 text-right text-emerald-700">
                            {formatMoney(order.amount_paid, order.currency)}
                          </td>

                          <td className="px-6 py-5 text-right font-semibold text-slate-800">
                            {formatMoney(order.balance_due, order.currency)}
                          </td>

                          <td className="px-4 py-5 text-right text-slate-300 transition group-hover:text-slate-600">
                            →
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredSales.length === 0 && (
                  <div className="px-6 py-16 text-center">
                    <div className="text-lg font-semibold text-slate-700">
                      No sales orders found
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Create your first sale or change the filters.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({
  label,
  icon,
  active = false,
  href,
}: {
  label: string;
  icon: string;
  active?: boolean;
  href?: string;
}) {
  return (
    <div
      onClick={() => {
        if (href) window.location.href = href;
      }}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium ${
        active
          ? "bg-white text-slate-950"
          : href
          ? "cursor-pointer text-slate-400 transition hover:bg-white/10 hover:text-white"
          : "cursor-default text-slate-400"
      }`}
    >
      <span className="w-5 text-center text-base">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-400">{detail}</div>
    </div>
  );
}
