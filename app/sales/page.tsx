"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import MobileNav from "@/components/MobileNav";

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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
          throw new Error(data.detail || "Não foi possível carregar as ordens de venda.");
        }

        const data = await response.json();
        setSalesOrders(data.sales_orders || []);
      } catch (error) {
        console.error(error);
        setMessage(
          error instanceof Error ? error.message : "Não foi possível carregar as ordens de venda."
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

      const saleDate = order.sale_date
        ? new Date(order.sale_date)
        : null;

      const fromDate = dateFrom
        ? new Date(`${dateFrom}T00:00:00`)
        : null;

      const toDate = dateTo
        ? new Date(`${dateTo}T23:59:59.999`)
        : null;

      const matchesDateFrom =
        !fromDate ||
        (saleDate !== null && saleDate >= fromDate);

      const matchesDateTo =
        !toDate ||
        (saleDate !== null && saleDate <= toDate);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesChannel &&
        matchesDateFrom &&
        matchesDateTo
      );
    });
  }, [salesOrders, search, status, channel, dateFrom, dateTo]);

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
    setDateFrom("");
    setDateTo("");
  }

  function formatStatus(value: string) {
    const translations: Record<string, string> = {
      draft: "Rascunho",
      submitted: "Submetida",
      pending_payment: "Pagamento Pendente",
      paid: "Pago",
      cancelled: "Cancelada",
      walk_in: "Venda ao Balcão",
      whatsapp: "WhatsApp",
      instagram: "Instagram",
      facebook: "Facebook",
      website: "Website",
      marketplace: "Marketplace",
      other: "Outro",
      cash: "Dinheiro",
      card: "Cartão",
      bank_transfer: "Transferência Bancária",
      mobile_money: "Pagamento Móvel",
    };

    return (
      translations[value.toLowerCase()] ||
      value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    );
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
            <div className="text-xs text-slate-400">Inventário</div>
          </div>
        </div>

        <nav className="space-y-1 px-3 py-5 text-sm">
          <NavItem label="Painel" icon="⌂" href="/dashboard" />
          <NavItem label="Produtos" icon="▦" href="/products" />
          <NavItem label="Inventário" icon="▣" href="/inventory" />
          <NavItem label="Compras" icon="↓" href="/purchases" />
          <NavItem label="Vendas" icon="↑" active href="/sales" />
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
          <div className="flex h-20 items-center justify-between px-4 md:px-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                Vendas
              </h1>
              <p className="text-sm text-slate-500">
                Gerir vendas e pagamentos
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
                Nova Venda
              </button>

              <div className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:block">
                {salesOrders.length} vendas
              </div>

              <MobileNav onLogout={handleLogout} />
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total de Vendas"
                value={formatMoney(totalSales)}
                detail={`${salesOrders.length} vendas`}
              />
              <SummaryCard
                label="Pago"
                value={formatMoney(totalPaid)}
                detail={`${paidOrders} totalmente pagas`}
              />
              <SummaryCard
                label="Por Receber"
                value={formatMoney(totalOutstanding)}
                detail="Valor ainda por receber"
              />
              <SummaryCard
                label="Vendas Pagas"
                value={String(paidOrders)}
                detail="Pagamento concluído"
              />
            </section>

            <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr_1fr_1fr_1fr_auto]">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    ⌕
                  </span>

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Pesquisar venda, cliente, referência..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                >
                  <option value="">Todos os estados</option>
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
                  <option value="">Todos os canais</option>
                  {channels.map((value) => (
                    <option key={value} value={value}>
                      {formatStatus(value)}
                    </option>
                  ))}
                </select>

                <label className="relative">
                  <span className="absolute -top-2 left-3 z-10 bg-white px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    De
                  </span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    aria-label="Data inicial"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>

                <label className="relative">
                  <span className="absolute -top-2 left-3 z-10 bg-white px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Até
                  </span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    aria-label="Data final"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                  />
                </label>

                <button
                  onClick={clearFilters}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Limpar
                </button>
              </div>
            </section>

            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-sm text-slate-500">
                A mostrar{" "}
                <span className="font-semibold text-slate-800">
                  {filteredSales.length}
                </span>{" "}
                de {salesOrders.length} vendas
              </p>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                A carregar vendas...
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
                        <th className="px-6 py-4">Venda</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Canal</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4 text-right">Total</th>
                        <th className="px-6 py-4 text-right">Pago</th>
                        <th className="px-6 py-4 text-right">Saldo</th>
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
                              {order.customer_name || "Cliente de Balcão"}
                            </div>
                            {order.customer_reference && (
                              <div className="mt-1 text-xs text-slate-500">
                                Ref.: {order.customer_reference}
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
                      Nenhuma venda encontrada
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Crie a sua primeira venda ou altere os filtros.
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
