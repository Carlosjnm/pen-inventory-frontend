"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { User } from "firebase/auth";
import ServiceMaterialsManager from "./ServiceMaterialsManager";
import ProviderMediaManager from "./ProviderMediaManager";
import ServiceReviewsManager from "./ServiceReviewsManager";
import ProtectedPaymentControl from "./ProtectedPaymentControl";
import NotificationControl from "./NotificationControl";
import ProviderAccountsManager from "./ProviderAccountsManager";
import ServicesHomepageEditor from "./ServicesHomepageEditor";

// NAZUNGA SERVICES HOMEPAGE EDITOR V1

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

// NAZUNGA SERVICE REVIEW LINK V1
const NAZUNGA_URL =
  process.env.NEXT_PUBLIC_NAZUNGA_URL ||
  "https://nazunga-marketplace-250574343787.africa-south1.run.app";

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  booking_mode: "appointment" | "quote" | "both";
  provider_count: number;
  is_active: boolean;
};

type Provider = {
  id: string;
  slug: string;
  public_name: string;
  headline: string | null;
  contact_name: string;
  phone: string;
  email: string | null;
  province: string;
  municipality: string;
  commission_percentage: number | null;
  commission_status: string;
  commission_due: number;
  verification_status: string;
  status: string;
  is_accepting_requests: boolean;
  is_featured: boolean;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    is_primary: boolean;
  }>;
};

type ServiceRequest = {
  id: string;
  request_number: string;
  provider_name: string;
  request_type: string;
  customer_name: string;
  customer_phone: string;
  service_mode: string;
  title: string;
  description: string;
  requested_starts_at: string | null;
  confirmed_starts_at: string | null;
  quoted_amount: number | null;
  final_amount: number | null;
  currency: string;
  status: string;
  payment_status: string;
  commission_percentage: number | null;
  commission_amount: number | null;
  commission_status: string | null;
  created_at: string;
};

type ServicesConfig = {
  services_enabled: boolean;
  direct_payments_enabled: boolean;
  protected_payments_enabled: boolean;
  default_commission_percentage: number;
  commission_billing_cycle: "weekly" | "monthly";
  commission_payment_days: number;
};

// NAZUNGA SERVICE CATEGORY MANAGER V1
const emptyCategory = {
  name: "",
  slug: "",
  description: "",
  booking_mode: "quote" as
    | "appointment"
    | "quote"
    | "both",
  icon_name: "",
  sort_order: "0",
  is_active: true,
};

const emptyProvider = {
  public_name: "",
  slug: "",
  headline: "",
  description: "",
  contact_name: "",
  phone: "",
  email: "",
  whatsapp: "",
  province: "",
  municipality: "",
  years_experience: "",
  commission_percentage: "",
  offers_at_location: false,
  offers_at_customer: true,
  offers_online: false,
  status: "draft",
  verification_status: "unverified",
  is_accepting_requests: false,
  is_featured: false,
  category_ids: [] as string[],
};

const requestStatuses = [
  ["new", "Novo"],
  ["reviewing", "Em análise"],
  ["awaiting_quote", "A aguardar orçamento"],
  ["quote_sent", "Orçamento enviado"],
  ["accepted", "Aceite"],
  ["scheduled", "Agendado"],
  ["in_progress", "Em execução"],
  ["awaiting_confirmation", "A aguardar confirmação"],
  ["completed", "Concluído"],
  ["declined", "Recusado"],
  ["cancelled", "Cancelado"],
  ["disputed", "Em disputa"],
];

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

