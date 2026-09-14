"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

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
  subtotal: number;
  total: number;
  item_count: number;
  created_at: string;
};

type Supplier = {
  id: string;
  supplier_code: string;
  name: string;
  default_currency: string | null;
};

type Location = {
  id: string;
  location_code: string;
  name: string;
};

type POForm = {
  supplier_id: string;
  destination_location_id: string;
  currency: string;
  order_date: string;
  expected_date: string;
  supplier_reference: string;
  notes: string;
};

const emptyForm: POForm = {
  supplier_id: "",
  destination_location_id: "",
  currency: "AOA",
  order_date: "",
  expected_date: "",
  supplier_reference: "",
  notes: "",
};

export default function PurchasesPage() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [form, setForm] = useState<POForm>(emptyForm);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      setFirebaseUser(user);
      await loadPageData(user);
    });

    return () => unsubscribe();
  }, []);

  async function loadPageData(user: User) {
    try {
      setLoading(true);
      setMessage("");

      const token = await user.getIdToken();

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [poResponse, supplierResponse, locationResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/purchase-orders`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${API_URL}/api/suppliers`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${API_URL}/api/locations`, {
            headers,
            cache: "no-store",
          }),
        ]);

      if (!poResponse.ok || !supplierResponse.ok || !locationResponse.ok) {
        throw new Error("Unable to load purchasing data.");
      }

      const [poData, supplierData, locationData] = await Promise.all([
        poResponse.json(),
        supplierResponse.json(),
        locationResponse.json(),
      ]);

      setPurchaseOrders(poData.purchase_orders || []);
      setSuppliers(supplierData.suppliers || []);
      setLocations(locationData.locations || []);
    } catch (error) {
      console.error(error);
      setMessage("Unable to load purchasing data.");
    } finally {
      setLoading(false);
    }
  }

  const filteredPurchaseOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return purchaseOrders.filter((po) => {
      const matchesSearch =
        !query ||
        po.po_number.toLowerCase().includes(query) ||
        po.supplier_name.toLowerCase().includes(query) ||
        (po.supplier_reference || "").toLowerCase().includes(query);

      const matchesStatus = !statusFilter || po.status === statusFilter;
      const matchesMoeda =
        !currencyFilter || po.currency === currencyFilter;

      return matchesSearch && matchesStatus && matchesMoeda;
    });
  }, [purchaseOrders, search, statusFilter, currencyFilter]);

  const statuses = useMemo(
    () => Array.from(new Set(purchaseOrders.map((po) => po.status))).sort(),
    [purchaseOrders]
  );

  const currencies = useMemo(
    () => Array.from(new Set(purchaseOrders.map((po) => po.currency))).sort(),
    [purchaseOrders]
  );

  const pendingCount = purchaseOrders.filter((po) =>
    ["pending_approval", "approved", "ordered", "partially_received"].includes(
      po.status
    )
  ).length;

  const receivedCount = purchaseOrders.filter((po) =>
    ["received", "closed"].includes(po.status)
  ).length;

  function handleSupplierChange(supplierId: string) {
    const supplier = suppliers.find((item) => item.id === supplierId);

    setForm({
      ...form,
      supplier_id: supplierId,
      currency: supplier?.default_currency || "AOA",
    });
  }

  async function handleCreatePurchaseOrder(event: React.FormEvent) {
    event.preventDefault();

    if (!firebaseUser) return;

    if (!form.supplier_id || !form.destination_location_id) {
      setFormMessage("O fornecedor e a localização de destino são obrigatórios.");
      return;
    }

    try {
      setSaving(true);
      setFormMessage("");

      const token = await firebaseUser.getIdToken();

      const payload = {
        supplier_id: form.supplier_id,
        destination_location_id: form.destination_location_id,
        currency: form.currency,
        order_date: form.order_date || null,
        expected_date: form.expected_date || null,
        supplier_reference: form.supplier_reference || null,
        notes: form.notes || null,
      };

      const response = await fetch(`${API_URL}/api/purchase-orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to create purchase order.");
      }

      setForm(emptyForm);
      setShowCreate(false);
      await loadPageData(firebaseUser);
    } catch (error) {
      console.error(error);
      setFormMessage(
        error instanceof Error
          ? error.message
          : "Unable to create purchase order."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setCurrencyFilter("");
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
          <NavItem label="Compras" icon="↓" href="/purchases" active />
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
          <div className="flex h-20 items-center justify-between px-4 md:px-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                Compras
              </h1>
              <p className="text-sm text-slate-500">
                Gerir ordens de compra e receções
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:block">
                {purchaseOrders.length} purchase orders
              </div>

              <button
                onClick={() => {
                  setShowCreate((value) => !value);
                  setFormMessage("");
                }}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                {showCreate ? "Fechar" : "+ Nova OC"}
              </button>

              <button
                onClick={handleLogout}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <div className="mx-auto max-w-7xl">

            {showCreate && (
              <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-slate-950">
                    Criar Ordem de Compra
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    O número da OC será gerado automaticamente.
                  </p>
                </div>

                <form onSubmit={handleCreatePurchaseOrder}>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Fornecedor *
                      </span>
                      <select
                        value={form.supplier_id}
                        onChange={(event) =>
                          handleSupplierChange(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                      >
                        <option value="">Select supplier</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.supplier_code} — {supplier.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Destino *
                      </span>
                      <select
                        value={form.destination_location_id}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            destination_location_id: event.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                      >
                        <option value="">Select location</option>
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.location_code} — {location.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Moeda
                      </span>
                      <select
                        value={form.currency}
                        onChange={(event) =>
                          setForm({ ...form, currency: event.target.value })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                      >
                        <option value="AOA">AOA — Kwanza</option>
                        <option value="USD">USD — US Dollar</option>
                        <option value="ZAR">ZAR — South African Rand</option>
                        <option value="CNY">CNY — Chinese Yuan</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Data da Ordem
                      </span>
                      <input
                        type="date"
                        value={form.order_date}
                        onChange={(event) =>
                          setForm({ ...form, order_date: event.target.value })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Data Prevista
                      </span>
                      <input
                        type="date"
                        value={form.expected_date}
                        onChange={(event) =>
                          setForm({ ...form, expected_date: event.target.value })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Referência do Fornecedor
                      </span>
                      <input
                        type="text"
                        value={form.supplier_reference}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            supplier_reference: event.target.value,
                          })
                        }
                        placeholder="Quote, invoice or reference"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                      />
                    </label>

                    <div className="md:col-span-2 xl:col-span-3">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Notes
                        </span>
                        <textarea
                          rows={3}
                          value={form.notes}
                          onChange={(event) =>
                            setForm({ ...form, notes: event.target.value })
                          }
                          placeholder="Notas da compra..."
                          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                        />
                      </label>
                    </div>
                  </div>

                  {formMessage && (
                    <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {formMessage}
                    </div>
                  )}

                  <div className="mt-5 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreate(false);
                        setForm(emptyForm);
                        setFormMessage("");
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "A criar..." : "Criar Ordem de Compra"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total de OCs"
                value={purchaseOrders.length}
                detail="Todas as ordens de compra"
              />
              <SummaryCard
                label="Em Curso"
                value={pendingCount}
                detail="A aguardar conclusão"
              />
              <SummaryCard
                label="Recebidas / Fechadas"
                value={receivedCount}
                detail="Compras concluídas"
              />
              <SummaryCard
                label="Fornecedores"
                value={suppliers.length}
                detail="Fornecedores disponíveis"
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
                    placeholder="Pesquisar OC, fornecedor, referência..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                >
                  <option value="">All statuses</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>

                <select
                  value={currencyFilter}
                  onChange={(event) => setCurrencyFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                >
                  <option value="">Todas as moedas</option>
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>

                <button
                  onClick={clearFilters}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <div className="p-8 text-sm text-slate-500">
                  A carregar ordens de compra...
                </div>
              ) : message ? (
                <div className="p-8 text-sm font-medium text-red-700">
                  {message}
                </div>
              ) : filteredPurchaseOrders.length === 0 ? (
                <div className="p-8 text-sm text-slate-500">
                  No purchase orders found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <TableHead>N.º da OC</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead>Moeda</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead align="right">Total</TableHead>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredPurchaseOrders.map((po) => (
                        <tr
                          key={po.id}
                          onClick={() =>
                            (window.location.href = `/purchases/${po.id}`)
                          }
                          className="cursor-pointer transition hover:bg-slate-50"
                        >
                          <TableCell>
                            <div className="font-semibold text-slate-950">
                              {po.po_number}
                            </div>
                            {po.supplier_reference && (
                              <div className="mt-0.5 text-xs text-slate-500">
                                {po.supplier_reference}
                              </div>
                            )}
                          </TableCell>

                          <TableCell>{po.supplier_name}</TableCell>

                          <TableCell>
                            <StatusBadge status={po.status} />
                          </TableCell>

                          <TableCell>
                            {po.destination_location_name}
                          </TableCell>

                          <TableCell>
                            <span className="font-semibold text-slate-700">
                              {po.currency}
                            </span>
                          </TableCell>

                          <TableCell>{po.item_count}</TableCell>

                          <TableCell align="right">
                            <span className="font-semibold text-slate-950">
                              {formatMoney(po.total, po.currency)}
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
  href?: string;
  active?: boolean;
}) {
  const className = active
    ? "flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 font-semibold text-white"
    : "flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-white/10 hover:text-white";

  if (href) {
    return (
      <a href={href} className={className}>
        <span className="w-5 text-center">{icon}</span>
        <span>{label}</span>
      </a>
    );
  }

  return (
    <div className={className}>
      <span className="w-5 text-center">{icon}</span>
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
  value: number | string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </div>
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
      className={`whitespace-nowrap px-5 py-4 text-sm text-slate-700 ${
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
  const translations: Record<string, string> = {
    draft: "Rascunho",
    submitted: "Submetida",
    approved: "Aprovada",
    ordered: "Encomendada",
    partially_received: "Parcialmente Recebida",
    received: "Recebida",
    closed: "Fechada",
    cancelled: "Cancelada",
  };

  return (
    translations[status.toLowerCase()] ||
    status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
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
