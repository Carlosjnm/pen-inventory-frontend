"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Product = {
  category: string | null;
};

type ProductForm = {
  sku: string;
  barcode: string;
  name: string;
  category: string;
  description: string;
  brand: string;
  status: string;
  selling_price: string;
  wholesale_price: string;
  selling_currency: string;
  reorder_level: string;
  reorder_quantity: string;
  notes: string;
};

const emptyForm: ProductForm = {
  sku: "",
  barcode: "",
  name: "",
  category: "",
  description: "",
  brand: "",
  status: "researching",
  selling_price: "",
  wholesale_price: "",
  selling_currency: "AOA",
  reorder_level: "0",
  reorder_quantity: "0",
  notes: "",
};

function optionalNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return null;

  return Number(trimmed.replace(",", "."));
}

export default function NewProductPage() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [categories, setCategories] = useState<string[]>([]);
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
      await loadCategories(user);
    });

    return () => unsubscribe();
  }, []);

  async function loadCategories(user: User) {
    try {
      setLoading(true);
      setMessage("");

      const token = await user.getIdToken();

      const response = await fetch(`${API_URL}/api/products`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Não foi possível carregar as categorias.");
      }

      const data = await response.json();
      const products: Product[] = data.products || [];

      const loadedCategories = Array.from(
        new Set(
          products
            .map((product) => product.category)
            .filter((value): value is string => Boolean(value))
        )
      ).sort();

      setCategories(loadedCategories);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados dos produtos."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateField(field: keyof ProductForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!firebaseUser) return;

    if (!form.name.trim()) {
      setMessage("Introduza o nome do produto.");
      return;
    }

    const sellingPrice = optionalNumber(form.selling_price);
    const wholesalePrice = optionalNumber(form.wholesale_price);
    const reorderLevel = optionalNumber(form.reorder_level);
    const reorderQuantity = optionalNumber(form.reorder_quantity);

    const numericValues = [
      sellingPrice,
      wholesalePrice,
      reorderLevel,
      reorderQuantity,
    ];

    if (
      numericValues.some(
        (value) => value !== null && (!Number.isFinite(value) || value < 0)
      )
    ) {
      setMessage("Os valores numéricos devem ser iguais ou superiores a zero.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const token = await firebaseUser.getIdToken();

      const response = await fetch(`${API_URL}/api/products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sku: form.sku.trim() || null,
          barcode: form.barcode.trim() || null,
          name: form.name.trim(),
          category: form.category.trim() || null,
          description: form.description.trim() || null,
          brand: form.brand.trim() || null,
          status: form.status,
          selling_price: sellingPrice,
          wholesale_price: wholesalePrice,
          selling_currency: form.selling_currency,
          reorder_level: reorderLevel,
          reorder_quantity: reorderQuantity,
          notes: form.notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail =
          typeof data.detail === "string"
            ? data.detail
            : "Não foi possível criar o produto.";

        throw new Error(detail);
      }

      const productId = data.product?.id || data.product_id || data.id;

      if (productId) {
        window.location.href = `/products/${productId}`;
      } else {
        window.location.href = "/products";
      }
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o produto."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/products";
            }}
            className="mb-3 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            ← Voltar aos Produtos
          </button>

          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Novo Produto
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Adicione um produto ao catálogo. Se deixar o SKU vazio, será gerado
            automaticamente.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              A carregar dados do produto...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <h2 className="text-lg font-bold text-slate-950">
                  Informação do Produto
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Identificação e classificação principal do produto.
                </p>
              </div>

              <div className="p-5 sm:p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Nome do Produto *">
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                      placeholder="Nome do produto"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Marca">
                    <input
                      type="text"
                      value={form.brand}
                      onChange={(event) =>
                        updateField("brand", event.target.value)
                      }
                      placeholder="Marca"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="SKU">
                    <input
                      type="text"
                      value={form.sku}
                      onChange={(event) =>
                        updateField("sku", event.target.value)
                      }
                      placeholder="Automático se ficar vazio"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Código de Barras">
                    <input
                      type="text"
                      value={form.barcode}
                      onChange={(event) =>
                        updateField("barcode", event.target.value)
                      }
                      placeholder="EAN, UPC ou outro código"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Categoria">
                    <input
                      type="text"
                      list="product-categories"
                      value={form.category}
                      onChange={(event) =>
                        updateField("category", event.target.value)
                      }
                      placeholder="Selecionar categoria existente"
                      className={inputClass}
                    />

                    <datalist id="product-categories">
                      {categories.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  </Field>

                  <Field label="Estado">
                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateField("status", event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="idea">Ideia</option>
                      <option value="researching">Em Pesquisa</option>
                      <option value="sample_ordered">
                        Amostra Encomendada
                      </option>
                      <option value="testing">Em Teste</option>
                      <option value="approved">Aprovado</option>
                      <option value="ordered">Encomendado</option>
                      <option value="in_stock">Em Stock</option>
                      <option value="selling">À Venda</option>
                      <option value="discontinued">Descontinuado</option>
                      <option value="archived">Arquivado</option>
                    </select>
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Descrição">
                      <textarea
                        rows={4}
                        value={form.description}
                        onChange={(event) =>
                          updateField("description", event.target.value)
                        }
                        placeholder="Descrição do produto..."
                        className={`${inputClass} resize-none`}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <h2 className="text-lg font-bold text-slate-950">
                  Preços e Stock
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Defina preços de venda e níveis de reposição.
                </p>
              </div>

              <div className="p-5 sm:p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Moeda">
                    <select
                      value={form.selling_currency}
                      onChange={(event) =>
                        updateField("selling_currency", event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="AOA">AOA — Kwanza</option>
                      <option value="USD">USD — Dólar Americano</option>
                      <option value="ZAR">ZAR — Rand Sul-Africano</option>
                      <option value="CNY">CNY — Yuan Chinês</option>
                    </select>
                  </Field>

                  <div />

                  <Field label="Preço de Venda">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={form.selling_price}
                      onChange={(event) =>
                        updateField("selling_price", event.target.value)
                      }
                      placeholder="0"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Preço de Atacado">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={form.wholesale_price}
                      onChange={(event) =>
                        updateField("wholesale_price", event.target.value)
                      }
                      placeholder="0"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Nível de Reposição">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={form.reorder_level}
                      onChange={(event) =>
                        updateField("reorder_level", event.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Quantidade de Reposição">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={form.reorder_quantity}
                      onChange={(event) =>
                        updateField("reorder_quantity", event.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <h2 className="text-lg font-bold text-slate-950">
                  Notas
                </h2>
              </div>

              <div className="p-5 sm:p-6">
                <textarea
                  rows={5}
                  value={form.notes}
                  onChange={(event) =>
                    updateField("notes", event.target.value)
                  }
                  placeholder="Notas internas sobre este produto..."
                  className={`${inputClass} resize-none`}
                />

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
                    window.location.href = "/products";
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
                  {saving ? "A criar..." : "Criar Produto"}
                </button>
              </div>
            </section>
          </form>
        )}
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
