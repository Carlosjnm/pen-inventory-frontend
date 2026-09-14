"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

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
  order_date: new Date().toISOString().slice(0, 10),
  expected_date: "",
  supplier_reference: "",
  notes: "",
};

export default function NewPurchaseOrderPage() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState<POForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      setFirebaseUser(user);
      await loadSetupData(user);
    });

    return () => unsubscribe();
  }, []);

  async function loadSetupData(user: User) {
    try {
      setLoading(true);
      setMessage("");

      const token = await user.getIdToken();

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [supplierResponse, locationResponse] = await Promise.all([
        fetch(`${API_URL}/api/suppliers`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/locations`, {
          headers,
          cache: "no-store",
        }),
      ]);

      if (!supplierResponse.ok || !locationResponse.ok) {
        throw new Error(
          "Não foi possível carregar os dados necessários para criar a ordem de compra."
        );
      }

      const [supplierData, locationData] = await Promise.all([
        supplierResponse.json(),
        locationResponse.json(),
      ]);

      setSuppliers(supplierData.suppliers || []);
      setLocations(locationData.locations || []);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados da compra."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSupplierChange(supplierId: string) {
    const supplier = suppliers.find((item) => item.id === supplierId);

    setForm((current) => ({
      ...current,
      supplier_id: supplierId,
      currency: supplier?.default_currency || "AOA",
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!firebaseUser) return;

    if (!form.supplier_id) {
      setMessage("Selecione um fornecedor.");
      return;
    }

    if (!form.destination_location_id) {
      setMessage("Selecione a localização de destino.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const token = await firebaseUser.getIdToken();

      const response = await fetch(`${API_URL}/api/purchase-orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplier_id: form.supplier_id,
          destination_location_id: form.destination_location_id,
          currency: form.currency,
          order_date: form.order_date || null,
          expected_date: form.expected_date || null,
          supplier_reference: form.supplier_reference.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível criar a ordem de compra."
        );
      }

      const purchaseOrderId =
        data.purchase_order?.id ||
        data.purchase_order_id ||
        data.id;

      if (purchaseOrderId) {
        window.location.href = `/purchases/${purchaseOrderId}`;
      } else {
        window.location.href = "/purchases";
      }
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a ordem de compra."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/purchases";
              }}
              className="mb-3 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
            >
              ← Voltar às Compras
            </button>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Nova Ordem de Compra
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Crie uma nova ordem de compra. O número da OC será gerado
              automaticamente.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              A carregar dados da compra...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <h2 className="text-lg font-bold text-slate-950">
                  Informação da Ordem
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Selecione o fornecedor, destino e condições principais da
                  compra.
                </p>
              </div>

              <div className="p-5 sm:p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Fornecedor *
                    </span>

                    <select
                      required
                      value={form.supplier_id}
                      onChange={(event) =>
                        handleSupplierChange(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    >
                      <option value="">Selecionar fornecedor</option>

                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.supplier_code} — {supplier.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Localização de Destino *
                    </span>

                    <select
                      required
                      value={form.destination_location_id}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          destination_location_id: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    >
                      <option value="">Selecionar localização</option>

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
                        setForm((current) => ({
                          ...current,
                          currency: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    >
                      <option value="AOA">AOA — Kwanza</option>
                      <option value="USD">USD — Dólar Americano</option>
                      <option value="ZAR">ZAR — Rand Sul-Africano</option>
                      <option value="CNY">CNY — Yuan Chinês</option>
                      <option value="EUR">EUR — Euro</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Referência do Fornecedor
                    </span>

                    <input
                      type="text"
                      value={form.supplier_reference}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          supplier_reference: event.target.value,
                        }))
                      }
                      placeholder="Cotação, fatura ou referência"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Data da Ordem
                    </span>

                    <input
                      type="date"
                      value={form.order_date}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          order_date: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Data Prevista de Entrega
                    </span>

                    <input
                      type="date"
                      value={form.expected_date}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          expected_date: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Notas
                    </span>

                    <textarea
                      rows={5}
                      value={form.notes}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Notas adicionais sobre esta ordem de compra..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </label>
                </div>

                {message && (
                  <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {message}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    window.location.href = "/purchases";
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "A criar..." : "Criar Ordem de Compra"}
                </button>
              </div>
            </section>
          </form>
        )}
      </div>
    </main>
  );
}
