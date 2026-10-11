"use client";

import {
  useEffect,
  useState,
} from "react";
import { auth } from "@/lib/firebase";
import MobileNav from "@/components/MobileNav";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

// PEN INTELLIGENT INITIAL STOCK IMPORT UI V1
type ImportLocation = {
  id: string;
  name: string;
  code: string;
  location_type: string;
};

type ImportSupplier = {
  id: string;
  supplier_code: string;
  name: string;
  default_currency: string | null;
};

type ImportStore = {
  id: string;
  slug: string;
  name: string;
  status: string;
  product_import_enabled: boolean;
  can_import_products: boolean;
  member_role: string;
  allowed: boolean;
};


// PEN IMPORTED PRODUCT PHOTOS V1
type ImportedProduct = {
  id: string;
  sku: string;
  name: string;
};

export default function ImportProductsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [acceptWarnings, setAcceptWarnings] = useState(false);

  // PEN STORE-SCOPED IMPORT UI V1
  const [importStores, setImportStores] =
    useState<ImportStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] =
    useState("");
  const [loadingAccess, setLoadingAccess] =
    useState(true);
  const [accessError, setAccessError] =
    useState("");
  const [isSuperAdmin, setIsSuperAdmin] =
    useState(false);

  const [importMode, setImportMode] =
    useState<"catalog_only" | "opening_stock">(
      "catalog_only"
    );
  const [importLocations, setImportLocations] =
    useState<ImportLocation[]>([]);
  const [importSuppliers, setImportSuppliers] =
    useState<ImportSupplier[]>([]);
  const [
    selectedLocationId,
    setSelectedLocationId,
  ] = useState("");
  const [
    selectedSupplierId,
    setSelectedSupplierId,
  ] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(
      async (user) => {
        if (!user) {
          setLoadingAccess(false);
          setAccessError(
            "Inicie sessão para consultar as lojas autorizadas."
          );
          return;
        }

        try {
          setLoadingAccess(true);
          setAccessError("");

          const token = await user.getIdToken();

          const response = await fetch(
            `${API_URL}/api/products/import/access`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              cache: "no-store",
            }
          );

          const data = await response
            .json()
            .catch(() => ({}));

          if (!response.ok) {
            throw new Error(
              data.detail ||
                "Não foi possível consultar as autorizações."
            );
          }

          const stores =
            (data.stores || []) as ImportStore[];

          setImportStores(stores);
          setIsSuperAdmin(
            Boolean(data.is_super_admin)
          );

          const locations = (
            data.locations ||
            data.inventory_locations ||
            data.allowed_locations ||
            []
          ) as ImportLocation[];

          const suppliers = (
            data.suppliers || []
          ) as ImportSupplier[];

          setImportLocations(locations);
          setImportSuppliers(suppliers);
          setSelectedLocationId(
            locations[0]?.id || ""
          );
          setSelectedSupplierId(
            suppliers[0]?.id || ""
          );

          const firstAllowed = stores.find(
            (store) => store.allowed
          );

          setSelectedStoreId(
            firstAllowed?.id || ""
          );
        } catch (error) {
          setAccessError(
            error instanceof Error
              ? error.message
              : "Não foi possível consultar as autorizações."
          );
        } finally {
          setLoadingAccess(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  async function performImport() {
    if (importing || importResult) return;

    if (!file || !selectedStoreId) {
      setError(
        "Selecione uma loja autorizada e um ficheiro."
      );
      return;
    }

    if (
      importMode === "opening_stock" &&
      (!selectedLocationId ||
        !selectedSupplierId)
    ) {
      setError(
        "Selecione o destino do stock e o fornecedor."
      );
      return;
    }

    setImporting(true);
    setError("");
    setImportResult(null);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Por favor, inicie sessão novamente.");
      }

      const token = await user.getIdToken();

      const form = new FormData();
      form.append("file", file);
      form.append(
        "store_id",
        selectedStoreId
      );
      form.append(
        "import_mode",
        importMode
      );

      if (importMode === "opening_stock") {
        form.append(
          "destination_location_id",
          selectedLocationId
        );
        form.append(
          "supplier_id",
          selectedSupplierId
        );
      }

      const response = await fetch(
        `${API_URL}/api/products/import?accept_warnings=${acceptWarnings}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: form,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const detail =
          typeof data.detail === "string"
            ? data.detail
            : data.detail?.message || "A importação de produtos falhou.";

        throw new Error(detail);
      }

      setImportResult(data);
    } catch (err: any) {
      setError(err.message || "A importação de produtos falhou.");
    } finally {
      setImporting(false);
    }
  }

  async function previewImport() {
    if (!file || !selectedStoreId) {
      setError(
        "Selecione uma loja autorizada e um ficheiro."
      );
      return;
    }

    if (
      importMode === "opening_stock" &&
      (!selectedLocationId ||
        !selectedSupplierId)
    ) {
      setError(
        "Selecione o destino do stock e o fornecedor."
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Por favor, inicie sessão novamente.");
      }

      const token = await user.getIdToken();

      const form = new FormData();
      form.append("file", file);
      form.append(
        "store_id",
        selectedStoreId
      );
      form.append(
        "import_mode",
        importMode
      );

      if (importMode === "opening_stock") {
        form.append(
          "destination_location_id",
          selectedLocationId
        );
        form.append(
          "supplier_id",
          selectedSupplierId
        );
      }

      const response = await fetch(
        `${API_URL}/api/products/import/preview`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: form,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "A pré-visualização da importação falhou.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "A pré-visualização da importação falhou.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="fixed right-4 top-4 z-40 lg:hidden">
        <MobileNav />
      </div>
      <div className="mx-auto max-w-7xl">
        <a
          href="/products"
          className="text-sm font-semibold text-slate-600 hover:text-slate-950"
        >
          ← Voltar aos Produtos
        </a>

        <h1 className="mt-6 text-3xl font-bold text-slate-950">
          Importar Produtos
        </h1>

        <p className="mt-2 text-slate-500">
          Carregue um catálogo de produtos em Excel ou CSV.
            </p>

            <a href="/PEN_Inventory_Product_Import_Template_v2.xlsx" download className="mt-4 inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50">
              ↓ Descarregar Modelo PEN
            </a>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              Autorização da loja
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Selecione a loja
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Os produtos importados e o respetivo
              histórico ficarão associados à loja
              selecionada.
            </p>
          </div>

          {loadingAccess ? (
            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              A consultar as suas autorizações...
            </div>
          ) : accessError ? (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"
            >
              {accessError}
            </div>
          ) : importStores.length === 0 ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
              Não está associado a nenhuma loja.
              Contacte o super-administrador.
            </div>
          ) : (
            <label className="mt-5 block max-w-xl">
              <span className="mb-2 block text-sm font-bold text-slate-800">
                Loja responsável pela importação
              </span>

              <select
                value={selectedStoreId}
                onChange={(event) => {
                  setSelectedStoreId(
                    event.target.value
                  );
                  setResult(null);
                  setImportResult(null);
                  setError("");
                }}
                className="w-full rounded-xl border border-slate-400 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
              >
                <option value="">
                  Selecione uma loja
                </option>

                {importStores.map((store) => (
                  <option
                    key={store.id}
                    value={store.id}
                    disabled={!store.allowed}
                  >
                    {store.name}
                    {!store.allowed
                      ? " — importação não autorizada"
                      : store.product_import_enabled
                        ? " — autorizada"
                        : isSuperAdmin
                          ? " — acesso de super-admin"
                          : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              Tipo de importação
            </p>

            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Como pretende importar?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pode criar apenas o catálogo ou criar
              produtos, oferta do fornecedor e stock
              inicial numa única operação.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setImportMode(
                  "catalog_only"
                );
                setResult(null);
                setImportResult(null);
                setError("");
              }}
              className={`rounded-2xl border p-5 text-left transition ${
                importMode === "catalog_only"
                  ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <span className="block font-black text-slate-950">
                Só catálogo
              </span>

              <span className="mt-2 block text-sm leading-6 text-slate-600">
                Cria os produtos sem alterar o stock.
                As compras continuam a poder ser
                registadas posteriormente.
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setImportMode(
                  "opening_stock"
                );
                setResult(null);
                setImportResult(null);
                setError("");
              }}
              className={`rounded-2xl border p-5 text-left transition ${
                importMode === "opening_stock"
                  ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <span className="block font-black text-slate-950">
                Produtos + stock inicial
              </span>

              <span className="mt-2 block text-sm leading-6 text-slate-600">
                Cria os produtos, associa o fornecedor
                e coloca as quantidades diretamente no
                armazém ou loja selecionada.
              </span>
            </button>
          </div>

          {importMode === "opening_stock" && (
            <div className="mt-6 grid gap-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-800">
                  Destino do stock inicial
                </span>

                <select
                  value={selectedLocationId}
                  onChange={(event) => {
                    setSelectedLocationId(
                      event.target.value
                    );
                    setResult(null);
                    setImportResult(null);
                    setError("");
                  }}
                  className="w-full rounded-xl border border-slate-400 bg-white px-4 py-3 text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="">
                    Selecione o destino
                  </option>

                  {importLocations.map(
                    (location) => (
                      <option
                        key={location.id}
                        value={location.id}
                      >
                        {location.name}
                        {" — "}
                        {location.location_type ===
                        "warehouse"
                          ? "Armazém"
                          : "Loja"}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-800">
                  Fornecedor
                </span>

                <select
                  value={selectedSupplierId}
                  onChange={(event) => {
                    setSelectedSupplierId(
                      event.target.value
                    );
                    setResult(null);
                    setImportResult(null);
                    setError("");
                  }}
                  className="w-full rounded-xl border border-slate-400 bg-white px-4 py-3 text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="">
                    Selecione o fornecedor
                  </option>

                  {importSuppliers.map(
                    (supplier) => (
                      <option
                        key={supplier.id}
                        value={supplier.id}
                      >
                        {supplier.name}
                        {" — "}
                        {supplier.supplier_code}
                      </option>
                    )
                  )}
                </select>
              </label>

              <div className="md:col-span-2 rounded-xl border border-emerald-200 bg-white p-4 text-sm leading-6 text-emerald-950">
                <strong>
                  Resultado:
                </strong>{" "}
                cada produto novo terá uma oferta
                preferencial do fornecedor e um movimento
                de stock do tipo saldo inicial. O custo
                será usado no cálculo da margem.
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center transition hover:border-slate-500 hover:bg-slate-100">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-2xl text-white">
              ↑
            </div>

            <span className="text-base font-bold text-slate-900">
              Carregar Excel ou CSV
            </span>

            <span className="mt-1 text-sm text-slate-500">
              Click to select a file from your computer
            </span>

            <span className="mt-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
              .XLSX ou .CSV · Máximo 10 MB
            </span>

            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>

          {file && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {file.name}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB · Ready to analyse
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  setError("");
                }}
                className="text-sm font-semibold text-slate-500 hover:text-red-600"
              >
                Remover
              </button>
            </div>
          )}

          <button
            onClick={previewImport}
            disabled={
              !file ||
              !selectedStoreId ||
              loading ||
              loadingAccess ||
              (importMode === "opening_stock" &&
                (!selectedLocationId ||
                  !selectedSupplierId))
            }
            className="mt-5 rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? "A analisar..." : "Analisar Ficheiro"}
          </button>

          {error && (
            <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Resumo da Importação
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review the analysis before importing anything.
                </p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                  Destino da importação
                </p>

                <p className="mt-2 font-black text-slate-950">
                  {result.import_mode ===
                  "opening_stock"
                    ? "Produtos + stock inicial"
                    : "Só catálogo"}
                </p>

                {result.destination && (
                  <p className="mt-1 text-sm text-slate-700">
                    Stock:{" "}
                    <strong>
                      {result.destination.name}
                    </strong>
                  </p>
                )}

                {result.supplier && (
                  <p className="mt-1 text-sm text-slate-700">
                    Fornecedor:{" "}
                    <strong>
                      {result.supplier.name}
                    </strong>
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryCard
                  label="Rows Analysed"
                  value={result.preview_count || 0}
                />
                <SummaryCard
                  label="Novos Produtos"
                  value={result.summary?.new || 0}
                  tone="green"
                />
                <SummaryCard
                  label="Produtos Existentes"
                  value={result.summary?.existing || 0}
                  tone="amber"
                />
                <SummaryCard
                  label="Warnings"
                  value={result.summary?.warning || 0}
                  tone="yellow"
                />
                <SummaryCard
                  label="Erros"
                  value={result.summary?.error || 0}
                  tone="red"
                />
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h3 className="font-bold text-slate-950">
                    Pré-visualização dos Produtos
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Review every product before importing.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Linha</th>
                        <th className="px-5 py-3">SKU</th>
                        <th className="px-5 py-3">Produto</th>
                        <th className="px-5 py-3">Categoria</th>
                        <th className="px-5 py-3">Custo</th>
                        <th className="px-5 py-3">Stock</th>
                        <th className="px-5 py-3">Estado</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {result.rows?.map((row: any) => {
                        const source = row.source || {};
                        const map = result.mapping || {};

                        return (
                          <tr key={row.row_number}>
                            <td className="px-5 py-4 text-slate-500">
                              {row.row_number}
                            </td>

                            <td className="px-5 py-4 font-semibold text-slate-900">
                              {source[map.sku] || "—"}
                            </td>

                            <td className="px-5 py-4 text-slate-900">
                              {source[map.name] || "—"}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {source[map.category] || "—"}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {source[map.unit_cost] || "—"}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {source[map.opening_stock] || "0"}
                            </td>

                            <td className="px-5 py-4">
                              <div className="space-y-2">
                                <StatusBadge status={row.status} />

                                {row.warnings?.map((message: string, index: number) => (
                                  <div
                                    key={`warning-${index}`}
                                    className="text-xs font-medium text-amber-700"
                                  >
                                    ⚠ {message}
                                  </div>
                                ))}

                                {row.errors?.map((message: string, index: number) => (
                                  <div
                                    key={`error-${index}`}
                                    className="text-xs font-medium text-red-700"
                                  >
                                    ✕ {message}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ficheiro
                </div>
                <div className="mt-1 font-semibold text-slate-900">
                  {result.filename}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-bold text-slate-950">
                  Pronto para Importar
                </h3>

                {result.summary?.error > 0 ? (
                  <div className="mt-3 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
                    Fix all errors before importing.
                  </div>
                ) : (
                  <>
                    {result.summary?.warning > 0 && (
                      <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <input
                          type="checkbox"
                          checked={acceptWarnings}
                          onChange={(e) => setAcceptWarnings(e.target.checked)}
                          className="mt-1 h-4 w-4"
                        />

                        <span className="text-sm text-amber-900">
                          I reviewed the warnings and want to continue.
                        </span>
                      </label>
                    )}

                    <button
                      type="button"
                      onClick={performImport}
                      disabled={
                        importing ||
                        Boolean(importResult) ||
                        (result.summary?.warning > 0 && !acceptWarnings)
                      }
                      className="mt-5 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {importResult ? "Importação concluída" : importing ? "A importar..." : "Importar Produtos"}
                    </button>
                  </>
                )}
              </div>

              {importResult && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                    <h3 className="text-lg font-bold text-emerald-950">
                      Importação concluída
                    </h3>

                    <p className="mt-2 text-sm text-emerald-900">
                      {importResult.created_count || 0} produto(s) criado(s).
                      {" "}
                      {importResult.skipped_existing_count || 0} produto(s) existente(s) ignorado(s).
                    </p>

                    {importResult.opening_stock_imported && (
                      <p className="mt-2 text-sm font-bold text-emerald-900">
                        ✓ Stock inicial registado em{" "}
                        {importResult.destination?.name}.
                      </p>
                    )}

                    {importResult.supplier_offers_imported && (
                      <p className="mt-2 text-sm font-bold text-emerald-900">
                        ✓ Oferta do fornecedor{" "}
                        {importResult.supplier?.name} criada
                        para cálculo da margem.
                      </p>
                    )}

                    <p className="mt-2 text-sm text-emerald-800">
                      Agora pode adicionar fotografias aos
                      produtos criados. Esta etapa é opcional.
                    </p>
                  </div>

                  {Array.isArray(
                    importResult.created
                  ) &&
                    importResult.created.length > 0 && (
                      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div>
                          <h3 className="text-lg font-bold text-slate-950">
                            Fotografias dos produtos
                          </h3>

                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            Escolha até 8 fotografias por
                            produto. A primeira fotografia
                            selecionada será a imagem
                            principal.
                          </p>
                        </div>

                        <div className="mt-5 space-y-5">
                          {(
                            importResult.created as
                              ImportedProduct[]
                          ).map((product) => (
                            <ImportedProductPhotos
                              key={product.id}
                              product={product}
                              importId={
                                importResult.import_id
                              }
                              storeId={
                                importResult.store.id
                              }
                            />
                          ))}
                        </div>
                      </section>
                    )}

                  <a
                    href="/products"
                    className="inline-flex rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                  >
                    Ver produtos
                  </a>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ImportedProductPhotos({
  product,
  importId,
  storeId,
}: {
  product: ImportedProduct;
  importId: string;
  storeId: string;
}) {
  const [
    selectedImages,
    setSelectedImages,
  ] = useState<
    Array<{
      file: File;
      previewUrl: string;
    }>
  >([]);
  const [uploading, setUploading] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [isError, setIsError] =
    useState(false);
  const [uploadedCount, setUploadedCount] =
    useState(0);

  useEffect(() => {
    return () => {
      selectedImages.forEach((image) =>
        URL.revokeObjectURL(
          image.previewUrl
        )
      );
    };
  }, [selectedImages]);

  function selectImages(
    files: FileList | null
  ) {
    setMessage("");
    setIsError(false);

    if (!files) {
      setSelectedImages([]);
      return;
    }

    const chosen = Array.from(files).slice(
      0,
      8
    );

    const invalid = chosen.find(
      (file) =>
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(file.type) ||
        file.size > 10 * 1024 * 1024
    );

    if (invalid) {
      setIsError(true);
      setMessage(
        "Use apenas JPEG, PNG ou WEBP até 10 MB por imagem."
      );
      return;
    }

    setSelectedImages(
      chosen.map((file) => ({
        file,
        previewUrl:
          URL.createObjectURL(file),
      }))
    );
  }

  async function uploadImages() {
    if (selectedImages.length === 0) {
      setIsError(true);
      setMessage(
        "Selecione pelo menos uma fotografia."
      );
      return;
    }

    try {
      setUploading(true);
      setMessage("");
      setIsError(false);

      const user = auth.currentUser;

      if (!user) {
        throw new Error(
          "Por favor, inicie sessão novamente."
        );
      }

      const token = await user.getIdToken();
      let completed = 0;

      // O backend torna a imagem mais recente
      // principal. Enviamos em ordem inversa
      // para a primeira escolhida terminar
      // como fotografia principal.
      for (
        const image of
        [...selectedImages].reverse()
      ) {
        const form = new FormData();
        form.append("file", image.file);
        form.append("store_id", storeId);

        const response = await fetch(
          `${API_URL}/api/products/imports/${importId}/products/${product.id}/images`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            body: form,
          }
        );

        const data = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.detail ||
              `Não foi possível carregar ${image.file.name}.`
          );
        }

        completed += 1;
        setUploadedCount(completed);
      }

      setSelectedImages([]);
      setMessage(
        `${completed} fotografia(s) carregada(s).`
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as fotografias."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
            {product.sku}
          </p>

          <h4 className="mt-1 font-black text-slate-950">
            {product.name}
          </h4>
        </div>

        {uploadedCount > 0 && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
            {uploadedCount} carregada(s)
          </span>
        )}
      </div>

      <label className="mt-4 block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-white p-5 text-center hover:border-emerald-500">
        <span className="block font-bold text-slate-800">
          Escolher fotografias
        </span>

        <span className="mt-1 block text-xs text-slate-500">
          JPEG, PNG ou WEBP · máximo 8 · 10 MB cada
        </span>

        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          onChange={(event) => {
            selectImages(
              event.target.files
            );
            event.currentTarget.value = "";
          }}
          className="hidden"
        />
      </label>

      {selectedImages.length > 0 && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {selectedImages.map(
              (image, index) => (
                <div
                  key={
                    image.file.name +
                    image.file.lastModified
                  }
                  className="relative overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <img
                    src={image.previewUrl}
                    alt={`Pré-visualização ${index + 1}`}
                    className="aspect-square w-full object-cover"
                  />

                  {index === 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-[#b9ff66] px-2 py-1 text-[10px] font-black text-[#102820] shadow">
                      PRINCIPAL
                    </span>
                  )}
                </div>
              )
            )}
          </div>

          <button
            type="button"
            disabled={uploading}
            onClick={() =>
              void uploadImages()
            }
            className="mt-4 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {uploading
              ? `A carregar ${uploadedCount + 1} de ${selectedImages.length}...`
              : "Carregar fotografias"}
          </button>
        </>
      )}

      {message && (
        <p
          className={`mt-3 rounded-xl border px-4 py-3 text-sm font-bold ${
            isError
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-emerald-300 bg-emerald-50 text-emerald-800"
          }`}
        >
          {message}
        </p>
      )}
    </article>
  );
}


function SummaryCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "green" | "amber" | "yellow" | "red";
}) {
  const styles = {
    slate: "border-slate-200 bg-white text-slate-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    yellow: "border-yellow-200 bg-yellow-50 text-yellow-900",
    red: "border-red-200 bg-red-50 text-red-900",
  };

  return (
    <div className={`rounded-2xl border p-5 ${styles[tone]}`}>
      <div className="text-sm font-semibold opacity-70">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEW: "bg-emerald-100 text-emerald-800",
    EXISTING: "bg-amber-100 text-amber-800",
    WARNING: "bg-yellow-100 text-yellow-800",
    ERROR: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        styles[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}
