"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { User } from "firebase/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Payment = {
  id: string;
  request_id: string;
  milestone_id: string;
  environment: "simulation" | "live";
  provider_name: string | null;
  external_reference: string | null;
  amount: number;
  currency: string;
  platform_fee: number;
  provider_amount: number;
  status: string;
  paid_at: string | null;
  protected_at: string | null;
  release_requested_at: string | null;
  release_approved_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
  request_number: string;
  request_title: string;
  sequence_number: number;
  milestone_title: string;
  milestone_status: string;
  provider_name_public: string;
  pending_action_id: string | null;
  pending_action_type: string | null;
  pending_action_status: string | null;
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

function money(
  value: number,
  currency: string
) {
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(
  value: string | null
) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(
    "pt-AO",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(value));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "A aguardar confirmação",
    confirmed: "Confirmado",
    protected: "Valor protegido",
    release_pending: "Libertação pendente",
    released: "Valor libertado",
    partially_refunded:
      "Parcialmente reembolsado",
    refunded: "Reembolsado",
    failed: "Falhou",
    cancelled: "Cancelado",
    awaiting_payment:
      "A aguardar pagamento",
    funded: "Financiada",
    in_progress: "Em execução",
    submitted: "Entregue",
    approved: "Aprovada",
    disputed: "Contestada",
  };

  return labels[status] || status;
}

