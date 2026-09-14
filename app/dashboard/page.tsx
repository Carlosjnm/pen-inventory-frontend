"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import MobileNav from "@/components/MobileNav";
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
  expected_date: string | null;
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

type ProfitSummary = {
  sales_revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  gross_margin_percent: number;
  paid_order_count: number;
};

type PaymentSummary = {
  payments_received: number;
  payment_count: number;
  by_method: {
    payment_method: string;
    amount: number;
    payment_count: number;
  }[];
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
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition ${
        active
          ? "bg-white text-slate-950"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="w-5 text-center text-base">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-500">{title}</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </div>
          <div className="mt-2 text-xs text-slate-500">{subtitle}</div>
        </div>
        <div className={`h-10 w-2 rounded-full ${accent}`} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [sales, setSales] = useState<SalesOrder[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [profitSummary, setProfitSummary] =
    useState<ProfitSummary | null>(null);
  const [paymentSummary, setPaymentSummary] =
    useState<PaymentSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  const [salesAllowed, setSalesAllowed] = useState(true);
  const [purchasesAllowed, setPurchasesAllowed] = useState(true);
  const [inventoryAllowed, setInventoryAllowed] = useState(true);

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

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const formatDateParam = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        };

        const dateFrom = formatDateParam(monthStart);
        const dateTo = formatDateParam(now);

        async function optionalFetch(url: string) {
          const response = await fetch(url, {
            headers,
            cache: "no-store",
          });

          if (response.status === 401) {
            window.location.href = "/";
            return null;
          }

          if (response.status === 403) {
            return { forbidden: true };
          }

          if (!response.ok) {
            throw new Error(`Erro ${response.status} ao carregar o Painel.`);
          }

          return response.json();
        }

        const results = await Promise.allSettled([
          optionalFetch(`${API_URL}/api/sales-orders`),
          optionalFetch(`${API_URL}/api/purchase-orders`),
          optionalFetch(`${API_URL}/api/inventory/balances`),
          optionalFetch(
            `${API_URL}/api/reports/profit-summary?date_from=${dateFrom}&date_to=${dateTo}`
          ),
          optionalFetch(
            `${API_URL}/api/reports/payment-summary?date_from=${dateFrom}&date_to=${dateTo}`
          ),
          optionalFetch(
            `${API_URL}/api/reports/top-products?date_from=${dateFrom}&date_to=${dateTo}&limit=5`
          ),
        ]);

        const getValue = (index: number) => {
          const result = results[index];
          return result.status === "fulfilled" ? result.value : null;
        };

        const salesData = getValue(0);
        const purchasesData = getValue(1);
        const balancesData = getValue(2);
        const profitData = getValue(3);
        const paymentData = getValue(4);
        const topProductsData = getValue(5);

        if (salesData?.forbidden) {
          setSalesAllowed(false);
        } else {
          setSalesAllowed(true);
          setSales(salesData?.sales_orders || []);
        }

        if (purchasesData?.forbidden) {
          setPurchasesAllowed(false);
        } else {
          setPurchasesAllowed(true);
          setPurchases(purchasesData?.purchase_orders || []);
        }

        if (balancesData?.forbidden) {
          setInventoryAllowed(false);
        } else {
          setInventoryAllowed(true);
          setBalances(balancesData?.balances || []);
        }

        if (!profitData?.forbidden && profitData) {
          setProfitSummary(profitData);
        }

        if (!paymentData?.forbidden && paymentData) {
          setPaymentSummary(paymentData);
        }

        if (!topProductsData?.forbidden && topProductsData) {
          setTopProducts(topProductsData.products || []);
        }

        const rejected = results.filter(
          (result) => result.status === "rejected"
        );

        if (rejected.length > 0) {
          console.error("Algumas secções do Painel não foram carregadas.", rejected);
        }
      } catch (error) {
        console.error(error);
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o Painel."
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const recentSales = useMemo(() => sales.slice(0, 5), [sales]);

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

  const openPurchases = useMemo(
    () =>
      purchases.filter(
        (purchase) =>
          !["received", "closed", "cancelled"].includes(purchase.status)
      ),
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
        .slice(0, 6),
    [balances]
  );

  const inventoryValue = useMemo(
    () =>
      balances.reduce(
        (total, balance) => total + Number(balance.stock_value || 0),
        0
      ),
    [balances]
  );

  const unitsOnHand = useMemo(
    () =>
      balances.reduce(
        (total, balance) =>
          total + Number(balance.quantity_on_hand || 0),
        0
      ),
    [balances]
  );

  const salesTrend = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);

    const totals = new Map<string, number>();

    for (let index = 0; index < 30; index += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + index);

      const key = [
        day.getFullYear(),
        String(day.getMonth() + 1).padStart(2, "0"),
        String(day.getDate()).padStart(2, "0"),
      ].join("-");

      totals.set(key, 0);
    }

    sales
      .filter((sale) => sale.status === "paid")
      .forEach((sale) => {
        const date = new Date(sale.sale_date);

        if (Number.isNaN(date.getTime()) || date < start) {
          return;
        }

        const key = [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-");

        if (!totals.has(key)) return;

        totals.set(
          key,
          Number(totals.get(key) || 0) + Number(sale.total_amount || 0)
        );
      });

    return [...totals.entries()].map(([date, revenue]) => ({
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "short",
      }),
      revenue,
    }));
  }, [sales]);

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  function formatMoney(
    value: number | string | null | undefined,
    currency = "AOA"
  ) {
    const amount = Number(value || 0);

    return `${currency} ${amount.toLocaleString("pt-PT", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatStatus(value: string) {
    const labels: Record<string, string> = {
      draft: "Rascunho",
      submitted: "Submetida",
      approved: "Aprovada",
      ordered: "Encomendada",
      partially_received: "Recebida Parcialmente",
      received: "Recebida",
      closed: "Fechada",
      cancelled: "Cancelada",
      pending_payment: "Pagamento Pendente",
      paid: "Paga",
    };

    return (
      labels[value] ||
      value
        .split("_")
        .map(
          (part) =>
            part.charAt(0).toUpperCase() + part.slice(1)
        )
        .join(" ")
    );
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
      value === "approved" ||
      value === "ordered" ||
      value === "pending_payment" ||
      value === "partially_received"
    ) {
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    }

    if (value === "cancelled") {
      return "bg-red-50 text-red-700 ring-red-600/20";
    }

    return "bg-slate-100 text-slate-700 ring-slate-500/20";
  }

  function paymentMethodLabel(value: string) {
    const labels: Record<string, string> = {
      cash: "Dinheiro",
      card: "Cartão",
      bank_transfer: "Transferência Bancária",
      transfer: "Transferência",
      mobile_money: "Pagamento Móvel",
      voucher: "Voucher",
      other: "Outro",
    };

    return labels[value] || formatStatus(value);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-slate-950 text-white lg:block">
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <div>
            <div className="text-xl font-bold tracking-tight">PEN</div>
            <div className="text-xs text-slate-400">Inventário</div>
          </div>
        </div>

        <nav className="space-y-1 px-3 py-5 text-sm">
          <NavItem label="Painel" icon="⌂" href="/dashboard" active />
          <NavItem label="Produtos" icon="▦" href="/products" />
          <NavItem label="Inventário" icon="▣" href="/inventory" />
          <NavItem label="Compras" icon="↓" href="/purchases" />
          <NavItem label="Vendas" icon="↑" href="/sales" />
          <NavItem label="Fornecedores" icon="♢" href="/suppliers" />
          <NavItem label="Clientes" icon="♙" href="/customers" />
          <NavItem label="Relatórios" icon="▤" href="/reports" />
          <NavItem label="Utilizadores" icon="♧" href="/users" />
          <NavItem label="Definições" icon="⚙" href="/settings" />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Terminar Sessão
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-4 md:px-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                Painel
              </h1>
              <p className="text-sm text-slate-500">
                Visão geral e atividade do seu negócio
              </p>
            </div>

            <MobileNav onLogout={handleLogout} />
          </div>
        </header>

        <main className="p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                A carregar Painel...
              </div>
            ) : message ? (
              <div className="rounded-2xl border border-red-200 bg-white p-8 text-red-600 shadow-sm">
                {message}
              </div>
            ) : (
              <>
                <section className="mb-6">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-950">
                        Resumo do Mês
                      </h2>
                      <p className="text-sm text-slate-500">
                        Indicadores principais do mês atual
                      </p>
                    </div>

                    <Link
                      href="/reports"
                      className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                    >
                      Ver relatórios completos →
                    </Link>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      title="Vendas"
                      value={
                        salesAllowed
                          ? formatMoney(profitSummary?.sales_revenue || 0)
                          : "Sem acesso"
                      }
                      subtitle={`${profitSummary?.paid_order_count || 0} vendas pagas`}
                      accent="bg-blue-500"
                    />

                    <MetricCard
                      title="Lucro Bruto"
                      value={
                        salesAllowed
                          ? formatMoney(profitSummary?.gross_profit || 0)
                          : "Sem acesso"
                      }
                      subtitle={
                        salesAllowed
                          ? `${Number(
                              profitSummary?.gross_margin_percent || 0
                            ).toFixed(1)}% de margem bruta`
                          : "Permissão de vendas necessária"
                      }
                      accent="bg-emerald-500"
                    />

                    <MetricCard
                      title="Pagamentos Recebidos"
                      value={
                        salesAllowed
                          ? formatMoney(
                              paymentSummary?.payments_received || 0
                            )
                          : "Sem acesso"
                      }
                      subtitle={`${paymentSummary?.payment_count || 0} pagamentos`}
                      accent="bg-violet-500"
                    />

                    <MetricCard
                      title="Valor do Inventário"
                      value={
                        inventoryAllowed
                          ? formatMoney(inventoryValue)
                          : "Sem acesso"
                      }
                      subtitle={
                        inventoryAllowed
                          ? `${Number(unitsOnHand).toLocaleString(
                              "pt-PT"
                            )} unidades em stock`
                          : "Permissão de inventário necessária"
                      }
                      accent="bg-amber-500"
                    />
                  </div>
                </section>

                <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-slate-950">
                      Ações Rápidas
                    </h2>
                    <p className="text-sm text-slate-500">
                      Aceda rapidamente às operações mais utilizadas
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Link
                      href="/sales/new"
                      className="rounded-xl bg-slate-950 px-4 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      + Nova Venda
                    </Link>

                    <Link
                      href="/purchases/new"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      + Nova Ordem de Compra
                    </Link>

                    <Link
                      href="/products/new"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      + Novo Produto
                    </Link>

                    <Link
                      href="/inventory"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      Ver Inventário
                    </Link>
                  </div>
                </section>

                <div className="mb-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5">
                      <h2 className="text-lg font-bold text-slate-950">
                        Vendas — Últimos 30 Dias
                      </h2>
                      <p className="text-sm text-slate-500">
                        Evolução diária das vendas pagas
                      </p>
                    </div>

                    {salesAllowed ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={salesTrend}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 11 }}
                              minTickGap={24}
                            />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              tickFormatter={(value) =>
                                Number(value).toLocaleString("pt-PT")
                              }
                            />
                            <Tooltip
                              formatter={(value) => [
                                formatMoney(Number(value)),
                                "Vendas",
                              ]}
                              labelFormatter={(label) =>
                                `Data: ${label}`
                              }
                            />
                            <Line
                              type="monotone"
                              dataKey="revenue"
                              stroke="currentColor"
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex h-72 items-center justify-center text-sm text-slate-500">
                        Não tem permissão para visualizar dados de vendas.
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5">
                      <h2 className="text-lg font-bold text-slate-950">
                        Pagamentos
                      </h2>
                      <p className="text-sm text-slate-500">
                        Métodos utilizados este mês
                      </p>
                    </div>

                    {!salesAllowed ? (
                      <div className="text-sm text-slate-500">
                        Sem permissão para visualizar pagamentos.
                      </div>
                    ) : paymentSummary?.by_method?.length ? (
                      <div className="space-y-3">
                        {paymentSummary.by_method.map((item) => {
                          const total = Number(
                            paymentSummary.payments_received || 0
                          );
                          const percentage =
                            total > 0
                              ? (Number(item.amount || 0) / total) * 100
                              : 0;

                          return (
                            <div
                              key={item.payment_method}
                              className="rounded-xl border border-slate-100 p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">
                                    {paymentMethodLabel(
                                      item.payment_method
                                    )}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {item.payment_count} pagamentos
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-sm font-bold text-slate-950">
                                    {formatMoney(item.amount)}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {percentage.toFixed(1)}%
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-slate-900"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      percentage
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">
                        Ainda não existem pagamentos concluídos este mês.
                      </div>
                    )}
                  </section>
                </div>

                <div className="mb-6 grid gap-6 xl:grid-cols-2">
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 p-5">
                      <div>
                        <h2 className="text-lg font-bold text-slate-950">
                          Vendas Recentes
                        </h2>
                        <p className="text-sm text-slate-500">
                          Últimas vendas registadas
                        </p>
                      </div>

                      <Link
                        href="/sales"
                        className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                      >
                        Ver todas →
                      </Link>
                    </div>

                    {!salesAllowed ? (
                      <div className="p-5 text-sm text-slate-500">
                        Sem permissão para visualizar vendas.
                      </div>
                    ) : recentSales.length === 0 ? (
                      <div className="p-5 text-sm text-slate-500">
                        Ainda não existem vendas.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {recentSales.map((sale) => (
                          <Link
                            key={sale.id}
                            href={`/sales/${sale.id}`}
                            className="flex items-center justify-between gap-4 p-4 transition hover:bg-slate-50"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900">
                                {sale.sale_number}
                              </div>
                              <div className="mt-1 truncate text-xs text-slate-500">
                                {sale.customer_name || "Cliente não indicado"} ·{" "}
                                {formatDate(sale.sale_date)}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="text-sm font-bold text-slate-950">
                                {formatMoney(
                                  sale.total_amount,
                                  sale.currency
                                )}
                              </div>
                              <span
                                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusClass(
                                  sale.status
                                )}`}
                              >
                                {formatStatus(sale.status)}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 p-5">
                      <div>
                        <h2 className="text-lg font-bold text-slate-950">
                          Compras Recentes
                        </h2>
                        <p className="text-sm text-slate-500">
                          {openPurchases.length}{" "}
                          {openPurchases.length === 1
                            ? "ordem ainda em aberto"
                            : "ordens ainda em aberto"}
                        </p>
                      </div>

                      <Link
                        href="/purchases"
                        className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                      >
                        Ver todas →
                      </Link>
                    </div>

                    {!purchasesAllowed ? (
                      <div className="p-5 text-sm text-slate-500">
                        Sem permissão para visualizar compras.
                      </div>
                    ) : recentPurchases.length === 0 ? (
                      <div className="p-5 text-sm text-slate-500">
                        Ainda não existem ordens de compra.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {recentPurchases.map((purchase) => (
                          <Link
                            key={purchase.id}
                            href={`/purchases/${purchase.id}`}
                            className="flex items-center justify-between gap-4 p-4 transition hover:bg-slate-50"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900">
                                {purchase.po_number}
                              </div>
                              <div className="mt-1 truncate text-xs text-slate-500">
                                {purchase.supplier_name} ·{" "}
                                {formatDate(
                                  purchase.order_date ||
                                    purchase.created_at
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="text-sm font-bold text-slate-950">
                                {formatMoney(
                                  purchase.total,
                                  purchase.currency
                                )}
                              </div>
                              <span
                                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusClass(
                                  purchase.status
                                )}`}
                              >
                                {formatStatus(purchase.status)}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 p-5">
                      <div>
                        <h2 className="text-lg font-bold text-slate-950">
                          Alertas de Stock
                        </h2>
                        <p className="text-sm text-slate-500">
                          Produtos sem quantidade disponível
                        </p>
                      </div>

                      <Link
                        href="/inventory"
                        className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                      >
                        Inventário →
                      </Link>
                    </div>

                    {!inventoryAllowed ? (
                      <div className="p-5 text-sm text-slate-500">
                        Sem permissão para visualizar inventário.
                      </div>
                    ) : stockAlerts.length === 0 ? (
                      <div className="p-5">
                        <div className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                          Não existem produtos sem stock disponível.
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {stockAlerts.map((balance) => (
                          <div
                            key={`${balance.product_id}-${balance.location_id}`}
                            className="flex items-center justify-between gap-4 p-4"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-slate-900">
                                {balance.product_name}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {balance.sku} · {balance.location_name}
                              </div>
                            </div>

                            <div className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                              {Number(
                                balance.quantity_available || 0
                              ).toLocaleString("pt-PT")}{" "}
                              disponível
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 p-5">
                      <div>
                        <h2 className="text-lg font-bold text-slate-950">
                          Produtos Mais Vendidos
                        </h2>
                        <p className="text-sm text-slate-500">
                          Desempenho no mês atual
                        </p>
                      </div>

                      <Link
                        href="/reports"
                        className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                      >
                        Relatórios →
                      </Link>
                    </div>

                    {!salesAllowed ? (
                      <div className="p-5 text-sm text-slate-500">
                        Sem permissão para visualizar dados de vendas.
                      </div>
                    ) : topProducts.length === 0 ? (
                      <div className="p-5 text-sm text-slate-500">
                        Ainda não existem vendas pagas este mês.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {topProducts.map((product, index) => (
                          <Link
                            key={product.product_id}
                            href={`/products/${product.product_id}`}
                            className="flex items-center gap-4 p-4 transition hover:bg-slate-50"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
                              {index + 1}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold text-slate-900">
                                {product.product_name}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {product.sku} ·{" "}
                                {Number(
                                  product.units_sold || 0
                                ).toLocaleString("pt-PT")}{" "}
                                unidades
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="text-sm font-bold text-slate-950">
                                {formatMoney(product.sales_revenue)}
                              </div>
                              <div className="mt-1 text-xs text-emerald-700">
                                Lucro {formatMoney(product.gross_profit)}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
