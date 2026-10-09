"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { User } from "firebase/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type RequestSummary = {
  id: string;
  request_number: string;
  title: string;
  customer_name: string;
  provider_name: string;
};

type Product = {
  listing_id: string;
  product_slug: string;
  public_name: string;
  short_description: string | null;
  public_price: number;
  currency: string;
  store_id: string;
  store_name: string;
  store_slug: string;
  available_quantity: number;
};

type MaterialItem = {
  local_id: string;
  id?: string;
  listing_id: string | null;
  source_type:
    | "nazunga_store"
    | "external_when_unavailable";
  item_name: string;
  description: string;
  specification: string;
  quantity: string;
  unit: string;
  currency: string;
  unit_price_snapshot: number | null;
  estimated_total: number | null;
  is_required: boolean;
  customer_approved?: boolean;
  status?: string;
  store_name?: string | null;
};

type MaterialData = {
  request: {
    request_number: string;
    materials_status: string;
  };
  material_list: {
    title: string;
    notes: string | null;
    status: string;
  } | null;
  items: Array<{
    id: string;
    listing_id: string | null;
    source_type:
      | "nazunga_store"
      | "external_when_unavailable";
    item_name: string;
    description: string | null;
    specification: string | null;
    quantity: number;
    unit: string;
    currency: string;
    unit_price_snapshot: number | null;
    estimated_total: number | null;
    is_required: boolean;
    customer_approved: boolean;
    status: string;
    store_name: string | null;
  }>;
  public_token?: string;
};

async function apiFetch(
  user: User,
  endpoint: string,
  options: RequestInit = {}
) {
  const token = await user.getIdToken();

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });
}

async function responseData(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Não foi possível concluir a operação."
    );
  }

  return data;
}

