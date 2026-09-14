"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import MobileNav from "@/components/MobileNav";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Supplier = {
  id: string;
  supplier_code: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  country: string | null;
  city: string | null;
  default_currency: string | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean;
};

type SupplierForm = {
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  address: string;
  city: string;
  country: string;
  default_currency: string;
  payment_terms: string;
  notes: string;
};

const emptyForm: SupplierForm = {
  name: "",
  contact_person: "",
  email: "",
  phone: "",
  whatsapp: "",
  website: "",
  address: "",
  city: "",
  country: "",
  default_currency: "AOA",
  payment_terms: "",
  notes: "",
};

export default function SuppliersPage() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [form, setForm] = useState<SupplierForm>(emptyForm);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      setFirebaseUser(user);
      await loadSuppliers(user);
    });

    return () => unsubscribe();
  }, []);

  async function loadSuppliers(user: User) {
    try {
      setLoading(true);
      setMessage("");

      const token = await user.getIdToken();

      const response = await fetch(`${API_URL}/api/suppliers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Não foi possível carregar os fornecedores.");
      }

      const data = await response.json();
      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error(error);
      setMessage("Não foi possível carregar os fornecedores.");
    } finally {
      setLoading(false);
    }
  }

  const countries = useMemo(
    () =>
      Array.from(
        new Set(
          suppliers
            .map((supplier) => supplier.country)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [suppliers]
  );

  const currencies = useMemo(
    () =>
      Array.from(
        new Set(
          suppliers
            .map((supplier) => supplier.default_currency)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [suppliers]
  );

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      const matchesSearch =
        !query ||
        supplier.supplier_code.toLowerCase().includes(query) ||
        supplier.name.toLowerCase().includes(query) ||
        (supplier.contact_person || "").toLowerCase().includes(query) ||
        (supplier.email || "").toLowerCase().includes(query) ||
        (supplier.phone || "").toLowerCase().includes(query) ||
        (supplier.whatsapp || "").toLowerCase().includes(query);

      const matchesCountry = !country || supplier.country === country;
      const matchesCurrency =
        !currency || supplier.default_currency === currency;

      return matchesSearch && matchesCountry && matchesCurrency;
    });
  }, [suppliers, search, country, currency]);

  const suppliersWithContact = suppliers.filter(
    (supplier) =>
      supplier.contact_person ||
      supplier.email ||
      supplier.phone ||
      supplier.whatsapp
  ).length;

  const supplierCountries = countries.length;

  async function handleCreateSupplier(event: React.FormEvent) {
    event.preventDefault();

    if (!firebaseUser) return;

    if (!form.name.trim()) {
      setFormMessage("O nome do fornecedor é obrigatório.");
      return;
    }

    try {
      setSaving(true);
      setFormMessage("");

      const token = await firebaseUser.getIdToken();

      const response = await fetch(`${API_URL}/api/suppliers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Não foi possível criar o fornecedor.");
      }

      setForm(emptyForm);
      setShowCreate(false);
      await loadSuppliers(firebaseUser);
    } catch (error) {
      console.error(error);
      setFormMessage(
        error instanceof Error ? error.message : "Não foi possível criar o fornecedor."
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
    setCountry("");
    setCurrency("");
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
          <NavItem label="Vendas" icon="↑" href="/sales" />
          <NavItem label="Fornecedores" icon="♢" active href="/suppliers" />
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
                Fornecedores
              </h1>
              <p className="text-sm text-slate-500">
                Gerir fornecedores e contactos de fornecimento
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:block">
                {suppliers.length} suppliers
              </div>

              <button
                onClick={() => {
                  setShowCreate((value) => !value);
                  setFormMessage("");
                }}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                {showCreate ? "Fechar" : "+ Adicionar Fornecedor"}
              </button>

              <MobileNav onLogout={handleLogout} />
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            {showCreate && (
              <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-slate-950">
                    Adicionar Fornecedor
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    O código do fornecedor será gerado automaticamente.
                  </p>
                </div>

                <form onSubmit={handleCreateSupplier}>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <FormField
                      label="Nome do Fornecedor *"
                      value={form.name}
                      onChange={(value) =>
                        setForm({ ...form, name: value })
                      }
                      placeholder="Nome do fornecedor ou empresa"
                    />

                    <FormField
                      label="Pessoa de Contacto"
                      value={form.contact_person}
                      onChange={(value) =>
                        setForm({ ...form, contact_person: value })
                      }
                      placeholder="Nome do contacto"
                    />

                    <FormField
                      label="Email"
                      value={form.email}
                      onChange={(value) =>
                        setForm({ ...form, email: value })
                      }
                      placeholder="supplier@example.com"
                      type="email"
                    />

                    <FormField
                      label="Telefone"
                      value={form.phone}
                      onChange={(value) =>
                        setForm({ ...form, phone: value })
                      }
                      placeholder="+244..."
                    />

                    <FormField
                      label="WhatsApp"
                      value={form.whatsapp}
                      onChange={(value) =>
                        setForm({ ...form, whatsapp: value })
                      }
                      placeholder="+244..."
                    />

                    <FormField
                      label="Website"
                      value={form.website}
                      onChange={(value) =>
                        setForm({ ...form, website: value })
                      }
                      placeholder="https://..."
                    />

                    <FormField
                      label="Cidade"
                      value={form.city}
                      onChange={(value) =>
                        setForm({ ...form, city: value })
                      }
                      placeholder="Cidade"
                    />

                    <FormField
                      label="País"
                      value={form.country}
                      onChange={(value) =>
                        setForm({ ...form, country: value })
                      }
                      placeholder="País"
                    />

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Moeda Predefinida
                      </span>
                      <select
                        value={form.default_currency}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            default_currency: event.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                      >
                        <option value="AOA">AOA — Kwanza</option>
                        <option value="USD">USD — US Dollar</option>
                        <option value="ZAR">ZAR — South African Rand</option>
                        <option value="CNY">CNY — Chinese Yuan</option>
                      </select>
                    </label>

                    <FormField
                      label="Condições de Pagamento"
                      value={form.payment_terms}
                      onChange={(value) =>
                        setForm({ ...form, payment_terms: value })
                      }
                      placeholder="e.g. 30% deposit / balance before shipping"
                    />

                    <div className="md:col-span-2">
                      <FormField
                        label="Endereço"
                        value={form.address}
                        onChange={(value) =>
                          setForm({ ...form, address: value })
                        }
                        placeholder="Endereço do fornecedor"
                      />
                    </div>

                    <div className="md:col-span-2 xl:col-span-3">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Notas
                        </span>
                        <textarea
                          value={form.notes}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              notes: event.target.value,
                            })
                          }
                          rows={3}
                          placeholder="Informações adicionais sobre o fornecedor..."
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
                      {saving ? "A guardar..." : "Criar Fornecedor"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total de Fornecedores"
                value={suppliers.length}
                detail="Fornecedores ativos"
              />
              <SummaryCard
                label="Países"
                value={supplierCountries}
                detail="Mercados dos fornecedores"
              />
              <SummaryCard
                label="Com Contacto"
                value={suppliersWithContact}
                detail="Dados de contacto registados"
              />
              <SummaryCard
                label="Moedas"
                value={currencies.length}
                detail="Moedas dos fornecedores"
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
                    placeholder="Pesquisar fornecedor, código, contacto..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <select
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                >
                  <option value="">Todos os países</option>
                  {countries.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                >
                  <option value="">Todas as moedas</option>
                  {currencies.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

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
                  {filteredSuppliers.length}
                </span>{" "}
                of {suppliers.length} suppliers
              </p>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                A carregar fornecedores...
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
                        <th className="px-6 py-4">Código</th>
                        <th className="px-6 py-4">Fornecedor</th>
                        <th className="px-6 py-4">Contacto</th>
                        <th className="px-6 py-4">Localização</th>
                        <th className="px-6 py-4">Moeda</th>
                        <th className="w-12 px-4 py-4"></th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredSuppliers.map((supplier) => (
                        <tr
                          key={supplier.id}
                          onClick={() => {
                            window.location.href = `/suppliers/${supplier.id}`;
                          }}
                          className="group cursor-pointer transition hover:bg-slate-50"
                        >
                          <td className="px-6 py-5 align-top">
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                              {supplier.supplier_code}
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <div className="font-semibold text-slate-900">
                              {supplier.name}
                            </div>

                            {supplier.website && (
                              <div className="mt-1 max-w-xs truncate text-xs text-slate-400">
                                {supplier.website}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-5">
                            <div className="text-sm font-medium text-slate-700">
                              {supplier.contact_person || "—"}
                            </div>

                            {supplier.email && (
                              <div className="mt-1 text-xs text-slate-500">
                                {supplier.email}
                              </div>
                            )}

                            {(supplier.whatsapp || supplier.phone) && (
                              <div className="mt-1 text-xs text-slate-400">
                                {supplier.whatsapp || supplier.phone}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-5 text-sm text-slate-600">
                            {[supplier.city, supplier.country]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </td>

                          <td className="px-6 py-5">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {supplier.default_currency || "—"}
                            </span>
                          </td>

                          <td className="px-4 py-5 text-right text-slate-300">
                            →
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredSuppliers.length === 0 && (
                  <div className="px-6 py-16 text-center">
                    <div className="text-lg font-semibold text-slate-700">
                      Nenhum fornecedor encontrado
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Adicione o seu primeiro fornecedor ou altere os filtros.
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
          : "cursor-default text-slate-400 transition hover:bg-white/10 hover:text-white"
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
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-400">{detail}</div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
      />
    </label>
  );
}
