"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { User } from "firebase/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type CandidateItem = {
  id: string;
  name: string;
  slug?: string;
  price: number | null;
  currency: string;
  price_type?: string;
};

type Advertiser = {
  id: string;
  name: string;
  slug: string;
  items: CandidateItem[];
};

type Candidates = {
  stores: Advertiser[];
  providers: Advertiser[];
  placements: string[];
  billing_models: string[];
};

type CampaignItem = {
  id: string;
  item_type: string;
  item_name: string;
  custom_headline: string | null;
  call_to_action: string | null;
  is_active: boolean;
};

type Campaign = {
  id: string;
  name: string;
  advertiser_type: "store" | "provider";
  advertiser_name: string;
  status: string;
  payment_status: string;
  billing_model: string;
  currency: string;
  budget: number | null;
  priority: number;
  starts_at: string;
  ends_at: string;
  maximum_impressions: number | null;
  paid_at: string | null;
  internal_notes: string | null;
  items: CampaignItem[];
  placements: string[];
  impression_count: number;
  click_count: number;
};

const placementLabels: Record<string, string> = {
  marketplace_home: "Página inicial",
  all_stores: "Todas as lojas",
  store_page: "Página da loja",
  product_page: "Página do produto",
  all_services: "Todos os serviços",
  provider_page: "Página do profissional",
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  pending_approval: "A aguardar aprovação",
  active: "Ativa",
  paused: "Pausada",
  ended: "Terminada",
  cancelled: "Cancelada",
};

const paymentLabels: Record<string, string> = {
  pending: "Pagamento pendente",
  paid: "Pago",
  waived: "Dispensado",
  refunded: "Reembolsado",
};

function localDateTime(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setMinutes(
    date.getMinutes() -
      date.getTimezoneOffset()
  );

  return date.toISOString().slice(0, 16);
}

async function apiFetch(
  user: User,
  endpoint: string,
  options: RequestInit = {}
) {
  const token = await user.getIdToken();

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
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
    }
  );

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

const initialForm = {
  name: "",
  advertiser_type: "store",
  advertiser_id: "",
  item_id: "",
  starts_at: localDateTime(0),
  ends_at: localDateTime(30),
  billing_model: "flat",
  budget: "",
  priority: "100",
  maximum_impressions: "",
  custom_headline: "",
  custom_description: "",
  call_to_action: "Ver agora",
  internal_notes: "",
};

