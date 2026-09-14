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
          throw new Error("Não foi possível carregar os produtos.");
        }

        const data = await response.json();
        setProducts(data.products || []);
      } catch (error) {
        console.error(error);
        setMessage("Não foi possível carregar os produtos.");
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

  const pricedProducts = products.filter(
    (product) => product.selling_price !== null
  ).length;

  const activeResearch = products.filter(
    (product) =>
      product.status === "researching" ||
      product.status === "testing" ||
      product.status === "sample_ordered"
  ).length;

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
    const translations: Record<string, string> = {
      researching: "Em Pesquisa",
      testing: "Em Teste",
      sample_ordered: "Amostra Encomendada",
      ordered: "Encomendado",
      selling: "À Venda",
      in_stock: "Em Stock",
      out_of_stock: "Sem Stock",
      discontinued: "Descontinuado",
      archived: "Arquivado",
      active: "Ativo",
      inactive: "Inativo",
    };

    return (
      translations[value.toLowerCase()] ||
      value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    );
  }

  function formatPrice(product: Product) {
    if (product.selling_price === null) return "—";

    return `${product.selling_currency} ${Number(
      product.selling_price
    ).toLocaleString()}`;
  }

  function statusClass(value: string) {
    if (value === "selling" || value === "in_stock") {
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    }

    if (value === "researching" || value === "testing") {
      return "bg-blue-50 text-blue-700 ring-blue-600/20";
    }

    if (value === "ordered" || value === "sample_ordered") {
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    }

    if (value === "discontinued" || value === "archived") {
      return "bg-slate-100 text-slate-600 ring-slate-500/20";
    }

    return "bg-violet-50 text-violet-700 ring-violet-600/20";
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
          <NavItem label="Produtos" icon="▦" active href="/products" />
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
          <div className="flex h-20 items-center justify-between px-4 md:px-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                Produtos
              </h1>
              <p className="text-sm text-slate-500">
                Gerir o catálogo completo de produtos
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/products/import"
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Importar Produtos
              </a>

              <div className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:block">
                {products.length} produtos
              </div>

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
            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total de Produtos"
                value={products.length}
                detail="Catálogo completo"
              />
              <SummaryCard
                label="Categorias"
                value={categories.length}
                detail="Grupos de produtos"
              />
              <SummaryCard
                label="Em Pesquisa"
                value={activeResearch}
                detail="Produtos em avaliação"
              />
              <SummaryCard
                label="Com Preço"
                value={pricedProducts}
                detail="Preço de venda definido"
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
                    placeholder="Pesquisar SKU, produto, código de barras..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                >
                  <option value="">Todas as categorias</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                >
                  <option value="">Todos os estados</option>
                  {statuses.map((item) => (
                    <option key={item} value={item}>
                      {formatStatus(item)}
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
                  {filteredProducts.length}
                </span>{" "}
                de {products.length} produtos
              </p>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                A carregar produtos...
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
                        <th className="px-6 py-4">SKU</th>
                        <th className="px-6 py-4">Produto</th>
                        <th className="px-6 py-4">Categoria</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4 text-right">Preço</th>
                        <th className="w-12 px-4 py-4"></th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map((product) => (
                        <tr
                          key={product.id}
                          onClick={() => {
                            window.location.href = `/products/${product.id}`;
                          }}
                          className="group cursor-pointer transition hover:bg-slate-50"
                        >
                          <td className="px-6 py-5 align-top">
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                              {product.sku}
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <div className="font-semibold text-slate-900 transition group-hover:text-slate-700">
                              {product.name}
                            </div>

                            {product.description && (
                              <div className="mt-1 max-w-lg truncate text-sm text-slate-500">
                                {product.description}
                              </div>
                            )}

                            {product.brand && (
                              <div className="mt-1 text-xs text-slate-400">
                                {product.brand}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-5 text-sm text-slate-600">
                            {product.category || "—"}
                          </td>

                          <td className="px-6 py-5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(
                                product.status
                              )}`}
                            >
                              {formatStatus(product.status)}
                            </span>
                          </td>

                          <td className="px-6 py-5 text-right font-semibold text-slate-800">
                            {formatPrice(product)}
                          </td>

                          <td className="px-4 py-5 text-right text-slate-300 transition group-hover:text-slate-600">
                            →
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredProducts.length === 0 && (
                  <div className="px-6 py-16 text-center">
                    <div className="text-lg font-semibold text-slate-700">
                      Nenhum produto encontrado
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Tente alterar a pesquisa ou os filtros.
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
