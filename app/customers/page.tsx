"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Customer = {
  id: string;
  customer_number: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CustomerForm = {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  notes: string;
};

const emptyForm: CustomerForm = {
  name: "",
  phone: "",
  whatsapp: "",
  email: "",
  address_line1: "",
  address_line2: "",
  city: "",
  province: "",
  postal_code: "",
  country: "",
  notes: "",
};

export default function CustomersPage() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [form, setForm] = useState<CustomerForm>(emptyForm);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      setFirebaseUser(user);
      await loadCustomers(user);
    });

    return () => unsubscribe();
  }, []);

  async function loadCustomers(user: User) {
    try {
      setLoading(true);
      setMessage("");

      const token = await user.getIdToken();

      const response = await fetch(`${API_URL}/api/customers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load customers.");
      }

      setCustomers(data.customers || []);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Unable to load customers."
      );
    } finally {
      setLoading(false);
    }
  }

  const countries = useMemo(
    () =>
      Array.from(
        new Set(
          customers
            .map((customer) => customer.country)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [customers]
  );

  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          customers
            .map((customer) => customer.city)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [customers]
  );

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        !query ||
        customer.customer_number.toLowerCase().includes(query) ||
        customer.name.toLowerCase().includes(query) ||
        (customer.email || "").toLowerCase().includes(query) ||
        (customer.phone || "").toLowerCase().includes(query) ||
        (customer.whatsapp || "").toLowerCase().includes(query) ||
        (customer.city || "").toLowerCase().includes(query);

      const matchesCountry = !country || customer.country === country;
      const matchesCity = !city || customer.city === city;

      return matchesSearch && matchesCountry && matchesCity;
    });
  }, [customers, search, country, city]);

  const customersWithWhatsApp = customers.filter(
    (customer) => customer.whatsapp
  ).length;

  const customersWithEmail = customers.filter(
    (customer) => customer.email
  ).length;

  async function handleCreateCustomer(event: React.FormEvent) {
    event.preventDefault();

    if (!firebaseUser) return;

    if (!form.name.trim()) {
      setFormMessage("Customer name is required.");
      return;
    }

    try {
      setSaving(true);
      setFormMessage("");

      const token = await firebaseUser.getIdToken();

      const response = await fetch(`${API_URL}/api/customers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Unable to create customer.");
      }

      setForm(emptyForm);
      setShowCreate(false);
      await loadCustomers(firebaseUser);
    } catch (error) {
      console.error(error);
      setFormMessage(
        error instanceof Error ? error.message : "Unable to create customer."
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
    setCity("");
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
          <NavItem label="Sales" icon="↑" href="/sales" />
          <NavItem label="Suppliers" icon="♢" href="/suppliers" />
          <NavItem label="Customers" icon="♙" active href="/customers" />
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
                Customers
              </h1>
              <p className="text-sm text-slate-500">
                Manage customer records and contact information
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:block">
                {customers.length} customers
              </div>

              <button
                onClick={() => {
                  setShowCreate((value) => !value);
                  setFormMessage("");
                }}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                {showCreate ? "Close" : "+ Add Customer"}
              </button>

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
            {showCreate && (
              <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-slate-950">
                    Add Customer
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Customer number will be generated automatically.
                  </p>
                </div>

                <form onSubmit={handleCreateCustomer}>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <FormField
                      label="Customer Name *"
                      value={form.name}
                      onChange={(value) => setForm({ ...form, name: value })}
                      placeholder="Customer or company name"
                    />

                    <FormField
                      label="Phone"
                      value={form.phone}
                      onChange={(value) => setForm({ ...form, phone: value })}
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
                      label="Email"
                      value={form.email}
                      onChange={(value) => setForm({ ...form, email: value })}
                      placeholder="customer@example.com"
                      type="email"
                    />

                    <FormField
                      label="City"
                      value={form.city}
                      onChange={(value) => setForm({ ...form, city: value })}
                      placeholder="City"
                    />

                    <FormField
                      label="Province"
                      value={form.province}
                      onChange={(value) =>
                        setForm({ ...form, province: value })
                      }
                      placeholder="Province"
                    />

                    <FormField
                      label="Country"
                      value={form.country}
                      onChange={(value) =>
                        setForm({ ...form, country: value })
                      }
                      placeholder="Country"
                    />

                    <FormField
                      label="Postal Code"
                      value={form.postal_code}
                      onChange={(value) =>
                        setForm({ ...form, postal_code: value })
                      }
                      placeholder="Postal code"
                    />

                    <div className="md:col-span-2">
                      <FormField
                        label="Address Line 1"
                        value={form.address_line1}
                        onChange={(value) =>
                          setForm({ ...form, address_line1: value })
                        }
                        placeholder="Street address"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <FormField
                        label="Address Line 2"
                        value={form.address_line2}
                        onChange={(value) =>
                          setForm({ ...form, address_line2: value })
                        }
                        placeholder="Apartment, building, area..."
                      />
                    </div>

                    <div className="md:col-span-2 xl:col-span-3">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Notes
                        </span>
                        <textarea
                          value={form.notes}
                          onChange={(event) =>
                            setForm({ ...form, notes: event.target.value })
                          }
                          rows={3}
                          placeholder="Additional customer information..."
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
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Create Customer"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total Customers"
                value={customers.length}
                detail="Active customers"
              />
              <SummaryCard
                label="With WhatsApp"
                value={customersWithWhatsApp}
                detail="WhatsApp contact recorded"
              />
              <SummaryCard
                label="With Email"
                value={customersWithEmail}
                detail="Email address recorded"
              />
              <SummaryCard
                label="Cities"
                value={cities.length}
                detail="Customer locations"
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
                    placeholder="Search customer, number, phone, email..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <select
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                >
                  <option value="">All countries</option>
                  {countries.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <select
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                >
                  <option value="">All cities</option>
                  {cities.map((item) => (
                    <option key={item} value={item}>
                      {item}
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
                  {filteredCustomers.length}
                </span>{" "}
                of {customers.length} customers
              </p>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                Loading customers...
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
                        <th className="px-6 py-4">Number</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4">Location</th>
                        <th className="w-12 px-4 py-4"></th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredCustomers.map((customer) => (
                        <tr
                          key={customer.id}
                          onClick={() => {
                            window.location.href = `/customers/${customer.id}`;
                          }}
                          className="group cursor-pointer transition hover:bg-slate-50"
                        >
                          <td className="px-6 py-5 align-top">
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                              {customer.customer_number}
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <div className="font-semibold text-slate-900">
                              {customer.name}
                            </div>
                            {customer.email && (
                              <div className="mt-1 text-xs text-slate-500">
                                {customer.email}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-5">
                            <div className="text-sm font-medium text-slate-700">
                              {customer.phone || "—"}
                            </div>
                            {customer.whatsapp && (
                              <div className="mt-1 text-xs text-slate-500">
                                WhatsApp: {customer.whatsapp}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-5 text-sm text-slate-600">
                            {[customer.city, customer.province, customer.country]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </td>

                          <td className="px-4 py-5 text-right text-slate-300">
                            →
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredCustomers.length === 0 && (
                  <div className="px-6 py-16 text-center">
                    <div className="text-lg font-semibold text-slate-700">
                      No customers found
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Add your first customer or change your filters.
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