function money(
  value: number | null | undefined,
  currency = "AOA"
) {
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

// PEN PROTECTED PAYMENT PANEL V1
export default function ServicesManager({
  user,
  isSuperAdmin = false,
}: {
  user: User;
  isSuperAdmin?: boolean;
}) {
  const [section, setSection] = useState<
    | "providers"
    | "requests"
    | "reviews"
    | "homepage"
    | "protected_payments"
    | "notifications"
    | "settings"
  >("providers");
  const [categories, setCategories] =
    useState<Category[]>([]);
  const [categoryForm, setCategoryForm] =
    useState(emptyCategory);
  const [showCategoryForm, setShowCategoryForm] =
    useState(false);

  // NAZUNGA COMPACT CATEGORY MANAGEMENT V1
  const [categorySearch, setCategorySearch] =
    useState("");
  const [
    providerCategorySearch,
    setProviderCategorySearch,
  ] = useState("");
  const [providers, setProviders] =
    useState<Provider[]>([]);
  const [requests, setRequests] =
    useState<ServiceRequest[]>([]);
  const [config, setConfig] =
    useState<ServicesConfig | null>(null);
  const [providerForm, setProviderForm] =
    useState(emptyProvider);
  const [showProviderForm, setShowProviderForm] =
    useState(false);
  const [
    selectedMaterialRequest,
    setSelectedMaterialRequest,
  ] = useState<ServiceRequest | null>(null);
  const [
    selectedMediaProvider,
    setSelectedMediaProvider,
  ] = useState<Provider | null>(null);

  // PEN PROVIDER ACCOUNTS PANEL V1
  const [
    selectedAccountsProvider,
    setSelectedAccountsProvider,
  ] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    void loadData();
  }, [user]);

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");

      const responses = await Promise.all([
        apiFetch(
          user,
          "/api/marketplace/services/categories"
        ),
        apiFetch(
          user,
          "/api/marketplace/services/providers"
        ),
        apiFetch(
          user,
          "/api/marketplace/services/requests"
        ),
        apiFetch(
          user,
          "/api/marketplace/services/config"
        ),
      ]);

      const [
        categoriesData,
        providersData,
        requestsData,
        configData,
      ] = await Promise.all(
        responses.map(responseData)
      );

      setCategories(
        categoriesData.categories || []
      );
      setProviders(
        providersData.providers || []
      );
      setRequests(
        requestsData.requests || []
      );
      setConfig(configData.config || null);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao carregar serviços."
      );
    } finally {
      setLoading(false);
    }
  }

  function success(text: string) {
    setIsError(false);
    setMessage(text);
  }

  function failure(error: unknown) {
    setIsError(true);
    setMessage(
      error instanceof Error
        ? error.message
        : "Não foi possível concluir a operação."
    );
  }

  function makeSlug(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function createCategory(
    event: FormEvent
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch(
        user,
        "/api/marketplace/services/categories",
        {
          method: "POST",
          body: JSON.stringify({
            ...categoryForm,
            sort_order: Number(
              categoryForm.sort_order || 0
            ),
          }),
        }
      );

      await responseData(response);
      setCategoryForm(emptyCategory);
      setShowCategoryForm(false);
      success("Categoria criada com sucesso.");
      await loadData();
    } catch (error) {
      failure(error);
    } finally {
      setSaving(false);
    }
  }

  async function createProvider(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch(
        user,
        "/api/marketplace/services/providers",
        {
          method: "POST",
          body: JSON.stringify({
            ...providerForm,
            years_experience:
              providerForm.years_experience
                ? Number(
                    providerForm.years_experience
                  )
                : null,
            commission_percentage:
              providerForm.commission_percentage
                ? Number(
                    providerForm
                      .commission_percentage
                  )
                : null,
          }),
        }
      );

      await responseData(response);
      setProviderForm(emptyProvider);
      setShowProviderForm(false);
      success("Profissional criado com sucesso.");
      await loadData();
    } catch (error) {
      failure(error);
    } finally {
      setSaving(false);
    }
  }

  async function updateProvider(
    provider: Provider,
    changes: Record<string, unknown>
  ) {
    try {
      setSaving(true);

      const response = await apiFetch(
        user,
        `/api/marketplace/services/providers/${provider.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(changes),
        }
      );

      await responseData(response);
      success("Profissional atualizado.");
      await loadData();
    } catch (error) {
      failure(error);
    } finally {
      setSaving(false);
    }
  }

  async function updateRequest(
    request: ServiceRequest,
    status: string,
    finalAmount: string
  ) {
    try {
      setSaving(true);

      const body: Record<string, unknown> = {
        status,
      };

      if (finalAmount.trim()) {
        body.final_amount = Number(finalAmount);
      }

      const response = await apiFetch(
        user,
        `/api/marketplace/services/requests/${request.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        }
      );

      await responseData(response);
      success(
        status === "completed"
          ? "Serviço concluído e comissão calculada."
          : "Pedido atualizado."
      );
      await loadData();
    } catch (error) {
      failure(error);
    } finally {
      setSaving(false);
    }
  }

  async function copyReviewLink(
    request: ServiceRequest
  ) {
    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch(
        user,
        `/api/marketplace/services/requests/${request.id}/review-link`
      );

      const data = await responseData(response);

      const url =
        `${NAZUNGA_URL}${data.relative_url}`;

      await navigator.clipboard.writeText(url);

      success(
        "Link de avaliação copiado. Pode enviá-lo ao cliente."
      );
    } catch (error) {
      failure(error);
    } finally {
      setSaving(false);
    }
  }

  async function saveConfig(event: FormEvent) {
    event.preventDefault();
    if (!config) return;

    try {
      setSaving(true);

      const response = await apiFetch(
        user,
        "/api/marketplace/services/config",
        {
          method: "PATCH",
          body: JSON.stringify({
            services_enabled:
              config.services_enabled,
            direct_payments_enabled:
              config.direct_payments_enabled,
            default_commission_percentage:
              Number(
                config.default_commission_percentage
              ),
            commission_billing_cycle:
              config.commission_billing_cycle,
            commission_payment_days:
              Number(
                config.commission_payment_days
              ),
          }),
        }
      );

      await responseData(response);
      success("Configuração guardada.");
      await loadData();
    } catch (error) {
      failure(error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
        A carregar Serviços Nazunga...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-950">
      <section className="rounded-2xl bg-gradient-to-br from-emerald-950 to-teal-800 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-lime-300">
          Nazunga
        </p>
        <h2 className="mt-2 text-2xl font-black">
          Gestão de Serviços
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          Profissionais, marcações, orçamentos,
          comissões e configurações.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <SectionButton
            active={section === "providers"}
            onClick={() => setSection("providers")}
          >
            Profissionais ({providers.length})
          </SectionButton>
          <SectionButton
            active={section === "requests"}
            onClick={() => setSection("requests")}
          >
            Pedidos ({requests.length})
          </SectionButton>
          <SectionButton
            active={section === "reviews"}
            onClick={() => setSection("reviews")}
          >
            Avaliações
          </SectionButton>
          <SectionButton
            active={section === "homepage"}
            onClick={() => setSection("homepage")}
          >
            Página pública
          </SectionButton>
          {isSuperAdmin && (
            <SectionButton
              active={
                section === "protected_payments"
              }
              onClick={() =>
                setSection(
                  "protected_payments"
                )
              }
            >
              Pagamento Protegido
            </SectionButton>
          )}

          {/* PEN NOTIFICATION CONTROL PANEL V1 */}
          {isSuperAdmin && (
            <SectionButton
              active={section === "notifications"}
              onClick={() =>
                setSection("notifications")
              }
            >
              Notificações
            </SectionButton>
          )}
          <SectionButton
            active={section === "settings"}
            onClick={() => setSection("settings")}
          >
            Configuração
          </SectionButton>
        </div>
      </section>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-bold ${
            isError
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {message}
        </div>
      )}

      {section === "providers" && (
        <>
          {selectedMediaProvider && (
            <ProviderMediaManager
              user={user}
              provider={selectedMediaProvider}
              onClose={() =>
                setSelectedMediaProvider(null)
              }
            />
          )}

          {selectedAccountsProvider && (
            <ProviderAccountsManager
              user={user}
              provider={selectedAccountsProvider}
              onClose={() =>
                setSelectedAccountsProvider(null)
              }
            />
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() =>
                setShowCategoryForm(
                  (current) => !current
                )
              }
              className="rounded-xl border border-emerald-700 bg-emerald-50 px-5 py-3 font-black text-emerald-900"
            >
              {showCategoryForm
                ? "Fechar categoria"
                : "+ Nova categoria"}
            </button>
          </div>

          {showCategoryForm && (
            <form
              onSubmit={createCategory}
              className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-xl font-black">
                Nova categoria de serviço
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                Crie categorias para organizar os
                profissionais e facilitar a pesquisa.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Input
                  label="Nome da categoria"
                  value={categoryForm.name}
                  onChange={(value) =>
                    setCategoryForm((current) => ({
                      ...current,
                      name: value,
                      slug:
                        current.slug ||
                        makeSlug(value),
                    }))
                  }
                  required
                />

                <Input
                  label="Identificador"
                  value={categoryForm.slug}
                  onChange={(value) =>
                    setCategoryForm((current) => ({
                      ...current,
                      slug: makeSlug(value),
                    }))
                  }
                  required
                />

                <label>
                  <span className="mb-2 block text-sm font-bold">
                    Tipo de pedido
                  </span>
                  <select
                    value={
                      categoryForm.booking_mode
                    }
                    onChange={(event) =>
                      setCategoryForm(
                        (current) => ({
                          ...current,
                          booking_mode:
                            event.target.value as
                              | "appointment"
                              | "quote"
                              | "both",
                        })
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  >
                    <option value="quote">
                      Pedido de orçamento
                    </option>
                    <option value="appointment">
                      Marcação
                    </option>
                    <option value="both">
                      Marcação ou orçamento
                    </option>
                  </select>
                </label>

                <Input
                  label="Ordem de apresentação"
                  type="number"
                  value={categoryForm.sort_order}
                  onChange={(value) =>
                    setCategoryForm((current) => ({
                      ...current,
                      sort_order: value,
                    }))
                  }
                />
              </div>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-bold">
                  Descrição
                </span>
                <textarea
                  value={categoryForm.description}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      description:
                        event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Explique os serviços incluídos nesta categoria."
                />
              </label>

              <button
                type="submit"
                disabled={
                  saving ||
                  !categoryForm.name.trim() ||
                  !categoryForm.slug.trim()
                }
                className="mt-5 rounded-xl bg-emerald-800 px-6 py-3 font-black text-white disabled:opacity-50"
              >
                {saving
                  ? "A guardar..."
                  : "Criar categoria"}
              </button>
            </form>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-black">
                  Categorias de serviços
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {categories.length} categorias disponíveis
                </p>
              </div>

              <input
                type="search"
                value={categorySearch}
                onChange={(event) =>
                  setCategorySearch(
                    event.target.value
                  )
                }
                placeholder="Pesquisar categoria..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 md:w-80"
              />
            </div>

            <div className="max-h-[420px] overflow-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-5 py-3">
                      Categoria
                    </th>
                    <th className="px-5 py-3">
                      Tipo de pedido
                    </th>
                    <th className="px-5 py-3 text-right">
                      Profissionais
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {categories
                    .filter((category) =>
                      category.name
                        .toLocaleLowerCase("pt")
                        .includes(
                          categorySearch
                            .trim()
                            .toLocaleLowerCase("pt")
                        )
                    )
                    .map((category) => (
                      <tr
                        key={category.id}
                        className="border-t border-slate-100 hover:bg-emerald-50/50"
                      >
                        <td className="px-5 py-3 font-bold">
                          {category.name}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {category.booking_mode ===
                          "appointment"
                            ? "Marcação"
                            : category.booking_mode ===
                                "quote"
                              ? "Orçamento"
                              : "Marcação ou orçamento"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="inline-flex min-w-9 justify-center rounded-full bg-emerald-100 px-3 py-1 font-black text-emerald-900">
                            {category.provider_count || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                setShowProviderForm(
                  (current) => !current
                )
              }
              className="rounded-xl bg-emerald-800 px-5 py-3 font-black text-white"
            >
              {showProviderForm
                ? "Fechar formulário"
                : "+ Novo profissional"}
            </button>
          </div>

          {showProviderForm && (
            <form
              onSubmit={createProvider}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-xl font-black">
                Novo profissional
              </h3>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Input
                  label="Nome público"
                  value={providerForm.public_name}
                  required
                  onChange={(value) =>
                    setProviderForm((current) => ({
                      ...current,
                      public_name: value,
                      slug: makeSlug(value),
                    }))
                  }
                />
                <Input
                  label="Identificador"
                  value={providerForm.slug}
                  required
                  onChange={(value) =>
                    setProviderForm((current) => ({
                      ...current,
                      slug: makeSlug(value),
                    }))
                  }
                />
                <Input
                  label="Pessoa de contacto"
                  value={providerForm.contact_name}
                  required
                  onChange={(value) =>
                    setProviderForm((current) => ({
                      ...current,
                      contact_name: value,
                    }))
                  }
                />
                <Input
                  label="Telefone"
                  value={providerForm.phone}
                  required
                  onChange={(value) =>
                    setProviderForm((current) => ({
                      ...current,
                      phone: value,
                    }))
                  }
                />
                <Input
                  label="E-mail"
                  type="email"
                  value={providerForm.email}
                  onChange={(value) =>
                    setProviderForm((current) => ({
                      ...current,
                      email: value,
                    }))
                  }
                />
                <Input
                  label="WhatsApp"
                  value={providerForm.whatsapp}
                  onChange={(value) =>
                    setProviderForm((current) => ({
                      ...current,
                      whatsapp: value,
                    }))
                  }
                />
                <Input
                  label="Província"
                  value={providerForm.province}
                  required
                  onChange={(value) =>
                    setProviderForm((current) => ({
                      ...current,
                      province: value,
                    }))
                  }
                />
                <Input
                  label="Município"
                  value={providerForm.municipality}
                  required
                  onChange={(value) =>
                    setProviderForm((current) => ({
                      ...current,
                      municipality: value,
                    }))
                  }
                />
                <Input
                  label="Anos de experiência"
                  type="number"
                  value={
                    providerForm.years_experience
                  }
                  onChange={(value) =>
                    setProviderForm((current) => ({
                      ...current,
                      years_experience: value,
                    }))
                  }
                />
                <Input
                  label="Comissão personalizada (%)"
                  type="number"
                  value={
                    providerForm
                      .commission_percentage
                  }
                  onChange={(value) =>
                    setProviderForm((current) => ({
                      ...current,
                      commission_percentage:
                        value,
                    }))
                  }
                />
              </div>

              <Input
                label="Título profissional"
                value={providerForm.headline}
                onChange={(value) =>
                  setProviderForm((current) => ({
                    ...current,
                    headline: value,
                  }))
                }
                className="mt-4"
              />

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-black">
                  Apresentação
                </span>
                <textarea
                  rows={4}
                  value={providerForm.description}
                  onChange={(event) =>
                    setProviderForm((current) => ({
                      ...current,
                      description:
                        event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </label>

              <div className="mt-5">
                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-black">
                      Categorias
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Selecione uma ou mais categorias para o profissional.
                    </p>
                  </div>

                  <input
                    type="search"
                    value={providerCategorySearch}
                    onChange={(event) =>
                      setProviderCategorySearch(
                        event.target.value
                      )
                    }
                    placeholder="Procurar categoria..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 md:w-72"
                  />
                </div>

                {providerForm.category_ids.length > 0 && (
                  <p className="mb-3 text-xs font-bold text-emerald-800">
                    {providerForm.category_ids.length} categoria(s) selecionada(s)
                  </p>
                )}

                <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {categories
                      .filter((category) =>
                        category.name
                          .toLocaleLowerCase("pt")
                          .includes(
                            providerCategorySearch
                              .trim()
                              .toLocaleLowerCase("pt")
                          )
                      )
                      .map((category) => {
                        const checked =
                          providerForm.category_ids.includes(
                            category.id
                          );

                        return (
                          <label
                            key={category.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-bold transition ${
                              checked
                                ? "border-emerald-600 bg-emerald-100 text-emerald-950"
                                : "border-slate-200 bg-white hover:border-emerald-400"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                setProviderForm(
                                  (current) => ({
                                    ...current,
                                    category_ids:
                                      event.target.checked
                                        ? [
                                            ...current.category_ids,
                                            category.id,
                                          ]
                                        : current.category_ids.filter(
                                            (id) =>
                                              id !==
                                              category.id
                                          ),
                                  })
                                )
                              }
                              className="h-4 w-4 accent-emerald-700"
                            />
                            <span>
                              {category.name}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-4">
                <Check
                  label="No estabelecimento"
                  checked={
                    providerForm.offers_at_location
                  }
                  onChange={(checked) =>
                    setProviderForm((current) => ({
                      ...current,
                      offers_at_location: checked,
                    }))
                  }
                />
                <Check
                  label="Ao domicílio"
                  checked={
                    providerForm.offers_at_customer
                  }
                  onChange={(checked) =>
                    setProviderForm((current) => ({
                      ...current,
                      offers_at_customer: checked,
                    }))
                  }
                />
                <Check
                  label="Online"
                  checked={
                    providerForm.offers_online
                  }
                  onChange={(checked) =>
                    setProviderForm((current) => ({
                      ...current,
                      offers_online: checked,
                    }))
                  }
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-6 rounded-xl bg-slate-950 px-6 py-3 font-black text-white disabled:opacity-50"
              >
                {saving
                  ? "A guardar..."
                  : "Criar profissional"}
              </button>
            </form>
          )}

          <section className="grid gap-5 xl:grid-cols-2">
            {providers.map((provider) => (
              <article
                key={provider.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black">
                      {provider.public_name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {provider.headline ||
                        "Sem título profissional"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      provider.status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {provider.status}
                  </span>
                </div>

                <p className="mt-4 text-sm">
                  {provider.province},{" "}
                  {provider.municipality}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {provider.contact_name} ·{" "}
                  {provider.phone}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {provider.categories.map(
                    (category) => (
                      <span
                        key={category.id}
                        className="rounded-full bg-lime-100 px-3 py-1 text-xs font-bold text-emerald-900"
                      >
                        {category.name}
                      </span>
                    )
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
                  <div>
                    <span className="block text-xs text-slate-500">
                      Comissão
                    </span>
                    <strong>
                      {provider.commission_percentage ??
                        config
                          ?.default_commission_percentage ??
                        10}
                      %
                    </strong>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">
                      Por pagar
                    </span>
                    <strong className="text-red-700">
                      {money(
                        provider.commission_due
                      )}
                    </strong>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setSelectedMediaProvider(
                        provider
                      );
                      setSelectedAccountsProvider(
                        null
                      );
                      window.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      });
                    }}
                    className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-900"
                  >
                    Fotografias
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setSelectedAccountsProvider(
                        provider
                      );
                      setSelectedMediaProvider(
                        null
                      );
                      window.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      });
                    }}
                    className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-900"
                  >
                    Gerir contas
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      updateProvider(provider, {
                        status:
                          provider.status ===
                          "active"
                            ? "suspended"
                            : "active",
                        is_accepting_requests:
                          provider.status !==
                          "active",
                      })
                    }
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold"
                  >
                    {provider.status === "active"
                      ? "Suspender"
                      : "Ativar"}
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      updateProvider(provider, {
                        verification_status:
                          provider.verification_status ===
                          "verified"
                            ? "unverified"
                            : "verified",
                      })
                    }
                    className="rounded-xl border border-emerald-300 px-4 py-2 text-sm font-bold text-emerald-800"
                  >
                    {provider.verification_status ===
                    "verified"
                      ? "Remover verificação"
                      : "Verificar profissional"}
                  </button>
                </div>
              </article>
            ))}

            {providers.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600 xl:col-span-2">
                Ainda não existem profissionais.
              </div>
            )}
          </section>
        </>
      )}

      {section === "reviews" && (
        <ServiceReviewsManager user={user} />
      )}

      {section === "requests" && (
        <section className="space-y-4">
          {selectedMaterialRequest && (
            <ServiceMaterialsManager
              user={user}
              request={selectedMaterialRequest}
              onClose={() =>
                setSelectedMaterialRequest(null)
              }
            />
          )}

          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              saving={saving}
              onSave={updateRequest}
              onReviewLink={() =>
                copyReviewLink(request)
              }
              onMaterials={() => {
                setSelectedMaterialRequest(
                  request
                );
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
            />
          ))}

          {requests.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
              Ainda não existem pedidos de serviços.
            </div>
          )}
        </section>
      )}

      {section === "homepage" && (
        <ServicesHomepageEditor user={user} />
      )}

      {section === "protected_payments" &&
        isSuperAdmin && (
          <ProtectedPaymentControl
            user={user}
          />
        )}

      {section === "notifications" &&
        isSuperAdmin && (
          <NotificationControl user={user} />
        )}

      {section === "settings" && config && (
        <form
          onSubmit={saveConfig}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-xl font-black">
            Configuração dos Serviços
          </h3>

          <div className="mt-6 flex flex-wrap gap-5">
            <Check
              label="Serviços ativos na Nazunga"
              checked={config.services_enabled}
              onChange={(checked) =>
                setConfig({
                  ...config,
                  services_enabled: checked,
                })
              }
            />
            <Check
              label="Pagamentos diretos ativos"
              checked={
                config.direct_payments_enabled
              }
              onChange={(checked) =>
                setConfig({
                  ...config,
                  direct_payments_enabled: checked,
                })
              }
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Input
              label="Comissão padrão (%)"
              type="number"
              value={String(
                config.default_commission_percentage
              )}
              onChange={(value) =>
                setConfig({
                  ...config,
                  default_commission_percentage:
                    Number(value),
                })
              }
            />
            <label className="block">
              <span className="mb-2 block text-sm font-black">
                Faturação da comissão
              </span>
              <select
                value={
                  config.commission_billing_cycle
                }
                onChange={(event) =>
                  setConfig({
                    ...config,
                    commission_billing_cycle:
                      event.target.value as
                        | "weekly"
                        | "monthly",
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="weekly">
                  Semanal
                </option>
                <option value="monthly">
                  Mensal
                </option>
              </select>
            </label>
            <Input
              label="Prazo de pagamento (dias)"
              type="number"
              value={String(
                config.commission_payment_days
              )}
              onChange={(value) =>
                setConfig({
                  ...config,
                  commission_payment_days:
                    Number(value),
                })
              }
            />
          </div>

          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-5">
            <p className="font-black text-amber-900">
              Pagamento Protegido Nazunga
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Preparado no sistema, mas desativado até
              existir um banco ou prestador de pagamentos
              autorizado.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 rounded-xl bg-slate-950 px-6 py-3 font-black text-white disabled:opacity-50"
          >
            Guardar configuração
          </button>
        </form>
      )}
    </div>
  );
}

function RequestCard({
  request,
  saving,
  onSave,
  onMaterials,
  onReviewLink,
}: {
  request: ServiceRequest;
  saving: boolean;
  onMaterials: () => void;
  onReviewLink: () => void;
  onSave: (
    request: ServiceRequest,
    status: string,
    finalAmount: string
  ) => Promise<void>;
}) {
  const [status, setStatus] =
    useState(request.status);
  const [finalAmount, setFinalAmount] =
    useState(
      request.final_amount !== null
        ? String(request.final_amount)
        : request.quoted_amount !== null
          ? String(request.quoted_amount)
          : ""
    );

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-emerald-800">
            {request.request_number}
          </p>
          <h3 className="mt-1 text-xl font-black">
            {request.title}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {request.customer_name} ·{" "}
            {request.customer_phone}
          </p>
        </div>

        <div className="text-sm md:text-right">
          <p className="font-bold">
            {request.provider_name}
          </p>
          <p className="text-slate-500">
            {request.request_type ===
            "appointment"
              ? "Marcação"
              : "Pedido de orçamento"}
          </p>
        </div>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {request.description}
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label>
          <span className="mb-2 block text-xs font-black uppercase text-slate-500">
            Estado
          </span>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          >
            {requestStatuses.map(
              ([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              )
            )}
          </select>
        </label>

        <Input
          label="Valor final (AOA)"
          type="number"
          value={finalAmount}
          onChange={setFinalAmount}
        />

        <div>
          <span className="mb-2 block text-xs font-black uppercase text-slate-500">
            Comissão
          </span>
          <div className="rounded-xl bg-slate-50 px-4 py-3 font-black">
            {request.commission_amount !== null
              ? money(
                  request.commission_amount,
                  request.currency
                )
              : "Será calculada ao concluir"}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void onSave(
              request,
              status,
              finalAmount
            )
          }
          className="rounded-xl bg-emerald-800 px-5 py-3 font-black text-white disabled:opacity-50"
        >
          Guardar pedido
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={onMaterials}
          className="rounded-xl border border-emerald-700 bg-emerald-50 px-5 py-3 font-black text-emerald-900 disabled:opacity-50"
        >
          Gerir materiais
        </button>

        {request.status === "completed" && (
          <button
            type="button"
            disabled={saving}
            onClick={onReviewLink}
            className="rounded-xl border border-amber-400 bg-amber-50 px-5 py-3 font-black text-amber-900 disabled:opacity-50"
          >
            Copiar link de avaliação
          </button>
        )}
      </div>
    </article>
  );
}

function SectionButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-black transition ${
        active
          ? "bg-lime-300 text-emerald-950"
          : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-black">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-300 px-4 py-3"
      />
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm font-bold">
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