function money(
  value: number | null,
  currency = "AOA"
) {
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function localId() {
  return `${Date.now()}-${Math.random()}`;
}

export default function ServiceMaterialsManager({
  user,
  request,
  onClose,
}: {
  user: User;
  request: RequestSummary;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(
    "Materiais necessários"
  );
  const [notes, setNotes] = useState("");
  const [items, setItems] =
    useState<MaterialItem[]>([]);
  const [search, setSearch] = useState("");
  const [products, setProducts] =
    useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [publicUrl, setPublicUrl] =
    useState("");

  useEffect(() => {
    void loadMaterials();
  }, [request.id]);

  async function loadMaterials() {
    try {
      setLoading(true);
      setMessage("");

      const response = await apiFetch(
        user,
        `/api/marketplace/services/requests/${request.id}/materials`
      );

      const data: MaterialData =
        await responseData(response);

      if (data.material_list) {
        setTitle(data.material_list.title);
        setNotes(
          data.material_list.notes || ""
        );
      }

      setItems(
        (data.items || []).map((item) => ({
          local_id: item.id,
          id: item.id,
          listing_id: item.listing_id,
          source_type: item.source_type,
          item_name: item.item_name,
          description: item.description || "",
          specification:
            item.specification || "",
          quantity: String(item.quantity),
          unit: item.unit,
          currency: item.currency,
          unit_price_snapshot:
            item.unit_price_snapshot,
          estimated_total:
            item.estimated_total,
          is_required: item.is_required,
          customer_approved:
            item.customer_approved,
          status: item.status,
          store_name: item.store_name,
        }))
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao carregar materiais."
      );
    } finally {
      setLoading(false);
    }
  }

  async function searchProducts(
    event: FormEvent
  ) {
    event.preventDefault();

    try {
      setSearching(true);
      setMessage("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await apiFetch(
        user,
        `/api/marketplace/services/materials/products?${params.toString()}`
      );

      const data = await responseData(response);
      setProducts(data.products || []);

      if (!data.products?.length) {
        setIsError(false);
        setMessage(
          "Nenhum produto disponível foi encontrado."
        );
      }
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao procurar produtos."
      );
    } finally {
      setSearching(false);
    }
  }

  function addProduct(product: Product) {
    if (
      items.some(
        (item) =>
          item.listing_id === product.listing_id
      )
    ) {
      setIsError(true);
      setMessage(
        "Este produto já está na lista."
      );
      return;
    }

    setItems((current) => [
      ...current,
      {
        local_id: localId(),
        listing_id: product.listing_id,
        source_type: "nazunga_store",
        item_name: product.public_name,
        description:
          product.short_description || "",
        specification: "",
        quantity: "1",
        unit: "unidade",
        currency: product.currency,
        unit_price_snapshot:
          Number(product.public_price),
        estimated_total:
          Number(product.public_price),
        is_required: true,
        store_name: product.store_name,
      },
    ]);

    setIsError(false);
    setMessage(
      `${product.public_name} adicionado.`
    );
  }

  function addExternalMaterial() {
    setItems((current) => [
      ...current,
      {
        local_id: localId(),
        listing_id: null,
        source_type:
          "external_when_unavailable",
        item_name: "",
        description: "",
        specification: "",
        quantity: "1",
        unit: "unidade",
        currency: "AOA",
        unit_price_snapshot: null,
        estimated_total: null,
        is_required: true,
        store_name: null,
      },
    ]);
  }

  function updateItem(
    localIdValue: string,
    changes: Partial<MaterialItem>
  ) {
    setItems((current) =>
      current.map((item) => {
        if (item.local_id !== localIdValue) {
          return item;
        }

        const updated = {
          ...item,
          ...changes,
        };

        if (
          updated.unit_price_snapshot !== null
        ) {
          updated.estimated_total =
            Number(
              updated.unit_price_snapshot
            ) * Number(updated.quantity || 0);
        }

        return updated;
      })
    );
  }

  function removeItem(localIdValue: string) {
    setItems((current) =>
      current.filter(
        (item) =>
          item.local_id !== localIdValue
      )
    );
  }

  async function saveMaterials() {
    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch(
        user,
        `/api/marketplace/services/requests/${request.id}/materials`,
        {
          method: "PUT",
          body: JSON.stringify({
            title,
            notes: notes || null,
            items: items.map((item) => ({
              listing_id: item.listing_id,
              source_type: item.source_type,
              item_name: item.item_name,
              description:
                item.description || null,
              specification:
                item.specification || null,
              quantity: Number(item.quantity),
              unit: item.unit,
              is_required: item.is_required,
            })),
          }),
        }
      );

      await responseData(response);
      setIsError(false);
      setMessage(
        "Lista de materiais guardada."
      );
      await loadMaterials();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao guardar materiais."
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitMaterials() {
    try {
      setSaving(true);
      setMessage("");

      const saveResponse = await apiFetch(
        user,
        `/api/marketplace/services/requests/${request.id}/materials`,
        {
          method: "PUT",
          body: JSON.stringify({
            title,
            notes: notes || null,
            items: items.map((item) => ({
              listing_id: item.listing_id,
              source_type: item.source_type,
              item_name: item.item_name,
              description:
                item.description || null,
              specification:
                item.specification || null,
              quantity: Number(item.quantity),
              unit: item.unit,
              is_required: item.is_required,
            })),
          }),
        }
      );

      await responseData(saveResponse);

      const response = await apiFetch(
        user,
        `/api/marketplace/services/requests/${request.id}/materials/submit`,
        { method: "POST" }
      );

      const data = await responseData(response);
      setPublicUrl(data.public_url || "");
      setIsError(false);
      setMessage(
        "Lista enviada e link seguro criado."
      );
      await loadMaterials();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao enviar a lista."
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!publicUrl) return;

    await navigator.clipboard.writeText(
      publicUrl
    );

    setIsError(false);
    setMessage(
      "Link copiado. Pode enviá-lo ao cliente."
    );
  }

  const total = items.reduce(
    (sum, item) =>
      sum +
      Number(item.estimated_total || 0),
    0
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        A carregar materiais...
      </div>
    );
  }

  return (
    <section className="rounded-2xl border-2 border-emerald-700 bg-white p-5 shadow-lg md:p-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            {request.request_number}
          </p>
          <h3 className="mt-1 text-2xl font-black">
            Materiais do serviço
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {request.title} ·{" "}
            {request.customer_name}
          </p>
          <p className="text-sm text-slate-500">
            Profissional:{" "}
            {request.provider_name}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="self-start rounded-xl border border-slate-300 px-4 py-2 font-bold"
        >
          Fechar
        </button>
      </div>

      {message && (
        <div
          className={`mt-5 rounded-xl border px-4 py-3 text-sm font-bold ${
            isError
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {message}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-black">
            Título da lista
          </span>
          <input
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-black">
            Observações
          </span>
          <input
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            placeholder="Instruções para o cliente"
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </label>
      </div>

      <form
        onSubmit={searchProducts}
        className="mt-7 rounded-2xl bg-slate-50 p-5"
      >
        <p className="font-black">
          Procurar nas lojas Nazunga
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Os preços e o stock vêm diretamente
          das lojas participantes.
        </p>

        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Ex.: torneira, tinta, madeira..."
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-xl bg-emerald-800 px-5 py-3 font-black text-white disabled:opacity-50"
          >
            {searching
              ? "A procurar..."
              : "Procurar"}
          </button>
        </div>

        {products.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {products.map((product) => (
              <div
                key={product.listing_id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="font-black">
                  {product.public_name}
                </p>
                <p className="text-sm text-slate-600">
                  {product.store_name}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <strong>
                      {money(
                        product.public_price,
                        product.currency
                      )}
                    </strong>
                    <span className="ml-2 text-slate-500">
                      Stock:{" "}
                      {product.available_quantity}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      addProduct(product)
                    }
                    className="rounded-lg bg-lime-300 px-3 py-2 text-xs font-black text-emerald-950"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </form>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={addExternalMaterial}
          className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-black text-amber-900"
        >
          + Material externo indisponível nas lojas
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {items.map((item, index) => (
          <article
            key={item.local_id}
            className="rounded-2xl border border-slate-200 p-5"
          >
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-slate-500">
                  Material {index + 1}
                </p>
                {item.store_name && (
                  <p className="mt-1 text-sm font-bold text-emerald-800">
                    Vendido por {item.store_name}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  removeItem(item.local_id)
                }
                className="text-sm font-bold text-red-700"
              >
                Remover
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <label className="lg:col-span-2">
                <span className="mb-1 block text-xs font-black">
                  Material
                </span>
                <input
                  value={item.item_name}
                  disabled={
                    item.source_type ===
                    "nazunga_store"
                  }
                  onChange={(event) =>
                    updateItem(
                      item.local_id,
                      {
                        item_name:
                          event.target.value,
                      }
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 disabled:bg-slate-100"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-black">
                  Quantidade
                </span>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={item.quantity}
                  onChange={(event) =>
                    updateItem(
                      item.local_id,
                      {
                        quantity:
                          event.target.value,
                      }
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-black">
                  Unidade
                </span>
                <input
                  value={item.unit}
                  onChange={(event) =>
                    updateItem(
                      item.local_id,
                      {
                        unit:
                          event.target.value,
                      }
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                />
              </label>

              <label className="md:col-span-2">
                <span className="mb-1 block text-xs font-black">
                  Especificação
                </span>
                <input
                  value={item.specification}
                  onChange={(event) =>
                    updateItem(
                      item.local_id,
                      {
                        specification:
                          event.target.value,
                      }
                    )
                  }
                  placeholder="Medida, cor, modelo..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                />
              </label>

              <div>
                <span className="mb-1 block text-xs font-black">
                  Preço estimado
                </span>
                <div className="rounded-xl bg-slate-50 px-3 py-2.5 font-black">
                  {item.estimated_total !== null
                    ? money(
                        item.estimated_total,
                        item.currency
                      )
                    : "A confirmar"}
                </div>
              </div>

              <label className="flex items-center gap-2 pt-6 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={item.is_required}
                  onChange={(event) =>
                    updateItem(
                      item.local_id,
                      {
                        is_required:
                          event.target.checked,
                      }
                    )
                  }
                />
                Obrigatório
              </label>
            </div>
          </article>
        ))}

        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Ainda não foram adicionados materiais.
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl bg-emerald-950 p-5 text-white md:flex-row md:items-center">
        <div>
          <p className="text-sm text-white/70">
            Total estimado nas lojas
          </p>
          <p className="text-2xl font-black">
            {money(total)}
          </p>
          <p className="mt-1 text-xs text-white/60">
            Cada loja recebe diretamente o pagamento
            da sua encomenda.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void saveMaterials()
            }
            className="rounded-xl border border-white/30 px-5 py-3 font-black disabled:opacity-50"
          >
            Guardar rascunho
          </button>

          <button
            type="button"
            disabled={saving || items.length === 0}
            onClick={() =>
              void submitMaterials()
            }
            className="rounded-xl bg-lime-300 px-5 py-3 font-black text-emerald-950 disabled:opacity-50"
          >
            Enviar ao cliente
          </button>
        </div>
      </div>

      {publicUrl && (
        <div className="mt-5 rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
          <p className="font-black text-emerald-950">
            Link seguro do cliente
          </p>
          <p className="mt-2 break-all text-sm text-emerald-800">
            {publicUrl}
          </p>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="mt-3 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-black text-white"
          >
            Copiar link
          </button>
        </div>
      )}
    </section>
  );
}
