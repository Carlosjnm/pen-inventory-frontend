"use client";

import {
  FormEvent,
  useState,
} from "react";
import { User } from "firebase/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Provider = {
  id: string;
  public_name: string;
  headline: string | null;
  description: string | null;
  sort_order: number;
  is_featured: boolean;
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

export default function ProviderOrderingControl({
  user,
  providers,
  manualMode,
  onUpdated,
}: {
  user: User;
  providers: Provider[];
  manualMode: boolean;
  onUpdated: () => void | Promise<void>;
}) {
  const [editing, setEditing] =
    useState<Provider | null>(null);

  const [form, setForm] = useState({
    public_name: "",
    headline: "",
    description: "",
  });

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  function beginEdit(provider: Provider) {
    setEditing(provider);

    setForm({
      public_name: provider.public_name,
      headline: provider.headline || "",
      description:
        provider.description || "",
    });

    setMessage("");
    setIsError(false);
  }

  async function patchProvider(
    providerId: string,
    payload: Record<string, unknown>
  ) {
    const response = await apiFetch(
      user,
      `/api/marketplace/services/providers/${providerId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );

    return responseData(response);
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

      await patchProvider(
        editing.id,
        {
          public_name:
            form.public_name.trim(),
          headline:
            form.headline.trim() || null,
          description:
            form.description.trim() ||
            null,
        }
      );

      setEditing(null);
      await onUpdated();

      setMessage(
        "Dados do profissional atualizados."
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível editar."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleFeatured(
    provider: Provider
  ) {
    try {
      setSaving(true);
      setMessage("");
      setIsError(false);

      await patchProvider(
        provider.id,
        {
          is_featured:
            !provider.is_featured,
        }
      );

      await onUpdated();

      setMessage(
        provider.is_featured
          ? "Destaque removido."
          : "Profissional colocado em destaque."
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

  async function moveProvider(
    index: number,
    direction: -1 | 1
  ) {
    const provider = providers[index];
    const other =
      providers[index + direction];

    if (!provider || !other) return;

    try {
      setSaving(true);
      setMessage("");
      setIsError(false);

      await patchProvider(
        provider.id,
        {
          sort_order: other.sort_order,
        }
      );

      await patchProvider(
        other.id,
        {
          sort_order:
            provider.sort_order,
        }
      );

      await onUpdated();

      setMessage(
        "Ordem manual atualizada."
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

  return (
    <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          Apresentação pública
        </p>

        <h3 className="mt-2 text-xl font-black">
          Ordem e dados dos profissionais
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Edite os dados públicos e, no modo
          manual, utilize os botões para definir
          a posição de cada profissional.
        </p>
      </div>

      {message && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${
            isError
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-300 bg-white text-emerald-800"
          }`}
        >
          {message}
        </div>
      )}

      {editing && (
        <form
          onSubmit={saveEdit}
          className="mt-5 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <h4 className="font-black">
            Editar profissional
          </h4>

          <div className="mt-4 grid gap-4">
            <label>
              <span className="mb-2 block text-sm font-bold">
                Nome público
              </span>

              <input
                required
                value={form.public_name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    public_name:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold">
                Título profissional
              </span>

              <input
                value={form.headline}
                onChange={(event) =>
                  setForm({
                    ...form,
                    headline:
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

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-800 px-5 py-3 font-black text-white disabled:opacity-50"
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

      <div className="mt-5 space-y-3">
        {providers.map(
          (provider, index) => (
            <div
              key={provider.id}
              className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong>
                    {index + 1}.{" "}
                    {provider.public_name}
                  </strong>

                  {provider.is_featured && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-900">
                      Destaque
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {provider.headline ||
                    "Sem título profissional"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {manualMode && (
                  <>
                    <button
                      type="button"
                      disabled={
                        saving || index === 0
                      }
                      onClick={() =>
                        void moveProvider(
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
                          providers.length - 1
                      }
                      onClick={() =>
                        void moveProvider(
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
                    void toggleFeatured(
                      provider
                    )
                  }
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900"
                >
                  {provider.is_featured
                    ? "Remover destaque"
                    : "Destacar"}
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    beginEdit(provider)
                  }
                  className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-black text-white"
                >
                  Editar
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}