export default function MilestonePaymentAdmin({
  user,
}: {
  user: User;
}) {
  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [environment, setEnvironment] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [workingId, setWorkingId] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  const loadPayments = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        const params =
          new URLSearchParams();

        if (environment) {
          params.set(
            "environment",
            environment
          );
        }

        if (status) {
          params.set("status", status);
        }

        const query = params.toString();

        const response = await apiFetch(
          user,
          "/api/marketplace/services/milestone-payments" +
            (query ? `?${query}` : "")
        );

        const data =
          await responseData(response);

        setPayments(data.payments || []);
      } catch (error) {
        if (!silent) {
          setIsError(true);
          setMessage(
            error instanceof Error
              ? error.message
              : "Erro ao carregar pagamentos."
          );
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [environment, status, user]
  );

  useEffect(() => {
    void loadPayments();

    const interval = window.setInterval(() => {
      if (
        document.visibilityState === "visible"
      ) {
        void loadPayments(true);
      }
    }, 15000);

    return () =>
      window.clearInterval(interval);
  }, [loadPayments]);

  async function confirmPayment(
    payment: Payment
  ) {
    const reference = window.prompt(
      "Introduza a referência bancária ou do PSP que confirma a entrada do valor:",
      payment.external_reference || ""
    );

    if (reference === null) return;

    if (!reference.trim()) {
      setIsError(true);
      setMessage(
        "A referência da confirmação é obrigatória."
      );
      return;
    }

    const note = window.prompt(
      "Nota administrativa opcional:",
      ""
    );

    if (note === null) return;

    if (
      !window.confirm(
        `Confirma que recebeu e protegeu ${money(
          payment.amount,
          payment.currency
        )} para a etapa ${payment.sequence_number}?`
      )
    ) {
      return;
    }

    try {
      setWorkingId(payment.id);
      setMessage("");
      setIsError(false);

      const response = await apiFetch(
        user,
        `/api/marketplace/services/milestone-payments/${payment.id}/confirm`,
        {
          method: "POST",
          body: JSON.stringify({
            external_reference:
              reference.trim(),
            note: note.trim() || null,
          }),
        }
      );

      const data =
        await responseData(response);

      setMessage(
        data.message ||
          "Pagamento confirmado e protegido."
      );

      await loadPayments(true);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível confirmar o pagamento."
      );
    } finally {
      setWorkingId("");
    }
  }

  async function executeRelease(
    payment: Payment
  ) {
    if (!payment.pending_action_id) {
      setIsError(true);
      setMessage(
        "A ação de libertação não está disponível."
      );
      return;
    }

    const reference = window.prompt(
      "Introduza a referência da transferência feita ao profissional:",
      ""
    );

    if (reference === null) return;

    if (!reference.trim()) {
      setIsError(true);
      setMessage(
        "A referência da transferência é obrigatória."
      );
      return;
    }

    const note = window.prompt(
      "Nota administrativa opcional:",
      ""
    );

    if (note === null) return;

    if (
      !window.confirm(
        `Confirma a libertação de ${money(
          payment.provider_amount,
          payment.currency
        )} para ${payment.provider_name_public}?`
      )
    ) {
      return;
    }

    try {
      setWorkingId(
        payment.pending_action_id
      );
      setMessage("");
      setIsError(false);

      const response = await apiFetch(
        user,
        `/api/marketplace/services/milestone-payment-actions/${payment.pending_action_id}/execute`,
        {
          method: "POST",
          body: JSON.stringify({
            external_reference:
              reference.trim(),
            note: note.trim() || null,
          }),
        }
      );

      const data =
        await responseData(response);

      setMessage(
        data.message ||
          "Libertação registada com sucesso."
      );

      await loadPayments(true);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível libertar o valor."
      );
    } finally {
      setWorkingId("");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Supervisão financeira
          </p>

          <h3 className="mt-2 text-xl font-black">
            Pagamentos das etapas
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Confirme entradas reais e execute
            libertações apenas depois de verificar
            a operação no banco ou PSP.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadPayments()
          }
          disabled={loading}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black disabled:opacity-50"
        >
          Atualizar
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-black">
            Ambiente
          </span>

          <select
            value={environment}
            onChange={(event) =>
              setEnvironment(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
          >
            <option value="">
              Todos
            </option>
            <option value="simulation">
              Teste
            </option>
            <option value="live">
              Real
            </option>
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-black">
            Estado
          </span>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
          >
            <option value="">
              Todos
            </option>
            <option value="pending">
              A aguardar confirmação
            </option>
            <option value="protected">
              Protegido
            </option>
            <option value="release_pending">
              Libertação pendente
            </option>
            <option value="released">
              Libertado
            </option>
            <option value="failed">
              Falhou
            </option>
            <option value="cancelled">
              Cancelado
            </option>
          </select>
        </label>
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

      {loading ? (
        <div className="mt-6 rounded-xl bg-slate-50 p-8 text-center text-slate-600">
          A carregar operações…
        </div>
      ) : payments.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
          Não existem operações com estes filtros.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {payments.map((payment) => {
            const isSimulation =
              payment.environment ===
              "simulation";

            const canConfirm =
              !isSimulation &&
              payment.status === "pending";

            const canRelease =
              !isSimulation &&
              payment.status ===
                "release_pending" &&
              payment.pending_action_id &&
              payment.pending_action_type ===
                "release";

            const working =
              workingId === payment.id ||
              workingId ===
                payment.pending_action_id;

            return (
              <article
                key={payment.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                      {payment.request_number}
                    </p>

                    <h4 className="mt-1 font-black">
                      Etapa{" "}
                      {payment.sequence_number}:{" "}
                      {payment.milestone_title}
                    </h4>

                    <p className="mt-1 text-sm text-slate-600">
                      {payment.request_title}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Profissional:{" "}
                      <strong>
                        {
                          payment.provider_name_public
                        }
                      </strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        isSimulation
                          ? "bg-amber-100 text-amber-900"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isSimulation
                        ? "TESTE"
                        : "REAL"}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                      {statusLabel(
                        payment.status
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <span className="block text-xs text-slate-500">
                      Pago pelo cliente
                    </span>
                    <strong>
                      {money(
                        payment.amount,
                        payment.currency
                      )}
                    </strong>
                  </div>

                  <div>
                    <span className="block text-xs text-slate-500">
                      Para o profissional
                    </span>
                    <strong>
                      {money(
                        payment.provider_amount,
                        payment.currency
                      )}
                    </strong>
                  </div>

                  <div>
                    <span className="block text-xs text-slate-500">
                      Comissão Nazunga
                    </span>
                    <strong>
                      {money(
                        payment.platform_fee,
                        payment.currency
                      )}
                    </strong>
                  </div>

                  <div>
                    <span className="block text-xs text-slate-500">
                      Criado
                    </span>
                    <strong className="text-sm">
                      {formatDate(
                        payment.created_at
                      )}
                    </strong>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-white p-4 text-sm">
                  <p>
                    Estado da etapa:{" "}
                    <strong>
                      {statusLabel(
                        payment.milestone_status
                      )}
                    </strong>
                  </p>

                  <p className="mt-1">
                    Referência:{" "}
                    <strong>
                      {payment.external_reference ||
                        "Por registar"}
                    </strong>
                  </p>
                </div>

                {isSimulation && (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
                    Operação de teste — nenhum
                    dinheiro real foi movimentado.
                  </p>
                )}

                {canConfirm && (
                  <button
                    type="button"
                    disabled={working}
                    onClick={() =>
                      void confirmPayment(
                        payment
                      )
                    }
                    className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                  >
                    {working
                      ? "A confirmar…"
                      : "Confirmar valor recebido"}
                  </button>
                )}

                {canRelease && (
                  <button
                    type="button"
                    disabled={working}
                    onClick={() =>
                      void executeRelease(
                        payment
                      )
                    }
                    className="mt-4 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                  >
                    {working
                      ? "A libertar…"
                      : "Confirmar transferência ao profissional"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
