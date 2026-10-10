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

type Store = {
  id: string;
  name: string;
  slug: string;
  product_import_enabled: boolean;
};

type StoreMember = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  member_role: string;
  can_import_products: boolean;
  is_active: boolean;
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

export default function StoreImportControl({
  user,
  stores,
  onUpdated,
}: {
  user: User;
  stores: Store[];
  onUpdated: () => Promise<void>;
}) {
  const [selectedStoreId, setSelectedStoreId] =
    useState(stores[0]?.id || "");
  const [members, setMembers] =
    useState<StoreMember[]>([]);
  const [email, setEmail] = useState("");
  const [memberRole, setMemberRole] =
    useState("catalog");
  const [canImport, setCanImport] =
    useState(true);
  const [loading, setLoading] =
    useState(false);
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [isError, setIsError] =
    useState(false);

  const selectedStore =
    stores.find(
      (store) => store.id === selectedStoreId
    ) || null;

  useEffect(() => {
    if (
      !selectedStoreId &&
      stores.length > 0
    ) {
      setSelectedStoreId(stores[0].id);
    }
  }, [selectedStoreId, stores]);

  useEffect(() => {
    if (selectedStoreId) {
      void loadMembers(selectedStoreId);
    } else {
      setMembers([]);
    }
  }, [selectedStoreId]);

  function success(value: string) {
    setIsError(false);
    setMessage(value);
  }

  function failure(error: unknown) {
    setIsError(true);
    setMessage(
      error instanceof Error
        ? error.message
        : "Não foi possível concluir a operação."
    );
  }

  async function loadMembers(storeId: string) {
    try {
      setLoading(true);
      setMessage("");

      const response = await apiFetch(
        user,
        `/api/marketplace/stores/${storeId}/members`
      );

      const data = await responseData(response);
      setMembers(data.members || []);
    } catch (error) {
      failure(error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStoreImport() {
    if (!selectedStore) return;

    try {
      setSaving(true);
      setMessage("");

      const enabled =
        !selectedStore.product_import_enabled;

      const response = await apiFetch(
        user,
        `/api/marketplace/stores/${selectedStore.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            product_import_enabled: enabled,
          }),
        }
      );

      await responseData(response);
      await onUpdated();

      success(
        enabled
          ? "Importação ativada para esta loja."
          : "Importação desativada para esta loja."
      );
    } catch (error) {
      failure(error);
    } finally {
      setSaving(false);
    }
  }

  async function addMember(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!selectedStoreId) return;

    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch(
        user,
        `/api/marketplace/stores/${selectedStoreId}/members`,
        {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
            member_role: memberRole,
            can_import_products: canImport,
          }),
        }
      );

      await responseData(response);

      setEmail("");
      setMemberRole("catalog");
      setCanImport(true);

      await loadMembers(selectedStoreId);

      success(
        "Utilizador associado à loja."
      );
    } catch (error) {
      failure(error);
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(
    member: StoreMember
  ) {
    if (
      !selectedStoreId ||
      !window.confirm(
        `Remover ${member.full_name || member.email} desta loja?`
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch(
        user,
        `/api/marketplace/stores/${selectedStoreId}/members/${member.id}`,
        { method: "DELETE" }
      );

      await responseData(response);
      await loadMembers(selectedStoreId);

      success(
        "Utilizador removido da loja."
      );
    } catch (error) {
      failure(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-6 text-slate-950 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
            Controlo do super-administrador
          </p>

          <h3 className="mt-2 text-xl font-black">
            Importação de produtos por loja
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            A importação só funciona quando estiver
            ativada para a loja e o utilizador tiver
            autorização individual.
          </p>
        </div>

        {selectedStore && (
          <span
            className={`rounded-full px-4 py-2 text-sm font-black ${
              selectedStore.product_import_enabled
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {selectedStore.product_import_enabled
              ? "Importação ativa"
              : "Importação bloqueada"}
          </span>
        )}
      </div>

      {message && (
        <div
          className={`mt-5 rounded-xl border px-4 py-3 text-sm font-bold ${
            isError
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-emerald-300 bg-emerald-50 text-emerald-800"
          }`}
        >
          {message}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
        <label>
          <span className="mb-2 block text-sm font-black">
            Loja
          </span>

          <select
            value={selectedStoreId}
            onChange={(event) =>
              setSelectedStoreId(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"
          >
            {stores.map((store) => (
              <option
                key={store.id}
                value={store.id}
              >
                {store.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={!selectedStore || saving}
          onClick={() =>
            void toggleStoreImport()
          }
          className={`self-end rounded-xl px-5 py-3 font-black text-white disabled:opacity-50 ${
            selectedStore
              ?.product_import_enabled
              ? "bg-red-700"
              : "bg-emerald-700"
          }`}
        >
          {selectedStore
            ?.product_import_enabled
            ? "Desativar importação"
            : "Ativar importação"}
        </button>
      </div>

      <form
        onSubmit={addMember}
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <h4 className="font-black">
          Associar responsável
        </h4>

        <p className="mt-1 text-sm text-slate-600">
          O utilizador já deve existir no PEN.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr_auto_auto] lg:items-end">
          <label>
            <span className="mb-2 block text-sm font-bold">
              Email do utilizador
            </span>

            <input
              type="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="utilizador@empresa.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Função na loja
            </span>

            <select
              value={memberRole}
              onChange={(event) =>
                setMemberRole(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"
            >
              <option value="owner">
                Proprietário
              </option>
              <option value="manager">
                Gestor
              </option>
              <option value="catalog">
                Catálogo
              </option>
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={canImport}
              onChange={(event) =>
                setCanImport(
                  event.target.checked
                )
              }
              className="h-5 w-5"
            />
            Pode importar
          </label>

          <button
            type="submit"
            disabled={
              saving ||
              !selectedStoreId ||
              !email.trim()
            }
            className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-50"
          >
            Associar
          </button>
        </div>
      </form>

      <div className="mt-6">
        <h4 className="font-black">
          Utilizadores autorizados
        </h4>

        {loading ? (
          <p className="mt-3 text-sm text-slate-600">
            A carregar responsáveis...
          </p>
        ) : members.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
            Esta loja ainda não tem utilizadores
            associados.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    Utilizador
                  </th>
                  <th className="px-4 py-3">
                    Função
                  </th>
                  <th className="px-4 py-3">
                    Importação
                  </th>
                  <th className="px-4 py-3 text-right">
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold">
                        {member.full_name ||
                          "Utilizador PEN"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {member.email}
                      </p>
                    </td>

                    <td className="px-4 py-3 capitalize">
                      {member.member_role}
                    </td>

                    <td className="px-4 py-3">
                      {member.can_import_products
                        ? "Permitida"
                        : "Bloqueada"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          void removeMember(
                            member
                          )
                        }
                        className="font-bold text-red-700 disabled:opacity-50"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
