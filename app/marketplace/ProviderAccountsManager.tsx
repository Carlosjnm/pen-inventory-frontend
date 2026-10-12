"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import LoginEmailEditor from "./LoginEmailEditor";
import { User } from "firebase/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Provider = {
  id: string;
  public_name: string;
  slug: string;
};

type MemberRole =
  | "owner"
  | "manager"
  | "staff";

type ProviderMember = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  member_role: MemberRole;
  can_manage_requests: boolean;
  can_manage_quotes: boolean;
  can_manage_profile: boolean;
  can_manage_payments: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const emptyForm = {
  email: "",
  member_role: "staff" as MemberRole,
  can_manage_requests: true,
  can_manage_quotes: false,
  can_manage_profile: false,
  can_manage_payments: false,
  is_active: true,
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

export default function ProviderAccountsManager({
  user,
  provider,
  onClose,
  isSuperAdmin = false,
}: {
  user: User;
  provider: Provider;
  onClose: () => void;
  isSuperAdmin?: boolean;
}) {
  const [emailMember, setEmailMember] = useState<ProviderMember | null>(null);
  const [members, setMembers] =
    useState<ProviderMember[]>([]);

  const [form, setForm] =
    useState(emptyForm);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  async function loadMembers() {
    try {
      setLoading(true);
      setMessage("");

      const response = await apiFetch(
        user,
        `/api/marketplace/services/providers/${provider.id}/members`
      );

      const data =
        await responseData(response);

      setMembers(data.members || []);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao carregar as contas."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMembers();
  }, [provider.id]);

  function editMember(
    member: ProviderMember
  ) {
    setForm({
      email: member.email,
      member_role: member.member_role,
      can_manage_requests:
        member.can_manage_requests,
      can_manage_quotes:
        member.can_manage_quotes,
      can_manage_profile:
        member.can_manage_profile,
      can_manage_payments:
        member.can_manage_payments,
      is_active: member.is_active,
    });

    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveMember(
    event: FormEvent
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch(
        user,
        `/api/marketplace/services/providers/${provider.id}/members`,
        {
          method: "POST",
          body: JSON.stringify({
            email: form.email.trim(),
            member_role:
              form.member_role,
            can_manage_requests:
              form.can_manage_requests,
            can_manage_quotes:
              form.can_manage_quotes,
            can_manage_profile:
              form.can_manage_profile,
            can_manage_payments:
              form.can_manage_payments,
            is_active: form.is_active,
          }),
        }
      );

      await responseData(response);

      setForm(emptyForm);
      setIsError(false);
      setMessage(
        "Acesso do profissional guardado."
      );

      await loadMembers();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao guardar o acesso."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm md:p-6">
      {isSuperAdmin && emailMember && <LoginEmailEditor
        key={emailMember.id} user={user} providerId={provider.id} memberId={emailMember.id} currentEmail={emailMember.email}
        onClose={() => setEmailMember(null)}
        onSaved={(email) => setMembers(current => current.map(member => member.user_id === emailMember.user_id ? { ...member, email } : member))}
      />}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
            Portal do profissional
          </p>

          <h3 className="mt-2 text-xl font-black">
            Contas de {provider.public_name}
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Associe uma conta PEN/Nazunga ao
            profissional e escolha exatamente o
            que essa pessoa poderá gerir.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold"
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

      <form
        onSubmit={saveMember}
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-black">
              Email da conta
            </span>

            <input
              type="email"
              required
              value={form.email}
              onChange={(event) =>
                setForm({
                  ...form,
                  email: event.target.value,
                })
              }
              placeholder="profissional@email.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black">
              Função
            </span>

            <select
              value={form.member_role}
              onChange={(event) =>
                setForm({
                  ...form,
                  member_role:
                    event.target
                      .value as MemberRole,
                })
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"
            >
              <option value="owner">
                Proprietário
              </option>
              <option value="manager">
                Gestor
              </option>
              <option value="staff">
                Funcionário
              </option>
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Permission
            label="Gerir pedidos"
            checked={
              form.can_manage_requests
            }
            onChange={(checked) =>
              setForm({
                ...form,
                can_manage_requests:
                  checked,
              })
            }
          />

          <Permission
            label="Criar orçamentos"
            checked={
              form.can_manage_quotes
            }
            onChange={(checked) =>
              setForm({
                ...form,
                can_manage_quotes:
                  checked,
              })
            }
          />

          <Permission
            label="Gerir perfil"
            checked={
              form.can_manage_profile
            }
            onChange={(checked) =>
              setForm({
                ...form,
                can_manage_profile:
                  checked,
              })
            }
          />

          <Permission
            label="Ver pagamentos"
            checked={
              form.can_manage_payments
            }
            onChange={(checked) =>
              setForm({
                ...form,
                can_manage_payments:
                  checked,
              })
            }
          />

          <Permission
            label="Acesso ativo"
            checked={form.is_active}
            onChange={(checked) =>
              setForm({
                ...form,
                is_active: checked,
              })
            }
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-800 px-5 py-3 font-black text-white disabled:opacity-50"
          >
            {saving
              ? "A guardar..."
              : "Guardar acesso"}
          </button>

          <button
            type="button"
            onClick={() =>
              setForm(emptyForm)
            }
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold"
          >
            Limpar
          </button>
        </div>
      </form>

      <div className="mt-6">
        <h4 className="font-black">
          Contas associadas ({members.length})
        </h4>

        {loading ? (
          <p className="mt-4 text-sm text-slate-600">
            A carregar contas...
          </p>
        ) : (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {members.map((member) => (
              <article
                key={member.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h5 className="font-black">
                      {member.full_name ||
                        "Utilizador"}
                    </h5>

                    <p className="mt-1 text-sm text-slate-600">
                      {member.email}
                    </p>

                    <p className="mt-2 text-xs font-black uppercase tracking-wide text-blue-700">
                      {member.member_role ===
                      "owner"
                        ? "Proprietário"
                        : member.member_role ===
                            "manager"
                          ? "Gestor"
                          : "Funcionário"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      member.is_active
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {member.is_active
                      ? "Ativo"
                      : "Suspenso"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                  {member.can_manage_requests && (
                    <Badge text="Pedidos" />
                  )}

                  {member.can_manage_quotes && (
                    <Badge text="Orçamentos" />
                  )}

                  {member.can_manage_profile && (
                    <Badge text="Perfil" />
                  )}

                  {member.can_manage_payments && (
                    <Badge text="Pagamentos" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    editMember(member)
                  }
                  className="mt-5 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-black text-blue-900"
                >
                  Editar acesso
                </button>
                {isSuperAdmin && <button type="button" onClick={() => { setEmailMember(member); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="ml-3 mt-5 rounded-xl border border-amber-300 px-4 py-2 text-sm font-bold">
                  Alterar email de login
                </button>}
              </article>
            ))}

            {members.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600 xl:col-span-2">
                Nenhuma conta associada.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Permission({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold ${
        checked
          ? "border-blue-300 bg-blue-50 text-blue-900"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="h-5 w-5"
      />

      {label}
    </label>
  );
}

function Badge({
  text,
}: {
  text: string;
}) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
      {text}
    </span>
  );
}
