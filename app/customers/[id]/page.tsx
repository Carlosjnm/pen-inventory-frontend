"use client";

import { use, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
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

type Sale = {
  id: string;
  sale_number: string;
  status: string;
  sales_channel: string;
  currency: string;
  sale_date: string;
  total_amount: number;
  customer_reference: string | null;
  location_id: string;
  location_code: string;
  location_name: string;
  amount_paid: number;
  balance_due: number;
};

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      setFirebaseUser(user);
      await loadCustomer(user);
    });

    return () => unsubscribe();
  }, [id]);

  async function loadCustomer(user: User) {
    try {
      setLoading(true);
      setMessage("");

      const token = await user.getIdToken();

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [customerResponse, salesResponse] = await Promise.all([
        fetch(`${API_URL}/api/customers/${id}`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/customers/${id}/sales`, {
          headers,
          cache: "no-store",
        }),
      ]);

      const [customerData, salesData] = await Promise.all([
        customerResponse.json(),
        salesResponse.json(),
      ]);

      if (!customerResponse.ok) {
        throw new Error(
          customerData.detail || "Unable to load customer."
        );
      }

      if (!salesResponse.ok) {
        throw new Error(
          salesData.detail || "Unable to load customer sales."
        );
      }

      setCustomer(customerData.customer);
      setSales(salesData.sales_orders || []);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load customer."
      );
    } finally {
      setLoading(false);
    }
  }

  const totalSales = useMemo(
    () =>
      sales.reduce(
        (sum, sale) => sum + Number(sale.total_amount || 0),
        0
      ),
    [sales]
  );

  const totalPaid = useMemo(
    () =>
      sales.reduce(
        (sum, sale) => sum + Number(sale.amount_paid || 0),
        0
      ),
    [sales]
  );

  const totalOutstanding = useMemo(
    () =>
      sales.reduce(
        (sum, sale) => sum + Number(sale.balance_due || 0),
        0
      ),
    [sales]
  );

  function formatMoney(value: number) {
    return `AOA ${Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatStatus(value: string) {
    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-600">
        Loading customer...
      </div>
    );
  }

  if (message || !customer) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <button
          type="button"
          onClick={() => {
            window.location.href = "/customers";
          }}
          className="mb-5 text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Back to Customers
        </button>

        <div className="rounded-2xl border border-red-200 bg-white p-8 text-red-600 shadow-sm">
          {message || "Customer not found."}
        </div>
      </div>
    );
  }

  const address = [
    customer.address_line1,
    customer.address_line2,
    customer.city,
    customer.province,
    customer.postal_code,
    customer.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-8">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/customers";
            }}
            className="mb-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            ← Back to Customers
          </button>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                {customer.customer_number}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                {customer.name}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Customer profile and sales history
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                customer.is_active
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {customer.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Total Sales"
            value={formatMoney(totalSales)}
            detail={`${sales.length} sales orders`}
          />
          <SummaryCard
            label="Paid"
            value={formatMoney(totalPaid)}
            detail="Payments received"
          />
          <SummaryCard
            label="Outstanding"
            value={formatMoney(totalOutstanding)}
            detail="Balance due"
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Contact Details
              </h2>

              <div className="mt-5 space-y-4">
                <InfoRow label="Phone" value={customer.phone || "—"} />
                <InfoRow
                  label="WhatsApp"
                  value={customer.whatsapp || "—"}
                />
                <InfoRow label="Email" value={customer.email || "—"} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Address
              </h2>

              <div className="mt-5 text-sm leading-6 text-slate-700">
                {address || "No address recorded."}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Notes
              </h2>

              <div className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {customer.notes || "No notes recorded."}
              </div>
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-950">
                Sales History
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Orders linked to this customer
              </p>
            </div>

            {sales.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">
                No sales recorded for this customer yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-4">Sale</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Location</th>
                      <th className="px-6 py-4 text-right">
                        Total
                      </th>
                      <th className="px-6 py-4 text-right">
                        Balance
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {sales.map((sale) => (
                      <tr
                        key={sale.id}
                        onClick={() => {
                          window.location.href = `/sales/${sale.id}`;
                        }}
                        className="cursor-pointer transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-5">
                          <div className="font-semibold text-slate-900">
                            {sale.sale_number}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatStatus(sale.sales_channel)}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-600">
                          {formatDate(sale.sale_date)}
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {formatStatus(sale.status)}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-600">
                          {sale.location_name}
                        </td>

                        <td className="px-6 py-5 text-right font-semibold text-slate-900">
                          {formatMoney(sale.total_amount)}
                        </td>

                        <td className="px-6 py-5 text-right text-sm text-slate-600">
                          {formatMoney(sale.balance_due)}
                        </td>
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
      <div className="mt-1 text-sm font-medium text-slate-800">
        {value}
      </div>
    </div>
  );
}
