"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import MobileNav from "@/components/MobileNav";
import PermissionGate from "@/components/PermissionGate";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Location = {
  id: string;
  location_code: string;
  name: string;
};

type Category = {
  id: string;
  code: string;
  name: string;
};

type SalesOrderOption = {
  id: string;
  sale_number: string;
  location_id: string;
  location_name: string;
  customer_name: string | null;
  status: string;
};

type PurchaseOrderOption = {
  id: string;
  po_number: string;
  destination_location_id: string;
  destination_location_name: string;
  supplier_name: string;
  status: string;
};

type Expense = {
  id: string;
  expense_number: string;
  description: string;
  category_id: string;
  category_name: string;
  amount: number;
  currency: string;
  expense_date: string;
  location_id: string;
  location_name: string;
  paid_to: string;
  payment_method: string;
  notes: string | null;
  linked_delivery_reference: string | null;
  sale_number: string | null;
  po_number: string | null;
  approval_status: "pending" | "approved" | "rejected";
  approval_notes: string | null;
  created_by_name: string | null;
  approved_by_name: string | null;
  attachment_count: number;
};

type ExpenseAttachment = {
  id: string;
  original_filename: string;
  content_type: string;
  file_size: number;
  created_at: string;
};

type ExpenseDetail = Expense & {
  attachments: ExpenseAttachment[];
};

type CurrentUser = {
  permissions: string[];
};

const emptyForm = {
  description: "",
  category_id: "",
  amount: "",
  currency: "AOA",
  expense_date: new Date().toISOString().slice(0, 10),
  location_id: "",
  paid_to: "",
  payment_method: "cash",
  notes: "",
  linked_delivery_reference: "",
  sales_order_id: "",
  purchase_order_id: "",
};

