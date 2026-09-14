"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import MobileNav from "@/components/MobileNav";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Role = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  is_active: boolean;
  permission_count: number;
};

type AppUser = {
  id: string;
  firebase_uid: string | null;
  email: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  roles: {
    id: string;
    code: string;
    name: string;
  }[];
};

type CurrentUser = {
  id: string;
  firebase_uid: string;
  email: string;
  full_name: string;
  phone: string | null;
  organization: {
    id: string;
    code: string;
    name: string;
  };
  roles: {
    code: string;
    name: string;
  }[];
  permissions: string[];
};

type UserForm = {
  email: string;
  full_name: string;
  phone: string;
  role_ids: string[];
};

const emptyForm: UserForm = {
  email: "",
  full_name: "",
  phone: "",
  role_ids: [],
};

export default function UsersPage() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState("");

  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
  const [editActive, setEditActive] = useState(true);
  const [editMessage, setEditMessage] = useState("");

  const [setupLink, setSetupLink] = useState("");
  const [createdUserName, setCreatedUserName] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      setFirebaseUser(user);
      await loadData(user);
    });

    return () => unsubscribe();
  }, []);

  async function authenticatedFetch(
    user: User,
    path: string,
    options: RequestInit = {}
  ) {
    const token = await user.getIdToken();

    return fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
      cache: "no-store",
    });
  }

  async function loadData(user: User) {
    try {
      setLoading(true);
      setMessage("");

      const [usersResponse, rolesResponse, meResponse] = await Promise.all([
        authenticatedFetch(user, "/api/users"),
        authenticatedFetch(user, "/api/roles"),
        authenticatedFetch(user, "/api/me"),
      ]);

      if (!usersResponse.ok) {
        const data = await usersResponse.json().catch(() => null);
        throw new Error(
          data?.detail || "Não foi possível carregar os utilizadores."
        );
      }

      if (!rolesResponse.ok) {
        const data = await rolesResponse.json().catch(() => null);
        throw new Error(
          data?.detail || "Não foi possível carregar as funções."
        );
      }

      if (!meResponse.ok) {
        throw new Error("Não foi possível identificar o utilizador atual.");
      }

      const usersData = await usersResponse.json();
      const rolesData = await rolesResponse.json();
      const meData = await meResponse.json();

      setUsers(usersData.users || []);
      setRoles(rolesData.roles || []);
      setCurrentUser(meData);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os utilizadores."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.phone || "").toLowerCase().includes(query) ||
        user.roles.some(
          (role) =>
            role.name.toLowerCase().includes(query) ||
            role.code.toLowerCase().includes(query)
        );

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active" && user.is_active) ||
        (statusFilter === "inactive" && !user.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [users, search, statusFilter]);

  const activeUsers = users.filter((user) => user.is_active).length;
  const inactiveUsers = users.length - activeUsers;

  const usersWithMultipleRoles = users.filter(
    (user) => user.roles.length > 1
  ).length;

  function toggleCreateRole(roleId: string) {
    setForm((current) => ({
      ...current,
      role_ids: current.role_ids.includes(roleId)
        ? current.role_ids.filter((id) => id !== roleId)
        : [...current.role_ids, roleId],
    }));
  }

  function toggleEditRole(roleId: string) {
    setEditRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId]
    );
  }

  async function handleCreateUser(event: FormEvent) {
    event.preventDefault();

    if (!firebaseUser) return;

    if (!form.full_name.trim()) {
      setFormMessage("O nome é obrigatório.");
      return;
    }

    if (!form.email.trim()) {
      setFormMessage("O email é obrigatório.");
      return;
    }

    if (form.role_ids.length === 0) {
      setFormMessage("Selecione pelo menos uma função.");
      return;
    }

    try {
      setSaving(true);
      setFormMessage("");

      const response = await authenticatedFetch(
        firebaseUser,
        "/api/users",
        {
          method: "POST",
          body: JSON.stringify({
            email: form.email.trim(),
            full_name: form.full_name.trim(),
            phone: form.phone.trim() || null,
            role_ids: form.role_ids,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível criar o utilizador."
        );
      }

      setCreatedUserName(form.full_name.trim());
      setSetupLink(data.setup_link || "");
      setCopyMessage("");

      setForm(emptyForm);
      setShowCreate(false);

      await loadData(firebaseUser);
    } catch (error) {
      console.error(error);
      setFormMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o utilizador."
      );
    } finally {
      setSaving(false);
    }
  }

  function openEdit(user: AppUser) {
    setEditingUser(user);
    setEditName(user.full_name);
    setEditEmail(user.email);
    setEditPhone(user.phone || "");
    setEditRoleIds(user.roles.map((role) => role.id));
    setEditActive(user.is_active);
    setEditMessage("");
  }

  function closeEdit() {
    setEditingUser(null);
    setEditMessage("");
  }

  async function handleUpdateUser(event: FormEvent) {
    event.preventDefault();

    if (!firebaseUser || !editingUser) return;

    if (!editName.trim()) {
      setEditMessage("O nome é obrigatório.");
      return;
    }

    if (!editEmail.trim() || !editEmail.includes("@")) {
      setEditMessage("Introduza um email válido.");
      return;
    }

    if (editRoleIds.length === 0) {
      setEditMessage("Selecione pelo menos uma função.");
      return;
    }

    try {
      setSaving(true);
      setEditMessage("");

      const response = await authenticatedFetch(
        firebaseUser,
        `/api/users/${editingUser.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            email: editEmail.trim(),
            full_name: editName.trim(),
            phone: editPhone.trim() || null,
            is_active: editActive,
            role_ids: editRoleIds,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível atualizar o utilizador."
        );
      }

      closeEdit();
      await loadData(firebaseUser);
    } catch (error) {
      console.error(error);
      setEditMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o utilizador."
      );
    } finally {
      setSaving(false);
    }
  }

  async function copySetupLink() {
    if (!setupLink) return;

    try {
      await navigator.clipboard.writeText(setupLink);
      setCopyMessage("Link copiado.");
    } catch {
      setCopyMessage("Não foi possível copiar automaticamente.");
    }
  }

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
  }

  function formatDate(value: string | null) {
    if (!value) return "—";

    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  }

  function initials(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }

  const editingSelf =
    editingUser && currentUser
      ? editingUser.id === currentUser.id
      : false;

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
          <NavItem label="Produtos" icon="▦" href="/products" />
          <NavItem label="Inventário" icon="▣" href="/inventory" />
          <NavItem label="Compras" icon="↓" href="/purchases" />
          <NavItem label="Vendas" icon="↑" href="/sales" />
          <NavItem label="Fornecedores" icon="♢" href="/suppliers" />
          <NavItem label="Clientes" icon="♙" href="/customers" />
          <NavItem label="Relatórios" icon="▤" href="/reports" />
          <NavItem
            label="Utilizadores"
            icon="♧"
            active
            href="/users"
          />
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
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-4 md:px-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                Utilizadores
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Gerir utilizadores, funções e acesso ao sistema
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowCreate(true);
                  setFormMessage("");
                }}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                + Novo Utilizador
              </button>

              <MobileNav onLogout={handleLogout} />
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          {message && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message}
            </div>
          )}

          {setupLink && (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="font-semibold text-emerald-950">
                    Utilizador criado com sucesso
                  </h2>
                  <p className="mt-1 text-sm text-emerald-800">
                    Envie este link a {createdUserName || "este utilizador"} para
                    definir a palavra-passe da conta.
                  </p>

                  <div className="mt-3 max-w-3xl break-all rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-700">
                    {setupLink}
                  </div>

                  {copyMessage && (
                    <p className="mt-2 text-xs font-medium text-emerald-800">
                      {copyMessage}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={copySetupLink}
                    className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
                  >
                    Copiar Link
                  </button>

                  <button
                    onClick={() => {
                      setSetupLink("");
                      setCreatedUserName("");
                      setCopyMessage("");
                    }}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total de Utilizadores"
              value={users.length}
              hint="Contas registadas"
            />

            <StatCard
              label="Utilizadores Ativos"
              value={activeUsers}
              hint="Com acesso ao sistema"
            />

            <StatCard
              label="Inativos"
              value={inactiveUsers}
              hint="Acesso bloqueado"
            />

            <StatCard
              label="Múltiplas Funções"
              value={usersWithMultipleRoles}
              hint="Com mais de uma função"
            />
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4 md:p-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-950">
                    Equipa e Permissões
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Consulte e altere as funções atribuídas a cada utilizador.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Pesquisar nome, email ou função..."
                    className="min-w-64 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />

                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value)
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                  >
                    <option value="">Todos os estados</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </select>

                  {(search || statusFilter) && (
                    <button
                      onClick={clearFilters}
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-sm text-slate-500">
                A carregar utilizadores...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-sm font-medium text-slate-700">
                  Nenhum utilizador encontrado.
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Altere os filtros ou adicione um novo utilizador.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">
                        Utilizador
                      </th>
                      <th className="px-5 py-3 font-semibold">
                        Funções
                      </th>
                      <th className="px-5 py-3 font-semibold">
                        Estado
                      </th>
                      <th className="px-5 py-3 font-semibold">
                        Último Acesso
                      </th>
                      <th className="px-5 py-3 text-right font-semibold">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                              {initials(user.full_name) || "U"}
                            </div>

                            <div>
                              <div className="font-semibold text-slate-950">
                                {user.full_name}
                                {currentUser?.id === user.id && (
                                  <span className="ml-2 text-xs font-medium text-slate-400">
                                    Você
                                  </span>
                                )}
                              </div>

                              <div className="mt-0.5 text-xs text-slate-500">
                                {user.email}
                              </div>

                              {user.phone && (
                                <div className="mt-0.5 text-xs text-slate-400">
                                  {user.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex max-w-sm flex-wrap gap-1.5">
                            {user.roles.length > 0 ? (
                              user.roles.map((role) => (
                                <span
                                  key={role.id}
                                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                                >
                                  {role.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-amber-600">
                                Sem função
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge active={user.is_active} />
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {user.last_login_at
                            ? formatDate(user.last_login_at)
                            : "Nunca"}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => openEdit(user)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            Gerir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && (
              <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
                A mostrar {filteredUsers.length} de {users.length} utilizadores
              </div>
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="font-semibold text-slate-950">
                Funções Disponíveis
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                As permissões são atribuídas através destas funções.
              </p>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {role.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {role.code}
                      </div>
                    </div>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {role.permission_count} permissões
                    </span>
                  </div>

                  {role.description && (
                    <p className="mt-3 text-sm leading-5 text-slate-500">
                      {role.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      {showCreate && (
        <Modal onClose={() => !saving && setShowCreate(false)}>
          <form onSubmit={handleCreateUser}>
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-950">
                Novo Utilizador
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Crie a conta e escolha as funções que este utilizador terá.
              </p>
            </div>

            <div className="space-y-5 px-6 py-5">
              {formMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formMessage}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome Completo">
                  <input
                    value={form.full_name}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        full_name: event.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="Nome do utilizador"
                    autoFocus
                  />
                </Field>

                <Field label="Telefone">
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        phone: event.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="+244..."
                  />
                </Field>
              </div>

              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      email: event.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="utilizador@empresa.com"
                />
              </Field>

              <RoleSelector
                roles={roles}
                selectedRoleIds={form.role_ids}
                onToggle={toggleCreateRole}
              />

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                Depois de criar a conta, o PEN irá gerar um link para o
                utilizador definir a sua palavra-passe.
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "A criar..." : "Criar Utilizador"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editingUser && (
        <Modal onClose={() => !saving && closeEdit()}>
          <form onSubmit={handleUpdateUser}>
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-950">
                Gerir Utilizador
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {editingUser.email}
              </p>
            </div>

            <div className="space-y-5 px-6 py-5">
              {editMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {editMessage}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome Completo">
                  <input
                    value={editName}
                    onChange={(event) =>
                      setEditName(event.target.value)
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Telefone">
                  <input
                    value={editPhone}
                    onChange={(event) =>
                      setEditPhone(event.target.value)
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Email">
                <input
                  type="email"
                  value={editEmail}
                  onChange={(event) =>
                    setEditEmail(event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <RoleSelector
                roles={roles}
                selectedRoleIds={editRoleIds}
                onToggle={toggleEditRole}
              />

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-slate-900">
                      Conta Ativa
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Uma conta inativa não pode entrar no PEN Inventory.
                    </p>

                    {editingSelf && (
                      <p className="mt-2 text-xs font-medium text-amber-600">
                        Não pode desativar a sua própria conta.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={Boolean(editingSelf)}
                    onClick={() =>
                      setEditActive((current) => !current)
                    }
                    className={`relative h-7 w-12 rounded-full transition ${
                      editActive
                        ? "bg-emerald-500"
                        : "bg-slate-300"
                    } ${
                      editingSelf
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                    aria-pressed={editActive}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                        editActive ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "A guardar..." : "Guardar Alterações"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function RoleSelector({
  roles,
  selectedRoleIds,
  onToggle,
}: {
  roles: Role[];
  selectedRoleIds: string[];
  onToggle: (roleId: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-slate-700">
        Funções
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {roles.map((role) => {
          const selected = selectedRoleIds.includes(role.id);

          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onToggle(role.id)}
              className={`rounded-xl border p-3 text-left transition ${
                selected
                  ? "border-slate-900 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">
                    {role.name}
                  </div>
                  <div
                    className={`mt-1 text-xs ${
                      selected
                        ? "text-slate-300"
                        : "text-slate-400"
                    }`}
                  >
                    {role.permission_count} permissões
                  </div>
                </div>

                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                    selected
                      ? "border-white bg-white text-slate-950"
                      : "border-slate-300"
                  }`}
                >
                  {selected ? "✓" : ""}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Ativo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Inativo
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-400">
        {hint}
      </div>
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function NavItem({
  label,
  icon,
  href,
  active = false,
}: {
  label: string;
  icon: string;
  href: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
        active
          ? "bg-white/10 font-semibold text-white"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="flex w-5 justify-center text-base">
        {icon}
      </span>
      <span>{label}</span>
    </a>
  );
}