export default function SponsoredCampaignManager({
  user,
}: {
  user: User;
}) {
  const [candidates, setCandidates] =
    useState<Candidates | null>(null);
  const [campaigns, setCampaigns] =
    useState<Campaign[]>([]);
  const [form, setForm] =
    useState(initialForm);
  const [placements, setPlacements] =
    useState<string[]>([
      "marketplace_home",
      "all_stores",
      "all_services",
    ]);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [busyId, setBusyId] =
    useState<string | null>(null);
  const [message, setMessage] =
    useState("");
  const [isError, setIsError] =
    useState(false);

  const loadData = useCallback(
    async () => {
      try {
        setLoading(true);
        setMessage("");

        const [candidateData, campaignData] =
          await Promise.all([
            apiFetch(
              user,
              "/api/marketplace/sponsored-campaigns/candidates"
            ),
            apiFetch(
              user,
              "/api/marketplace/sponsored-campaigns"
            ),
          ]);

        setCandidates(candidateData);
        setCampaigns(
          campaignData.campaigns || []
        );
      } catch (error) {
        setIsError(true);
        setMessage(
          error instanceof Error
            ? error.message
            : "Erro ao carregar campanhas."
        );
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const advertisers = useMemo(
    () =>
      form.advertiser_type === "store"
        ? candidates?.stores || []
        : candidates?.providers || [],
    [
      candidates,
      form.advertiser_type,
    ]
  );

  const selectedAdvertiser =
    advertisers.find(
      (item) =>
        item.id === form.advertiser_id
    );

  function updateForm(
    field: keyof typeof initialForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function changeAdvertiserType(
    value: string
  ) {
    setForm((current) => ({
      ...current,
      advertiser_type: value,
      advertiser_id: "",
      item_id: "",
    }));
  }

  function togglePlacement(
    placement: string
  ) {
    setPlacements((current) =>
      current.includes(placement)
        ? current.filter(
            (item) => item !== placement
          )
        : [...current, placement]
    );
  }

  async function createCampaign(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !form.advertiser_id ||
      !form.item_id ||
      placements.length === 0
    ) {
      setIsError(true);
      setMessage(
        "Selecione o anunciante, o conteúdo e pelo menos uma posição."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      await apiFetch(
        user,
        "/api/marketplace/sponsored-campaigns",
        {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            advertiser_type:
              form.advertiser_type,
            advertiser_id:
              form.advertiser_id,
            item_type:
              form.advertiser_type ===
              "store"
                ? "product"
                : "service",
            item_id: form.item_id,
            placements,
            starts_at: new Date(
              form.starts_at
            ).toISOString(),
            ends_at: new Date(
              form.ends_at
            ).toISOString(),
            status: "draft",
            payment_status: "pending",
            billing_model:
              form.billing_model,
            currency: "AOA",
            budget: form.budget
              ? Number(form.budget)
              : null,
            priority: Number(
              form.priority
            ),
            maximum_impressions:
              form.maximum_impressions
                ? Number(
                    form.maximum_impressions
                  )
                : null,
            custom_headline:
              form.custom_headline ||
              null,
            custom_description:
              form.custom_description ||
              null,
            call_to_action:
              form.call_to_action || null,
            internal_notes:
              form.internal_notes || null,
          }),
        }
      );

      setForm({
        ...initialForm,
        starts_at: localDateTime(0),
        ends_at: localDateTime(30),
      });
      setIsError(false);
      setMessage(
        "Campanha criada em rascunho."
      );
      await loadData();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao criar campanha."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateCampaign(
    campaignId: string,
    changes: Record<string, unknown>,
    successMessage: string
  ) {
    try {
      setBusyId(campaignId);
      setMessage("");

      await apiFetch(
        user,
        `/api/marketplace/sponsored-campaigns/${campaignId}`,
        {
          method: "PATCH",
          body: JSON.stringify(changes),
        }
      );

      setIsError(false);
      setMessage(successMessage);
      await loadData();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar campanha."
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
        A carregar campanhas patrocinadas…
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-amber-950 via-amber-900 to-orange-800 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
          Montra patrocinada
        </p>
        <h2 className="mt-2 text-2xl font-black">
          Produtos e serviços patrocinados
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-50">
          Crie campanhas pagas, escolha onde
          aparecem e acompanhe impressões e
          cliques. O conteúdo público será
          identificado como Patrocinado.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-xl border p-4 text-sm font-bold ${
            isError
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {message}
        </div>
      )}

      <form
        onSubmit={createCampaign}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 className="text-xl font-black">
          Nova campanha patrocinada
        </h3>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Nome da campanha">
            <input
              required
              value={form.name}
              onChange={(event) =>
                updateForm(
                  "name",
                  event.target.value
                )
              }
              className="input"
            />
          </Field>

          <Field label="Tipo de anunciante">
            <select
              value={form.advertiser_type}
              onChange={(event) =>
                changeAdvertiserType(
                  event.target.value
                )
              }
              className="input"
            >
              <option value="store">
                Loja / produto
              </option>
              <option value="provider">
                Profissional / serviço
              </option>
            </select>
          </Field>

          <Field label="Anunciante">
            <select
              required
              value={form.advertiser_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  advertiser_id:
                    event.target.value,
                  item_id: "",
                }))
              }
              className="input"
            >
              <option value="">
                Selecionar…
              </option>
              {advertisers.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={
              form.advertiser_type ===
              "store"
                ? "Produto"
                : "Serviço"
            }
          >
            <select
              required
              value={form.item_id}
              onChange={(event) =>
                updateForm(
                  "item_id",
                  event.target.value
                )
              }
              className="input"
            >
              <option value="">
                Selecionar…
              </option>
              {(selectedAdvertiser?.items ||
                []).map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Início">
            <input
              required
              type="datetime-local"
              value={form.starts_at}
              onChange={(event) =>
                updateForm(
                  "starts_at",
                  event.target.value
                )
              }
              className="input"
            />
          </Field>

          <Field label="Fim">
            <input
              required
              type="datetime-local"
              value={form.ends_at}
              onChange={(event) =>
                updateForm(
                  "ends_at",
                  event.target.value
                )
              }
              className="input"
            />
          </Field>

          <Field label="Cobrança">
            <select
              value={form.billing_model}
              onChange={(event) =>
                updateForm(
                  "billing_model",
                  event.target.value
                )
              }
              className="input"
            >
              <option value="flat">
                Valor fixo
              </option>
              <option value="cpc">
                Por clique
              </option>
              <option value="cpm">
                Por mil impressões
              </option>
            </select>
          </Field>

          <Field label="Orçamento (Kz)">
            <input
              type="number"
              min="0"
              value={form.budget}
              onChange={(event) =>
                updateForm(
                  "budget",
                  event.target.value
                )
              }
              className="input"
            />
          </Field>

          <Field label="Prioridade">
            <input
              type="number"
              min="1"
              max="1000"
              value={form.priority}
              onChange={(event) =>
                updateForm(
                  "priority",
                  event.target.value
                )
              }
              className="input"
            />
          </Field>

          <Field label="Limite de impressões">
            <input
              type="number"
              min="1"
              value={
                form.maximum_impressions
              }
              onChange={(event) =>
                updateForm(
                  "maximum_impressions",
                  event.target.value
                )
              }
              className="input"
            />
          </Field>

          <Field label="Título público">
            <input
              value={form.custom_headline}
              onChange={(event) =>
                updateForm(
                  "custom_headline",
                  event.target.value
                )
              }
              className="input"
            />
          </Field>

          <Field label="Botão">
            <input
              value={form.call_to_action}
              onChange={(event) =>
                updateForm(
                  "call_to_action",
                  event.target.value
                )
              }
              className="input"
            />
          </Field>
        </div>

        <Field label="Descrição pública">
          <textarea
            rows={3}
            value={form.custom_description}
            onChange={(event) =>
              updateForm(
                "custom_description",
                event.target.value
              )
            }
            className="input"
          />
        </Field>

        <Field label="Notas internas">
          <textarea
            rows={2}
            value={form.internal_notes}
            onChange={(event) =>
              updateForm(
                "internal_notes",
                event.target.value
              )
            }
            className="input"
          />
        </Field>

        <div className="mt-5">
          <p className="text-sm font-black">
            Páginas onde será apresentada
          </p>

          <div className="mt-3 flex flex-wrap gap-3">
            {(candidates?.placements || [])
              .map((placement) => (
                <label
                  key={placement}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
                >
                  <input
                    type="checkbox"
                    checked={placements.includes(
                      placement
                    )}
                    onChange={() =>
                      togglePlacement(
                        placement
                      )
                    }
                  />
                  {placementLabels[placement] ||
                    placement}
                </label>
              ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 rounded-xl bg-amber-500 px-5 py-3 font-black text-amber-950 disabled:opacity-50"
        >
          {saving
            ? "A criar…"
            : "Criar campanha"}
        </button>
      </form>

      <div className="grid gap-5 xl:grid-cols-2">
        {campaigns.map((campaign) => (
          <article
            key={campaign.id}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                  Patrocinado
                </p>
                <h3 className="mt-1 text-lg font-black">
                  {campaign.name}
                </h3>
                <p className="text-sm text-slate-600">
                  {campaign.advertiser_name}
                  {" · "}
                  {campaign.items
                    .map(
                      (item) =>
                        item.item_name
                    )
                    .join(", ")}
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                {statusLabels[
                  campaign.status
                ] || campaign.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat
                label="Pagamento"
                value={
                  paymentLabels[
                    campaign.payment_status
                  ] ||
                  campaign.payment_status
                }
              />
              <Stat
                label="Impressões"
                value={String(
                  campaign.impression_count
                )}
              />
              <Stat
                label="Cliques"
                value={String(
                  campaign.click_count
                )}
              />
              <Stat
                label="Prioridade"
                value={String(
                  campaign.priority
                )}
              />
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              {new Date(
                campaign.starts_at
              ).toLocaleString("pt-PT")}
              {" — "}
              {new Date(
                campaign.ends_at
              ).toLocaleString("pt-PT")}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {campaign.placements.map(
                (placement) => (
                  <span
                    key={placement}
                    className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800"
                  >
                    {placementLabels[
                      placement
                    ] || placement}
                  </span>
                )
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {campaign.payment_status ===
                "pending" && (
                <>
                  <Action
                    disabled={
                      busyId === campaign.id
                    }
                    onClick={() =>
                      void updateCampaign(
                        campaign.id,
                        {
                          payment_status:
                            "paid",
                        },
                        "Pagamento confirmado."
                      )
                    }
                  >
                    Confirmar pagamento
                  </Action>

                  <Action
                    disabled={
                      busyId === campaign.id
                    }
                    onClick={() =>
                      void updateCampaign(
                        campaign.id,
                        {
                          payment_status:
                            "waived",
                        },
                        "Campanha autorizada sem cobrança."
                      )
                    }
                  >
                    Dispensar cobrança
                  </Action>
                </>
              )}

              {campaign.status !==
                "active" &&
                campaign.status !==
                  "ended" &&
                campaign.status !==
                  "cancelled" && (
                  <Action
                    disabled={
                      busyId === campaign.id
                    }
                    onClick={() =>
                      void updateCampaign(
                        campaign.id,
                        { status: "active" },
                        "Campanha ativada."
                      )
                    }
                  >
                    Ativar
                  </Action>
                )}

              {campaign.status ===
                "active" && (
                <Action
                  disabled={
                    busyId === campaign.id
                  }
                  onClick={() =>
                    void updateCampaign(
                      campaign.id,
                      { status: "paused" },
                      "Campanha pausada."
                    )
                  }
                >
                  Pausar
                </Action>
              )}

              {![
                "ended",
                "cancelled",
              ].includes(campaign.status) && (
                <Action
                  disabled={
                    busyId === campaign.id
                  }
                  onClick={() =>
                    void updateCampaign(
                      campaign.id,
                      { status: "ended" },
                      "Campanha terminada."
                    )
                  }
                >
                  Terminar
                </Action>
              )}
            </div>
          </article>
        ))}
      </div>

      {!campaigns.length && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          Ainda não existem campanhas
          patrocinadas.
        </div>
      )}

      <style jsx>{`
        .input {
          margin-top: 0.5rem;
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(203 213 225);
          background: white;
          padding: 0.75rem 1rem;
          color: rgb(15 23 42);
        }
      `}</style>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-4 block text-sm font-bold text-slate-700">
      {label}
      {children}
    </label>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function Action({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