export default function ExpensesPage() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrderOption[]>([]);
  const [purchaseOrders, setPurchaseOrders] =
    useState<PurchaseOrderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewingId, setReviewingId] = useState("");
  const [selectedExpense, setSelectedExpense] =
    useState<ExpenseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"success" | "error">("error");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [locationFilter, setLocationFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      setFirebaseUser(user);
      await loadPage(user);
    });

    return () => unsubscribe();
  }, []);

  async function loadPage(user: User) {
    try {
      setLoading(true);
      setMessage("");

      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [
        meResponse,
        categoryResponse,
        locationResponse,
        expenseResponse,
        salesResponse,
        purchaseResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/api/me`, { headers, cache: "no-store" }),
        fetch(`${API_URL}/api/expense-categories`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/locations`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/expenses`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/sales-orders`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/purchase-orders`, {
          headers,
          cache: "no-store",
        }),
      ]);

      if (
        !meResponse.ok ||
        !categoryResponse.ok ||
        !locationResponse.ok ||
        !expenseResponse.ok
      ) {
        const errorData = await expenseResponse.json().catch(() => ({}));
        throw new Error(
          errorData.detail || "Não foi possível carregar as despesas."
        );
      }

      const [meData, categoryData, locationData, expenseData] =
        await Promise.all([
          meResponse.json(),
          categoryResponse.json(),
          locationResponse.json(),
          expenseResponse.json(),
        ]);

      const salesData = salesResponse.ok
        ? await salesResponse.json()
        : { sales_orders: [] };

      const purchaseData = purchaseResponse.ok
        ? await purchaseResponse.json()
        : { purchase_orders: [] };

      setCurrentUser(meData);
      setCategories(categoryData.categories || []);
      setLocations(locationData.locations || []);
      setExpenses(expenseData.expenses || []);
      setSalesOrders(salesData.sales_orders || []);
      setPurchaseOrders(purchaseData.purchase_orders || []);
    } catch (error) {
      console.error(error);
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as despesas."
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshExpenses(user = firebaseUser) {
    if (!user) return;

    const token = await user.getIdToken();
    const response = await fetch(`${API_URL}/api/expenses`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || "Não foi possível atualizar as despesas.");
    }

    setExpenses(data.expenses || []);
  }

  async function submitExpense() {
    if (!firebaseUser) return;

    if (
      !form.description.trim() ||
      !form.category_id ||
      !form.amount ||
      !form.location_id ||
      !form.paid_to.trim()
    ) {
      setMessageType("error");
      setMessage("Preencha os campos obrigatórios da despesa.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const token = await firebaseUser.getIdToken();
      const response = await fetch(`${API_URL}/api/expenses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          notes: form.notes.trim() || null,
          linked_delivery_reference:
            form.linked_delivery_reference.trim() || null,
          sales_order_id: form.sales_order_id || null,
          purchase_order_id: form.purchase_order_id || null,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Não foi possível registar a despesa.");
      }

      if (attachment) {
        const attachmentData = new FormData();
        attachmentData.append("file", attachment);

        const uploadResponse = await fetch(
          `${API_URL}/api/expenses/${data.expense.id}/attachments`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: attachmentData,
          }
        );

        const uploadData = await uploadResponse.json().catch(() => ({}));

        if (!uploadResponse.ok) {
          throw new Error(
            uploadData.detail ||
              "A despesa foi criada, mas o comprovativo não foi enviado."
          );
        }
      }

      await refreshExpenses(firebaseUser);
      setForm(emptyForm);
      setAttachment(null);
      setFormOpen(false);
      setMessageType("success");
      setMessage("Despesa registada com sucesso.");
    } catch (error) {
      console.error(error);
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível registar a despesa."
      );
    } finally {
      setSaving(false);
    }
  }

  async function openExpense(expenseId: string) {
    if (!firebaseUser) return;

    try {
      setDetailLoading(true);
      setMessage("");

      const token = await firebaseUser.getIdToken();
      const response = await fetch(
        `${API_URL}/api/expenses/${expenseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível carregar a despesa."
        );
      }

      setSelectedExpense(data.expense);
    } catch (error) {
      console.error(error);
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a despesa."
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function viewAttachment(
    expenseId: string,
    attachment: ExpenseAttachment
  ) {
    if (!firebaseUser) return;

    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch(
        `${API_URL}/api/expenses/${expenseId}/attachments/${attachment.id}/content`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.detail || "Não foi possível abrir o comprovativo."
        );
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 60000);
    } catch (error) {
      console.error(error);
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir o comprovativo."
      );
    }
  }

  async function reviewExpense(
    expense: Expense,
    status: "approved" | "rejected"
  ) {
    if (!firebaseUser) return;

    let notes = "";

    if (status === "rejected") {
      notes =
        window.prompt("Indique o motivo da rejeição:")?.trim() || "";

      if (!notes) return;
    }

    try {
      setReviewingId(expense.id);
      setMessage("");

      const token = await firebaseUser.getIdToken();
      const response = await fetch(
        `${API_URL}/api/expenses/${expense.id}/approval`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status, notes: notes || null }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Não foi possível rever a despesa.");
      }

      await refreshExpenses(firebaseUser);
      setMessageType("success");
      setMessage(
        status === "approved"
          ? "Despesa aprovada com sucesso."
          : "Despesa rejeitada."
      );
    } catch (error) {
      console.error(error);
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível rever a despesa."
      );
    } finally {
      setReviewingId("");
    }
  }

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return expenses.filter((expense) => {
      const matchesSearch =
        !query ||
        expense.expense_number.toLowerCase().includes(query) ||
        expense.description.toLowerCase().includes(query) ||
        expense.paid_to.toLowerCase().includes(query);

      return (
        matchesSearch &&
        (!locationFilter || expense.location_id === locationFilter) &&
        (!categoryFilter || expense.category_id === categoryFilter) &&
        (!statusFilter || expense.approval_status === statusFilter)
      );
    });
  }, [
    expenses,
    search,
    locationFilter,
    categoryFilter,
    statusFilter,
  ]);

  const approvedAOA = expenses
    .filter(
      (expense) =>
        expense.approval_status === "approved" &&
        expense.currency === "AOA"
    )
    .reduce((total, expense) => total + Number(expense.amount), 0);

  const pendingCount = expenses.filter(
    (expense) => expense.approval_status === "pending"
  ).length;

  const canApprove =
    currentUser?.permissions?.includes("expenses.approve") || false;

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-slate-950 text-white lg:block">
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <div>
            <div className="text-xl font-bold">PEN</div>
            <div className="text-xs text-slate-400">Inventário</div>
          </div>
        </div>

        <nav className="space-y-1 px-3 py-5 text-sm">
          <NavItem label="Painel" icon="⌂" href="/dashboard" />
          <NavItem label="Produtos" icon="▦" href="/products" />
          <NavItem label="Inventário" icon="▣" href="/inventory" />
          <NavItem label="Compras" icon="↓" href="/purchases" />
          <NavItem label="Vendas" icon="↑" href="/sales" />
          <PermissionGate permission="deliveries.view">
            <NavItem label="Entregas" icon="▰" href="/deliveries" />
          </PermissionGate>
          <NavItem label="Despesas" icon="−" href="/expenses" active />
          <NavItem label="Fornecedores" icon="♢" href="/suppliers" />
          <NavItem label="Clientes" icon="♙" href="/customers" />
          <NavItem label="Relatórios" icon="▤" href="/reports" />
          <PermissionGate permission="users.manage">
            <NavItem label="Utilizadores" icon="♧" href="/users" />
          </PermissionGate>
          <NavItem label="Definições" icon="⚙" href="/settings" />
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/10"
          >
            Terminar Sessão
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-950">Despesas</h1>
              <p className="text-sm text-slate-500">
                Custos operacionais por loja
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setFormOpen(true)}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
              >
                + Nova Despesa
              </button>
              <MobileNav onLogout={handleLogout} />
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            {message && (
              <div
                className={`mb-6 rounded-xl border p-4 text-sm ${
                  messageType === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {message}
              </div>
            )}

            <section className="mb-6 grid gap-4 md:grid-cols-3">
              <SummaryCard label="Total de Registos" value={expenses.length} />
              <SummaryCard label="Pendentes" value={pendingCount} />
              <SummaryCard
                label="Despesas Aprovadas"
                value={formatMoney(approvedAOA, "AOA")}
              />
            </section>

            <section className="mb-5 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-4">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar despesa..."
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 placeholder:text-slate-400"
              />
              <select
                value={locationFilter}
                onChange={(event) => setLocationFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 placeholder:text-slate-400"
              >
                <option value="">Todas as lojas</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 placeholder:text-slate-400"
              >
                <option value="">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 placeholder:text-slate-400"
              >
                <option value="">Todos os estados</option>
                <option value="pending">Pendente</option>
                <option value="approved">Aprovada</option>
                <option value="rejected">Rejeitada</option>
              </select>
            </section>

            <section className="overflow-hidden rounded-xl border bg-white">
              {loading ? (
                <div className="p-10 text-center text-slate-500">
                  A carregar despesas...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                      <tr>
                        <Th>Data</Th>
                        <Th>Referência</Th>
                        <Th>Descrição</Th>
                        <Th>Categoria</Th>
                        <Th>Loja</Th>
                        <Th>Pago a</Th>
                        <Th>Valor</Th>
                        <Th>Estado</Th>
                        <Th>Ação</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredExpenses.map((expense) => (
                        <tr key={expense.id}>
                          <Td>{formatDate(expense.expense_date)}</Td>
                          <Td>{expense.expense_number}</Td>
                          <Td>
                            <div className="font-medium text-slate-900">
                              {expense.description}
                            </div>
                            <div className="text-xs text-slate-500">
                              {expense.created_by_name || "—"}
                              {Number(expense.attachment_count) > 0
                                ? ` · ${expense.attachment_count} anexo(s)`
                                : ""}
                            </div>
                          </Td>
                          <Td>{expense.category_name}</Td>
                          <Td>{expense.location_name}</Td>
                          <Td>{expense.paid_to}</Td>
                          <Td>{formatMoney(expense.amount, expense.currency)}</Td>
                          <Td>
                            <StatusBadge status={expense.approval_status} />
                          </Td>
                          <Td>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() =>
                                  void openExpense(expense.id)
                                }
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                              >
                                Ver
                              </button>

                              {canApprove &&
                                expense.approval_status === "pending" && (
                                  <>
                                    <button
                                      disabled={reviewingId === expense.id}
                                      onClick={() =>
                                        void reviewExpense(
                                          expense,
                                          "approved"
                                        )
                                      }
                                      className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                                    >
                                      Aprovar
                                    </button>
                                    <button
                                      disabled={reviewingId === expense.id}
                                      onClick={() =>
                                        void reviewExpense(
                                          expense,
                                          "rejected"
                                        )
                                      }
                                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                                    >
                                      Rejeitar
                                    </button>
                                  </>
                                )}
                            </div>
                          </Td>
                        </tr>
                      ))}

                      {!filteredExpenses.length && (
                        <tr>
                          <td
                            colSpan={9}
                            className="p-10 text-center text-slate-500"
                          >
                            Nenhuma despesa encontrada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {(selectedExpense || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Detalhes da Despesa
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedExpense?.expense_number || "A carregar..."}
                </p>
              </div>
              <button
                onClick={() => setSelectedExpense(null)}
                disabled={detailLoading}
                className="text-2xl text-slate-400"
              >
                ×
              </button>
            </div>

            {detailLoading || !selectedExpense ? (
              <div className="p-10 text-center text-slate-500">
                A carregar despesa...
              </div>
            ) : (
              <div className="space-y-6 p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Detail label="Descrição" value={selectedExpense.description} />
                  <Detail label="Categoria" value={selectedExpense.category_name} />
                  <Detail label="Loja" value={selectedExpense.location_name} />
                  <Detail
                    label="Valor"
                    value={formatMoney(
                      selectedExpense.amount,
                      selectedExpense.currency
                    )}
                  />
                  <Detail
                    label="Data"
                    value={formatDate(selectedExpense.expense_date)}
                  />
                  <Detail
                    label="Estado"
                    value={
                      selectedExpense.approval_status === "approved"
                        ? "Aprovada"
                        : selectedExpense.approval_status === "rejected"
                          ? "Rejeitada"
                          : "Pendente"
                    }
                  />
                  <Detail label="Pago a" value={selectedExpense.paid_to} />
                  <Detail
                    label="Método de pagamento"
                    value={paymentMethodLabel(
                      selectedExpense.payment_method
                    )}
                  />
                  <Detail
                    label="Registado por"
                    value={selectedExpense.created_by_name || "—"}
                  />
                  <Detail
                    label="Referência da entrega"
                    value={
                      selectedExpense.linked_delivery_reference || "—"
                    }
                  />
                  <Detail
                    label="Venda associada"
                    value={selectedExpense.sale_number || "—"}
                  />
                  <Detail
                    label="Ordem de compra"
                    value={selectedExpense.po_number || "—"}
                  />
                  <Detail
                    label="Aprovado/Rejeitado por"
                    value={selectedExpense.approved_by_name || "—"}
                  />
                </div>

                <div>
                  <div className="mb-1 text-sm font-medium text-slate-500">
                    Notas
                  </div>
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-800">
                    {selectedExpense.notes || "Sem notas."}
                  </div>
                </div>

                {selectedExpense.approval_notes && (
                  <div>
                    <div className="mb-1 text-sm font-medium text-slate-500">
                      Notas da decisão
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      {selectedExpense.approval_notes}
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-3 text-sm font-semibold text-slate-900">
                    Recibos e faturas
                  </div>

                  <div className="space-y-2">
                    {selectedExpense.attachments.map((item) => (
                      <button
                        key={item.id}
                        onClick={() =>
                          void viewAttachment(selectedExpense.id, item)
                        }
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
                      >
                        <span>
                          <span className="block text-sm font-medium text-slate-900">
                            {item.original_filename}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatFileSize(item.file_size)}
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-blue-700">
                          Abrir
                        </span>
                      </button>
                    ))}

                    {!selectedExpense.attachments.length && (
                      <div className="rounded-xl border border-dashed p-5 text-center text-sm text-slate-500">
                        Nenhum comprovativo anexado.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end border-t px-6 py-4">
              <button
                onClick={() => setSelectedExpense(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Nova Despesa
                </h2>
                <p className="text-sm text-slate-500">
                  Registar um custo operacional da loja
                </p>
              </div>
              <button
                onClick={() => setFormOpen(false)}
                className="text-2xl text-slate-400"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <Field
                label="Descrição *"
                value={form.description}
                onChange={(value) => setForm({ ...form, description: value })}
              />

              <SelectField
                label="Categoria *"
                value={form.category_id}
                onChange={(value) => setForm({ ...form, category_id: value })}
                options={categories.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
                placeholder="Selecionar categoria"
              />

              <Field
                label="Valor *"
                value={form.amount}
                type="number"
                onChange={(value) => setForm({ ...form, amount: value })}
              />

              <SelectField
                label="Moeda *"
                value={form.currency}
                onChange={(value) => setForm({ ...form, currency: value })}
                options={["AOA", "USD", "ZAR", "CNY"].map((value) => ({
                  value,
                  label: value,
                }))}
              />

              <Field
                label="Data *"
                value={form.expense_date}
                type="date"
                onChange={(value) => setForm({ ...form, expense_date: value })}
              />

              <SelectField
                label="Loja / Localização *"
                value={form.location_id}
                onChange={(value) =>
                  setForm({
                    ...form,
                    location_id: value,
                    sales_order_id: "",
                    purchase_order_id: "",
                  })
                }
                options={locations.map((location) => ({
                  value: location.id,
                  label: `${location.name} · ${location.location_code}`,
                }))}
                placeholder="Selecionar loja"
              />

              <Field
                label="Fornecedor ou pessoa paga *"
                value={form.paid_to}
                onChange={(value) => setForm({ ...form, paid_to: value })}
              />

              <SelectField
                label="Método de pagamento *"
                value={form.payment_method}
                onChange={(value) =>
                  setForm({ ...form, payment_method: value })
                }
                options={[
                  { value: "cash", label: "Dinheiro" },
                  { value: "card", label: "Cartão" },
                  { value: "bank_transfer", label: "Transferência bancária" },
                  { value: "mobile_money", label: "Pagamento móvel" },
                  { value: "other", label: "Outro" },
                ]}
              />

              <Field
                label="Referência da entrega"
                value={form.linked_delivery_reference}
                onChange={(value) =>
                  setForm({ ...form, linked_delivery_reference: value })
                }
              />

              <SelectField
                label="Venda associada (opcional)"
                value={form.sales_order_id}
                onChange={(value) =>
                  setForm({ ...form, sales_order_id: value })
                }
                options={salesOrders
                  .filter(
                    (order) =>
                      !form.location_id ||
                      order.location_id === form.location_id
                  )
                  .map((order) => ({
                    value: order.id,
                    label: `${order.sale_number}${
                      order.customer_name
                        ? ` · ${order.customer_name}`
                        : ""
                    }`,
                  }))}
                placeholder={
                  form.location_id
                    ? "Nenhuma venda associada"
                    : "Selecione primeiro a loja"
                }
              />

              <SelectField
                label="Ordem de compra (opcional)"
                value={form.purchase_order_id}
                onChange={(value) =>
                  setForm({ ...form, purchase_order_id: value })
                }
                options={purchaseOrders
                  .filter(
                    (order) =>
                      !form.location_id ||
                      order.destination_location_id === form.location_id
                  )
                  .map((order) => ({
                    value: order.id,
                    label: `${order.po_number} · ${order.supplier_name}`,
                  }))}
                placeholder={
                  form.location_id
                    ? "Nenhuma ordem de compra"
                    : "Selecione primeiro a loja"
                }
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Recibo ou fatura
                </label>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setAttachment(event.target.files?.[0] || null)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:font-semibold file:text-slate-700"
                />
                <p className="mt-1 text-xs text-slate-500">
                  PDF, JPEG, PNG ou WEBP · máximo 10 MB
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notas
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button
                onClick={() => setFormOpen(false)}
                className="rounded-lg border px-4 py-2"
              >
                Cancelar
              </button>
              <button
                disabled={saving}
                onClick={() => void submitExpense()}
                className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                {saving ? "A guardar..." : "Registar Despesa"}
              </button>
            </div>
          </div>
        </div>
      )}
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
      className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
        active
          ? "bg-white text-slate-950"
          : "text-slate-300 hover:bg-white/10"
      }`}
    >
      <span className="w-5 text-center">{icon}</span>
      <span>{label}</span>
    </a>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        min={type === "number" ? "0.01" : undefined}
        step={type === "number" ? "0.01" : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 placeholder:text-slate-400"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-slate-700">{children}</td>;
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function paymentMethodLabel(value: string) {
  const labels: Record<string, string> = {
    cash: "Dinheiro",
    card: "Cartão",
    bank_transfer: "Transferência bancária",
    mobile_money: "Pagamento móvel",
    other: "Outro",
  };

  return labels[value] || value;
}

function formatFileSize(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({
  status,
}: {
  status: Expense["approval_status"];
}) {
  const styles = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
  };

  const labels = {
    pending: "Pendente",
    approved: "Aprovada",
    rejected: "Rejeitada",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-PT");
}
