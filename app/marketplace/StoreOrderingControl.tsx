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

type StoreSortMode =
  | "manual"
  | "recommended"
  | "popular"
  | "newest"
  | "alphabetical"
  | "fair_rotation";

type StorefrontConfig = {
  store_sort_mode: StoreSortMode;
  sponsored_placements_enabled: boolean;
  sponsored_items_per_section: number;
};

type Store = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  sort_order: number;
  is_featured: boolean;
  active_listing_count: number;
  completed_order_count: number;
};

async function apiFetch(
  user: User,
  path: string,
  options: RequestInit = {}
) {
  const token = await user.getIdToken();

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body
        ? {
            "Content-Type":
              "application/json",
          }
        : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });
}

async function responseData(
  response: Response
) {
  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Não foi possível concluir a operação."
    );
  }

  return data;
}

export default function StoreOrderingControl({
  user,
  stores,
  onUpdated,
}: {
  user: User;
  stores: Store[];
  onUpdated: () => void | Promise<void>;
}) {
  const [config, setConfig] =
    useState<StorefrontConfig | null>(null);

  const [editing, setEditing] =
    useState<Store | null>(null);

  const [form, setForm] = useState({
    name: "",
    tagline: "",
    description: "",
  });

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  useEffect(() => {
    void loadConfig();
  }, [user]);

  async function loadConfig() {
    try {
      const response = await apiFetch(
        user,
        "/api/marketplace/storefront/config"
      );

      const data = await responseData(
        response
      );

      setConfig(data.config);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a configuração."
      );
    }
  }

  async function patchStore(
    storeId: string,
    payload: Record<string, unknown>
  ) {
    const response = await apiFetch(
      user,
      `/api/marketplace/stores/${storeId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );

    return responseData(response);
  }

  function beginEdit(store: Store) {
    setEditing(store);

    setForm({
      name: store.name,
      tagline: store.tagline || "",
      description:
        store.description || "",
    });

    setMessage("");
    setIsError(false);
  }

  async function saveEdit(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!editing) return;

    try {
      setSaving(true);
      setMessage("");
      setIsError(false);

      await patchStore(
        editing.id,
        {
          name: form.name.trim(),
          tagline:
            form.tagline.trim() || null,
          description:
            form.description.trim() ||
            null,
        }
      );

      setEditing(null);
      await onUpdated();

      setMessage(
        "Dados públicos da loja atualizados."
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível editar a loja."
      );
    } finally {
      setSaving(false);
    }
  }

  async function moveStore(
    index: number,
    direction: -1 | 1
  ) {
    const store = stores[index];
    const other =
      stores[index + direction];

    if (!store || !other) return;

    try {
      setSaving(true);
      setMessage("");
      setIsError(false);

      await patchStore(
        store.id,
        {
          sort_order: other.sort_order,
        }
      );

      await patchStore(
        other.id,
        {
          sort_order: store.sort_order,
        }
      );

      await onUpdated();

      setMessage(
        "Ordem manual das lojas atualizada."
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível mudar a ordem."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleFeatured(
    store: Store
  ) {
    try {
      setSaving(true);
      setMessage("");
      setIsError(false);

      await patchStore(
        store.id,
        {
          is_featured:
            !store.is_featured,
        }
      );

      await onUpdated();

      setMessage(
        store.is_featured
          ? "Destaque removido."
          : "Loja colocada em destaque."
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o destaque."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveConfig(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!config) return;

    try {
      setSaving(true);
      setMessage("");
      setIsError(false);

      const response = await apiFetch(
        user,
        "/api/marketplace/storefront/config",
        {
          method: "PATCH",
          body: JSON.stringify({
            store_sort_mode:
              config.store_sort_mode,
            sponsored_placements_enabled:
              config
                .sponsored_placements_enabled,
            sponsored_items_per_section:
              Number(
                config
                  .sponsored_items_per_section
              ),
          }),
        }
      );

      const data = await responseData(
        response
      );

      setConfig(data.config);
      await onUpdated();

      setMessage(
        "Configuração da montra guardada."
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar a configuração."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-slate-950 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
          Montra pública
        </p>

        <h3 className="mt-2 text-xl font-black">
          Ordem, edição e publicidade
        </h3>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Controle a ordem das lojas e a faixa
          de produtos e serviços patrocinados
          apresentada antes do rodapé público.
        </p>
      </div>

      {message && (
        <div
          className={`mt-5 rounded-xl border px-4 py-3 text-sm font-bold ${
            isError
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-300 bg-white text-emerald-800"
          }`}
        >
          {message}
        </div>
      )}

      {config && (
        <form
          onSubmit={saveConfig}
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <h4 className="font-black">
            Configuração da montra
          </h4>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <label>
              <span className="mb-2 block text-sm font-bold">
                Ordem pública das lojas
              </span>

              <select
                value={
                  config.store_sort_mode
                }
                onChange={(event) =>
                  setConfig({
                    ...config,
                    store_sort_mode:
                      event.target
                        .value as StoreSortMode,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="manual">
                  Manual
                </option>
                <option value="recommended">
                  Recomendadas
                </option>
                <option value="popular">
                  Mais populares
                </option>
                <option value="newest">
                  Mais recentes
                </option>
                <option value="alphabetical">
                  Ordem alfabética
                </option>
                <option value="fair_rotation">
                  Rotação justa diária
                </option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold">
                Cartões patrocinados
              </span>

              <input
                type="number"
                min="1"
                max="12"
                value={
                  config
                    .sponsored_items_per_section
                }
                onChange={(event) =>
                  setConfig({
                    ...config,
                    sponsored_items_per_section:
                      Number(
                        event.target.value
                      ),
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 px-4 py-3">
              <input
                type="checkbox"
                checked={
                  config
                    .sponsored_placements_enabled
                }
                onChange={(event) =>
                  setConfig({
                    ...config,
                    sponsored_placements_enabled:
                      event.target.checked,
                  })
                }
              />

              <span className="text-sm font-bold">
                Mostrar patrocinados
              </span>
            </label>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            “Mais populares” utiliza encomendas
            concluídas. “Recomendadas” combina
            destaque editorial, atividade e
            produtos disponíveis.
          </p>

          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-xl bg-amber-600 px-5 py-3 font-black text-white disabled:opacity-50"
          >
            Guardar configuração
          </button>
        </form>
      )}

      {editing && (
        <form
          onSubmit={saveEdit}
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <h4 className="font-black">
            Editar loja
          </h4>

          <div className="mt-4 grid gap-4">
            <label>
              <span className="mb-2 block text-sm font-bold">
                Nome público
              </span>

              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold">
                Frase da loja
              </span>

              <input
                value={form.tagline}
                onChange={(event) =>
                  setForm({
                    ...form,
                    tagline:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold">
                Descrição pública
              </span>

              <textarea
                rows={5}
                value={form.description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    description:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-amber-600 px-5 py-3 font-black text-white disabled:opacity-50"
            >
              Guardar alterações
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() =>
                setEditing(null)
              }
              className="rounded-xl border border-slate-300 px-5 py-3 font-black"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {stores.map((store, index) => (
          <div
            key={store.id}
            className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <strong>
                  {index + 1}. {store.name}
                </strong>

                {store.is_featured && (
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-900">
                    Destaque
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {store.active_listing_count} produtos
                ativos ·{" "}
                {store.completed_order_count} encomendas
                concluídas
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {config?.store_sort_mode ===
                "manual" && (
                <>
                  <button
                    type="button"
                    disabled={
                      saving || index === 0
                    }
                    onClick={() =>
                      void moveStore(
                        index,
                        -1
                      )
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold disabled:opacity-30"
                  >
                    ↑ Subir
                  </button>

                  <button
                    type="button"
                    disabled={
                      saving ||
                      index ===
                        stores.length - 1
                    }
                    onClick={() =>
                      void moveStore(
                        index,
                        1
                      )
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold disabled:opacity-30"
                  >
                    ↓ Descer
                  </button>
                </>
              )}

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void toggleFeatured(store)
                }
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900"
              >
                {store.is_featured
                  ? "Remover destaque"
                  : "Destacar"}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  beginEdit(store)
                }
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-black text-white"
              >
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
