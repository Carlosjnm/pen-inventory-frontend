"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  status: string;
  selling_price: number | null;
  selling_currency: string;
  reorder_level: number;
  reorder_quantity: number;
  category: string | null;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      try {
        const token = await user.getIdToken();

        const response = await fetch(`${API_URL}/api/products`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Unable to load products.");
        }

        const data = await response.json();
        setProducts(data.products || []);
      } catch (error) {
        console.error(error);
        setMessage("Unable to load products.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.category)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [products]
  );

  const statuses = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.status))).sort(),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.sku.toLowerCase().includes(query) ||
        product.name.toLowerCase().includes(query) ||
        (product.barcode || "").toLowerCase().includes(query) ||
        (product.description || "").toLowerCase().includes(query);

      const matchesCategory = !category || product.category === category;
      const matchesStatus = !status || product.status === status;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, search, category, status]);

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  function clearFilters() {
    setSearch("");
    setCategory("");
    setStatus("");
  }

  function formatStatus(value: string) {
    return value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function formatPrice(product: Product) {
    if (product.selling_price === null) return "—";

    return `${product.selling_currency} ${Number(
      product.selling_price
    ).toLocaleString()}`;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Products</h1>
            <p className="mt-1 text-slate-500">
              PEN Inventory product catalogue
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search SKU, product, barcode..."
              className="rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
            />

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="">All statuses</option>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {formatStatus(item)}
                </option>
              ))}
            </select>

            <button
              onClick={clearFilters}
              className="rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-700"
            >
              Clear filters
            </button>
          </div>
        </div>

        <div className="mb-3 text-sm text-slate-500">
          Showing {filteredProducts.length} of {products.length} products
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            Loading products...
          </div>
        ) : message ? (
          <div className="rounded-2xl bg-white p-8 text-red-600 shadow-sm">
            {message}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-5 py-4">SKU</th>
                    <th className="px-5 py-4">Product</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Price</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      onClick={() => {
                        window.location.href = `/products/${product.id}`;
                      }}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {product.sku}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">
                          {product.name}
                        </div>
                        {product.description && (
                          <div className="mt-1 max-w-xl truncate text-sm text-slate-500">
                            {product.description}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {product.category || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                          {formatStatus(product.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {formatPrice(product)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredProducts.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No products match the selected filters.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
