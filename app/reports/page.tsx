"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type ReportPeriod =
  | "today"
  | "week"
  | "month"
  | "all"
  | "custom";

type SalesOrder = {
  id: string;
  sale_number: string;
  status: string;
  sales_channel: string;
  currency: string;
  sale_date: string;
  total_amount: number;
  customer_id: string | null;
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

type TopProduct = {
  product_id: string;
  sku: string;
  product_name: string;
  units_sold: number;
  sales_revenue: number;
  gross_profit: number;
  gross_margin_percent: number;
  sales_count: number;
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
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

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

        const [
          salesResponse,
          purchasesResponse,
          balancesResponse,
        ] = await Promise.all([
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

  const reportDates = useMemo(() => {
    const formatInputDate = (value: Date) => {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, "0");
      const day = String(value.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const now = new Date();

    if (period === "today") {
      const today = formatInputDate(now);
      return { from: today, to: today };
    }

    if (period === "week") {
      const start = new Date(now);
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);

      return {
        from: formatInputDate(start),
        to: formatInputDate(now),
      };
    }

    if (period === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);

      return {
        from: formatInputDate(start),
        to: formatInputDate(now),
      };
    }

    if (period === "custom") {
      return {
        from: customFrom || null,
        to: customTo || null,
      };
    }

    return {
      from: null,
      to: null,
    };
  }, [period, customFrom, customTo]);

  useEffect(() => {
    async function loadTopProducts() {
      const user = auth.currentUser;

      if (!user) return;

      try {
        const token = await user.getIdToken();

        const params = new URLSearchParams();
        params.set("limit", "10");

        if (reportDates.from) {
          params.set("date_from", reportDates.from);
        }

        if (reportDates.to) {
          params.set("date_to", reportDates.to);
        }

        const response = await fetch(
          `${API_URL}/api/reports/top-products?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Unable to load top products report data.");
        }

        const data = await response.json();
        setTopProducts(data.products || []);
      } catch (error) {
        console.error(error);
      }
    }

    loadTopProducts();
  }, [reportDates]);

  const filteredSales = useMemo(() => {
    if (!reportDates.from && !reportDates.to) {
      return sales;
    }

    return sales.filter((sale) => {
      const saleDate = new Date(sale.sale_date);

      if (Number.isNaN(saleDate.getTime())) {
        return false;
      }

      if (reportDates.from) {
        const from = new Date(`${reportDates.from}T00:00:00`);

        if (saleDate < from) {
          return false;
        }
      }

      if (reportDates.to) {
        const to = new Date(`${reportDates.to}T23:59:59.999`);

        if (saleDate > to) {
          return false;
        }
      }

      return true;
    });
  }, [sales, reportDates]);

  const salesTrend = useMemo(() => {
    const totals = new Map<string, number>();

    filteredSales
      .filter((sale) => sale.status === "paid")
      .forEach((sale) => {
        const date = new Date(sale.sale_date);

        if (Number.isNaN(date.getTime())) {
          return;
        }

        const key = [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-");

        totals.set(
          key,
          (totals.get(key) || 0) + Number(sale.total_amount || 0)
        );
      });

    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({
        date,
        label: new Date(`${date}T00:00:00`).toLocaleDateString("en-ZA", {
          day: "2-digit",
          month: "short",
        }),
        revenue,
      }));
  }, [filteredSales]);

  const metrics = useMemo(() => {
    const paidSales = filteredSales.filter(
      (sale) => sale.status === "paid"
    );

    const salesRevenue = paidSales.reduce(
      (sum, sale) => sum + Number(sale.total_amount || 0),
      0
    );

    const paymentsReceived = filteredSales.reduce(
      (sum, sale) => sum + Number(sale.amount_paid || 0),
      0
    );

    const outstanding = filteredSales
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
  }, [filteredSales, balances]);

  const customerAnalytics = useMemo(() => {
    const customers = new Map<
      string,
      {
        customer_id: string;
        customer_name: string;
        order_count: number;
        paid_revenue: number;
        outstanding: number;
      }
    >();

    filteredSales.forEach((sale) => {
      if (!sale.customer_id || !sale.customer_name) {
        return;
      }

      const existing = customers.get(sale.customer_id) || {
        customer_id: sale.customer_id,
        customer_name: sale.customer_name,
        order_count: 0,
        paid_revenue: 0,
        outstanding: 0,
      };

      if (sale.status !== "cancelled") {
        existing.order_count += 1;
      }

      if (sale.status === "paid") {
        existing.paid_revenue += Number(sale.total_amount || 0);
      }

      if (
        sale.status !== "draft" &&
        sale.status !== "cancelled" &&
        sale.status !== "paid"
      ) {
        existing.outstanding += Number(sale.balance_due || 0);
      }

      customers.set(sale.customer_id, existing);
    });

    return [...customers.values()]
      .map((customer) => ({
        ...customer,
        average_order_value:
          customer.order_count > 0
            ? customer.paid_revenue / customer.order_count
            : 0,
      }))
      .sort((a, b) => {
        if (b.paid_revenue !== a.paid_revenue) {
          return b.paid_revenue - a.paid_revenue;
        }

        return b.order_count - a.order_count;
      })
      .slice(0, 10);
  }, [filteredSales]);

  const recentSales = useMemo(
    () => filteredSales.slice(0, 5),
    [filteredSales]
  );

  const filteredPurchases = useMemo(() => {
    if (!reportDates.from && !reportDates.to) {
      return purchases;
    }

    return purchases.filter((purchase) => {
      const rawDate = purchase.order_date || purchase.created_at;
      const purchaseDate = new Date(rawDate);

      if (Number.isNaN(purchaseDate.getTime())) {
        return false;
      }

      if (reportDates.from) {
        const from = new Date(`${reportDates.from}T00:00:00`);

        if (purchaseDate < from) {
          return false;
        }
      }

      if (reportDates.to) {
        const to = new Date(`${reportDates.to}T23:59:59.999`);

        if (purchaseDate > to) {
          return false;
        }
      }

      return true;
    });
  }, [purchases, reportDates]);

  const recentPurchases = useMemo(
    () =>
      [...filteredPurchases]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )
        .slice(0, 5),
    [filteredPurchases]
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
                <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Reporting Period
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Filter sales and profitability results by period
                      </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-2">
                      {[
                        ["today", "Today"],
                        ["week", "This Week"],
                        ["month", "This Month"],
                        ["all", "All Time"],
                        ["custom", "Custom"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() =>
                            setPeriod(value as ReportPeriod)
                          }
                          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                            period === value
                              ? "bg-slate-950 text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {label}
                        </button>
                      ))}

                      {period === "custom" && (
                        <>
                          <label className="text-xs font-medium text-slate-500">
                            <span className="mb-1 block">From</span>
                            <input
                              type="date"
                              value={customFrom}
                              onChange={(event) =>
                                setCustomFrom(event.target.value)
                              }
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                            />
                          </label>

                          <label className="text-xs font-medium text-slate-500">
                            <span className="mb-1 block">To</span>
                            <input
                              type="date"
                              value={customTo}
                              onChange={(event) =>
                                setCustomTo(event.target.value)
                              }
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                            />
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                </section>

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
                    value={filteredSales.length}
                  />
                  <SmallCard
                    label="Purchase Orders"
                    value={filteredPurchases.length}
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

                <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5">
                    <h2 className="text-base font-semibold text-slate-950">
                      Sales Trends
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Paid sales revenue for the selected reporting period
                    </p>
                  </div>

                  {salesTrend.length > 0 ? (
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={salesTrend}
                          margin={{
                            top: 10,
                            right: 20,
                            left: 10,
                            bottom: 10,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) =>
                              Number(value).toLocaleString("en-US")
                            }
                          />
                          <Tooltip
                            formatter={(value) => [
                              formatMoney(Number(value)),
                              "Revenue",
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#0f172a"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                      No paid sales for this period.
                    </div>
                  )}
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

                <div className="mb-6">
                  <ReportTable
                    title="Top Products"
                    actionLabel="View Sales"
                    actionHref="/sales"
                  >
                    <table className="min-w-full text-left">
                      <thead className="border-b border-slate-200 bg-slate-50">
                        <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-5 py-3">SKU</th>
                          <th className="px-5 py-3">Product</th>
                          <th className="px-5 py-3 text-right">Units Sold</th>
                          <th className="px-5 py-3 text-right">Revenue</th>
                          <th className="px-5 py-3 text-right">Gross Profit</th>
                          <th className="px-5 py-3 text-right">Margin</th>
                          <th className="px-5 py-3 text-right">Sales</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {topProducts.map((product) => (
                          <tr key={product.product_id}>
                            <td className="px-5 py-4 font-mono text-sm font-semibold text-slate-900">
                              {product.sku}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-700">
                              {product.product_name}
                            </td>
                            <td className="px-5 py-4 text-right text-sm text-slate-700">
                              {Number(product.units_sold || 0).toLocaleString()}
                            </td>
                            <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                              {formatMoney(product.sales_revenue)}
                            </td>
                            <td className="px-5 py-4 text-right text-sm font-semibold text-emerald-700">
                              {formatMoney(product.gross_profit)}
                            </td>
                            <td className="px-5 py-4 text-right text-sm text-slate-700">
                              {Number(
                                product.gross_margin_percent || 0
                              ).toLocaleString("en-US", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 1,
                              })}
                              %
                            </td>
                            <td className="px-5 py-4 text-right text-sm text-slate-700">
                              {Number(product.sales_count || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {topProducts.length === 0 && (
                      <EmptyState text="No paid product sales yet." />
                    )}
                  </ReportTable>
                </div>

                <div className="mb-6">
                  <ReportTable
                    title="Top Customers"
                    actionLabel="View Customers"
                    actionHref="/customers"
                  >
                    <table className="min-w-full text-left">
                      <thead className="border-b border-slate-200 bg-slate-50">
                        <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-5 py-3">Customer</th>
                          <th className="px-5 py-3 text-right">Orders</th>
                          <th className="px-5 py-3 text-right">Revenue</th>
                          <th className="px-5 py-3 text-right">
                            Avg Order Value
                          </th>
                          <th className="px-5 py-3 text-right">
                            Outstanding
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {customerAnalytics.map((customer) => (
                          <tr
                            key={customer.customer_id}
                            onClick={() => {
                              window.location.href = `/customers/${customer.customer_id}`;
                            }}
                            className="cursor-pointer hover:bg-slate-50"
                          >
                            <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                              {customer.customer_name}
                            </td>

                            <td className="px-5 py-4 text-right text-sm text-slate-700">
                              {customer.order_count.toLocaleString()}
                            </td>

                            <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                              {formatMoney(customer.paid_revenue)}
                            </td>

                            <td className="px-5 py-4 text-right text-sm text-slate-700">
                              {formatMoney(customer.average_order_value)}
                            </td>

                            <td className="px-5 py-4 text-right text-sm font-semibold text-amber-700">
                              {formatMoney(customer.outstanding)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {customerAnalytics.length === 0 && (
                      <EmptyState text="No registered customer sales yet." />
                    )}
                  </ReportTable>
                </div>

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
