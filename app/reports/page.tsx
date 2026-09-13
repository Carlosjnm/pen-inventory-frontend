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
  customer_name: string | null;
  location_name: string | null;
  amount_paid: number;
  balance_due: number;
};

type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier_name: string;
  destination_location_name: string;
  status: string;
  currency: string;
  order_date: string | null;
  total: number;
  item_count: number;
  created_at: string;
};

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
  movement_count: number;
};

export default function ReportsPage() {
  const [sales, setSales] = useState<SalesOrder[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      try {
        setLoading(true);
        setMessage("");

        const token = await user.getIdToken();
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [salesResponse, purchasesResponse, balancesResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/sales-orders`, {
              headers,
              cache: "no-store",
            }),
            fetch(`${API_URL}/api/purchase-orders`, {
              headers,
              cache: "no-store",
            }),
            fetch(`${API_URL}/api/inventory/balances`, {
              headers,
              cache: "no-store",
            }),
          ]);

        if (!salesResponse.ok) {
          throw new Error("Unable to load sales report data.");
        }

        if (!purchasesResponse.ok) {
          throw new Error("Unable to load purchase report data.");
        }

        if (!balancesResponse.ok) {
          throw new Error("Unable to load inventory report data.");
        }

        const salesData = await salesResponse.json();
        const purchasesData = await purchasesResponse.json();
        const balancesData = await balancesResponse.json();

        setSales(salesData.sales_orders || []);
        setPurchases(purchasesData.purchase_orders || []);
        setBalances(balancesData.balances || []);
      } catch (error) {
        console.error(error);
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load reports."
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const metrics = useMemo(() => {
    const paidSales = sales.filter((sale) => sale.status === "paid");

    const salesRevenue = paidSales.reduce(
      (sum, sale) => sum + Number(sale.total_amount || 0),
      0
    );

    const paymentsReceived = sales.reduce(
      (sum, sale) => sum + Number(sale.amount_paid || 0),
      0
    );

    const outstanding = sales
      .filter(
        (sale) =>
          sale.status !== "draft" &&
          sale.status !== "cancelled" &&
          sale.status !== "paid"
      )
      .reduce(
        (sum, sale) => sum + Number(sale.balance_due || 0),
        0
      );

    const inventoryValue = balances.reduce(
      (sum, balance) => sum + Number(balance.stock_value || 0),
      0
    );

    const unitsOnHand = balances.reduce(
      (sum, balance) => sum + Number(balance.quantity_on_hand || 0),
      0
    );

    const outOfStock = balances.filter(
      (balance) =>
        Number(balance.movement_count || 0) > 0 &&
        Number(balance.quantity_available || 0) <= 0
    ).length;

    const notStockedYet = balances.filter(
      (balance) =>
        Number(balance.movement_count || 0) === 0 &&
        Number(balance.quantity_available || 0) <= 0
    ).length;

    return {
      salesRevenue,
      paymentsReceived,
      outstanding,
      inventoryValue,
      unitsOnHand,
      outOfStock,
      notStockedYet,
      paidOrders: paidSales.length,
    };
  }, [sales, balances]);

  const recentSales = useMemo(
    () => sales.slice(0, 5),
    [sales]
  );

  const recentPurchases = useMemo(
    () =>
      [...purchases]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )
        .slice(0, 5),
    [purchases]
  );

  const stockAlerts = useMemo(
    () =>
      balances
        .filter(
          (balance) =>
            Number(balance.movement_count || 0) > 0 &&
            Number(balance.quantity_available || 0) <= 0
        )
        .slice(0, 8),
    [balances]
  );

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  function formatMoney(value: number | string | null, currency = "AOA") {
    const amount = Number(value || 0);

    return `${currency} ${amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatDate(value: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatStatus(value: string) {
    return value
      .split("_")
      .map(
        (part) =>
          part.charAt(0).toUpperCase() + part.slice(1)
      )
      .join(" ");
  }

  function statusClass(value: string) {
    if (
      value === "paid" ||
      value === "received" ||
      value === "closed"
    ) {
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    }

    if (
      value === "pending_payment" ||
      value === "approved" ||
      value === "ordered"
    ) {
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    }

    if (value === "cancelled") {
      return "bg-red-50 text-red-700 ring-red-600/20";
    }

    return "bg-slate-100 text-slate-700 ring-slate-500/20";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-slate-950 text-white lg:block">
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <div>
            <div className="text-xl font-bold tracking-tight">
              PEN
            </div>
            <div className="text-xs text-slate-400">
              Inventory
            </div>
          </div>
        </div>

        <nav className="space-y-1 px-3 py-5 text-sm">
          <NavItem label="Dashboard" icon="⌂" href="/dashboard" />
          <NavItem label="Products" icon="▦" href="/products" />
          <NavItem label="Inventory" icon="▣" href="/inventory" />
          <NavItem label="Purchases" icon="↓" href="/purchases" />
          <NavItem label="Sales" icon="↑" href="/sales" />
          <NavItem label="Suppliers" icon="♢" href="/suppliers" />
          <NavItem label="Customers" icon="♙" href="/customers" />
          <NavItem label="Reports" icon="▤" active href="/reports" />
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
                Reports
              </h1>
              <p className="text-sm text-slate-500">
                Business, sales and inventory overview
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                Loading reports...
              </div>
            ) : message ? (
              <div className="rounded-2xl border border-red-200 bg-white p-8 text-red-600 shadow-sm">
                {message}
              </div>
            ) : (
              <>
                <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    label="Sales Revenue"
                    value={formatMoney(metrics.salesRevenue)}
                    detail={`${metrics.paidOrders} paid orders`}
                  />

                  <SummaryCard
                    label="Payments Received"
                    value={formatMoney(metrics.paymentsReceived)}
                    detail="Collected from customers"
                  />

                  <SummaryCard
                    label="Outstanding"
                    value={formatMoney(metrics.outstanding)}
                    detail="Submitted sales still unpaid"
                  />

                  <SummaryCard
                    label="Inventory Value"
                    value={formatMoney(metrics.inventoryValue)}
                    detail={`${metrics.unitsOnHand.toLocaleString()} units on hand`}
                  />
                </section>

                <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <SmallCard
                    label="Sales Orders"
                    value={sales.length}
                  />
                  <SmallCard
                    label="Purchase Orders"
                    value={purchases.length}
                  />
                  <SmallCard
                    label="Out of Stock"
                    value={metrics.outOfStock}
                    warning={metrics.outOfStock > 0}
                  />
                  <SmallCard
                    label="Not Stocked Yet"
                    value={metrics.notStockedYet}
                  />
                </section>

                <section className="mb-6 grid gap-6 xl:grid-cols-2">
                  <ReportTable
                    title="Recent Sales"
                    actionLabel="View Sales"
                    actionHref="/sales"
                  >
                    <table className="min-w-full text-left">
                      <thead className="border-b border-slate-200 bg-slate-50">
                        <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-5 py-3">Sale</th>
                          <th className="px-5 py-3">Customer</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-right">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentSales.map((sale) => (
                          <tr
                            key={sale.id}
                            onClick={() => {
                              window.location.href = `/sales/${sale.id}`;
                            }}
                            className="cursor-pointer hover:bg-slate-50"
                          >
                            <td className="px-5 py-4">
                              <div className="font-mono text-sm font-semibold text-slate-900">
                                {sale.sale_number}
                              </div>
                              <div className="mt-1 text-xs text-slate-400">
                                {formatDate(sale.sale_date)}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-700">
                              {sale.customer_name ||
                                "Walk-in customer"}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(
                                  sale.status
                                )}`}
                              >
                                {formatStatus(sale.status)}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                              {formatMoney(
                                sale.total_amount,
                                sale.currency
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {recentSales.length === 0 && (
                      <EmptyState text="No sales orders yet." />
                    )}
                  </ReportTable>

                  <ReportTable
                    title="Recent Purchases"
                    actionLabel="View Purchases"
                    actionHref="/purchases"
                  >
                    <table className="min-w-full text-left">
                      <thead className="border-b border-slate-200 bg-slate-50">
                        <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-5 py-3">PO</th>
                          <th className="px-5 py-3">Supplier</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-right">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentPurchases.map((purchase) => (
                          <tr
                            key={purchase.id}
                            onClick={() => {
                              window.location.href = `/purchases/${purchase.id}`;
                            }}
                            className="cursor-pointer hover:bg-slate-50"
                          >
                            <td className="px-5 py-4">
                              <div className="font-mono text-sm font-semibold text-slate-900">
                                {purchase.po_number}
                              </div>
                              <div className="mt-1 text-xs text-slate-400">
                                {formatDate(
                                  purchase.order_date ||
                                    purchase.created_at
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-700">
                              {purchase.supplier_name}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(
                                  purchase.status
                                )}`}
                              >
                                {formatStatus(purchase.status)}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                              {formatMoney(
                                purchase.total,
                                purchase.currency
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {recentPurchases.length === 0 && (
                      <EmptyState text="No purchase orders yet." />
                    )}
                  </ReportTable>
                </section>

                <ReportTable
                  title="Stock Alerts"
                  actionLabel="View Inventory"
                  actionHref="/inventory"
                >
                  <table className="min-w-full text-left">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3">SKU</th>
                        <th className="px-5 py-3">Product</th>
                        <th className="px-5 py-3">Location</th>
                        <th className="px-5 py-3 text-right">
                          On Hand
                        </th>
                        <th className="px-5 py-3 text-right">
                          Available
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stockAlerts.map((balance) => (
                        <tr key={`${balance.product_id}-${balance.location_id}`}>
                          <td className="px-5 py-4 font-mono text-sm font-semibold text-slate-900">
                            {balance.sku}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-700">
                            {balance.product_name}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {balance.location_name}
                          </td>
                          <td className="px-5 py-4 text-right text-sm text-slate-700">
                            {Number(
                              balance.quantity_on_hand || 0
                            ).toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-right text-sm font-semibold text-red-600">
                            {Number(
                              balance.quantity_available || 0
                            ).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {stockAlerts.length === 0 && (
                    <EmptyState text="No out-of-stock items." />
                  )}
                </ReportTable>
              </>
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
      <div className="text-sm font-medium text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-400">
        {detail}
      </div>
    </div>
  );
}

function SmallCard({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="text-sm font-medium text-slate-500">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-bold ${
          warning ? "text-red-600" : "text-slate-950"
        }`}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function ReportTable({
  title,
  actionLabel,
  actionHref,
  children,
}: {
  title: string;
  actionLabel: string;
  actionHref: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold text-slate-900">
          {title}
        </h2>
        <button
          onClick={() => {
            window.location.href = actionHref;
          }}
          className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
        >
          {actionLabel} →
        </button>
      </div>

      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-6 py-10 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
