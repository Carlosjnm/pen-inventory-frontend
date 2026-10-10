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

type RetentionConfig = {
  enabled: boolean;
  retention_days: number;
};

type PurgeHistory = {
  id: string;
  request_number: string;
  messages_deleted: number;
  files_deleted: number;
  storage_objects_deleted: number;
  retention_days: number;
  status: "completed" | "failed";
  error_message: string | null;
  processed_at: string;
};

type RetentionResponse = {
  config: RetentionConfig;
  eligible_count: number;
  recent_purges: PurgeHistory[];
};

type ProcessResult = {
  dry_run: boolean;
  organizations_checked: number;
  requests_eligible: number;
  requests_purged: number;
  messages_deleted: number;
  files_deleted: number;
  storage_objects_deleted: number;
  errors: Array<{
    request_number: string;
    error: string;
  }>;
};

async function apiFetch(
  user: User,
  path: string,
  options: RequestInit = {}
) {
  const token = await user.getIdToken();

  const response = await fetch(
    `${API_URL}${path}`,
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

export default function ConversationRetentionControl({
  user,
}: {
  user: User;
}) {
  const [data, setData] =
    useState<RetentionResponse | null>(null);
  const [enabled, setEnabled] =
    useState(false);
  const [days, setDays] =
    useState(30);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [processing, setProcessing] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");
  const [simulation, setSimulation] =
    useState<ProcessResult | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const result = await apiFetch(
        user,
        "/api/marketplace/services/conversation-retention"
      );

      setData(result);
      setEnabled(
        Boolean(result.config?.enabled)
      );
      setDays(
        Number(
          result.config?.retention_days || 30
        )
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Erro ao carregar a retenção."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [user]);

  async function saveConfig(
    event: FormEvent
  ) {
    event.preventDefault();

    if (days < 7 || days > 365) {
      setError(
        "O prazo deve estar entre 7 e 365 dias."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await apiFetch(
        user,
        "/api/marketplace/services/conversation-retention",
        {
          method: "PATCH",
          body: JSON.stringify({
            enabled,
            retention_days: days,
          }),
        }
      );

      setMessage(
        enabled
          ? `Limpeza automática ativada para ${days} dias.`
          : "Limpeza automática desativada."
      );

      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro ao guardar."
      );
    } finally {
      setSaving(false);
    }
  }

  async function simulate() {
    try {
      setProcessing(true);
      setError("");
      setMessage("");
      setSimulation(null);

      const result = await apiFetch(
        user,
        "/api/marketplace/services/conversation-retention/process?dry_run=true&limit=100",
        {
          method: "POST",
        }
      );

      setSimulation(result);
      setMessage(
        `Simulação concluída: ${result.requests_eligible} conversa(s) elegível(eis). Nada foi apagado.`
      );
    } catch (processError) {
      setError(
        processError instanceof Error
          ? processError.message
          : "Erro na simulação."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function processNow() {
    if (!enabled) {
      setError(
        "Ative e guarde primeiro a limpeza automática."
      );
      return;
    }

    const confirmed = window.confirm(
      "Confirma a limpeza definitiva das conversas elegíveis? As mensagens e fotografias eliminadas não poderão ser recuperadas."
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setMessage("");

      const result = await apiFetch(
        user,
        "/api/marketplace/services/conversation-retention/process?dry_run=false&limit=25",
        {
          method: "POST",
        }
      );

      setSimulation(result);

      setMessage(
        `Limpeza concluída: ${result.requests_purged} conversa(s), ${result.messages_deleted} mensagem(ns) e ${result.files_deleted} fotografia(s) removidas.`
      );

      await loadData();
    } catch (processError) {
      setError(
        processError instanceof Error
          ? processError.message
          : "Erro durante a limpeza."
      );
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
        A carregar retenção das conversas...
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-950 to-indigo-900 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">
          Privacidade e armazenamento
        </p>

        <h3 className="mt-2 text-2xl font-black">
          Retenção das conversas
        </h3>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">
          Elimina apenas mensagens e fotografias
          privadas depois do prazo definido. Pedidos,
          orçamentos, etapas, pagamentos, comissões
          e auditoria permanecem guardados.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {message}
        </div>
      )}

      <form
        onSubmit={saveConfig}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h4 className="text-xl font-black">
              Limpeza automática
            </h4>

            <p className="mt-1 text-sm text-slate-600">
              Estado atual:{" "}
              <strong
                className={
                  enabled
                    ? "text-emerald-700"
                    : "text-slate-700"
                }
              >
                {enabled
                  ? "Ativada"
                  : "Desativada"}
              </strong>
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) =>
                setEnabled(
                  event.target.checked
                )
              }
              className="h-5 w-5 accent-emerald-700"
            />

            <span className="font-bold">
              Permitir limpeza automática
            </span>
          </label>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="block">
            <span className="text-sm font-bold text-slate-800">
              Dias após a conclusão
            </span>

            <input
              type="number"
              min={7}
              max={365}
              value={days}
              onChange={(event) =>
                setDays(
                  Number(event.target.value)
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200"
            />

            <span className="mt-2 block text-xs text-slate-500">
              Recomendado: 30 dias. Permitido:
              7 a 365 dias.
            </span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-violet-700 px-6 py-3 font-black text-white hover:bg-violet-800 disabled:opacity-50"
          >
            {saving
              ? "A guardar..."
              : "Guardar configuração"}
          </button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Elegíveis agora
          </p>
          <p className="mt-2 text-3xl font-black text-violet-800">
            {data?.eligible_count || 0}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Prazo configurado
          </p>
          <p className="mt-2 text-3xl font-black">
            {data?.config.retention_days || 30}
            <span className="ml-2 text-base text-slate-500">
              dias
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Proteções
          </p>
          <p className="mt-2 text-sm font-bold text-emerald-700">
            Disputas e pagamentos pendentes
            bloqueiam a limpeza
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h4 className="text-lg font-black text-amber-950">
          Verificação e execução
        </h4>

        <p className="mt-2 text-sm leading-6 text-amber-900">
          A simulação nunca elimina dados. Utilize-a
          antes de executar uma limpeza manual.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={simulate}
            disabled={processing}
            className="rounded-xl border border-violet-300 bg-white px-5 py-3 font-black text-violet-900 disabled:opacity-50"
          >
            {processing
              ? "A processar..."
              : "Simular limpeza"}
          </button>

          <button
            type="button"
            onClick={processNow}
            disabled={
              processing ||
              !enabled ||
              !data?.eligible_count
            }
            className="rounded-xl bg-red-700 px-5 py-3 font-black text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Executar limpeza agora
          </button>
        </div>

        {simulation && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-white p-4 text-sm text-slate-700">
            <strong>
              {simulation.dry_run
                ? "Resultado da simulação"
                : "Resultado da execução"}
            </strong>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <span>
                Elegíveis:{" "}
                <b>
                  {simulation.requests_eligible}
                </b>
              </span>
              <span>
                Eliminadas:{" "}
                <b>
                  {simulation.requests_purged}
                </b>
              </span>
              <span>
                Mensagens:{" "}
                <b>
                  {simulation.messages_deleted}
                </b>
              </span>
              <span>
                Fotografias:{" "}
                <b>
                  {simulation.files_deleted}
                </b>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-xl font-black">
          Histórico recente
        </h4>

        <div className="mt-5 space-y-3">
          {(data?.recent_purges || []).map(
            (item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black">
                      {item.request_number}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(
                        item.processed_at
                      ).toLocaleString("pt-AO")}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      item.status === "completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {item.status === "completed"
                      ? "Concluída"
                      : "Falhou"}
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-600">
                  {item.messages_deleted} mensagem(ns),{" "}
                  {item.files_deleted} fotografia(s),{" "}
                  prazo de {item.retention_days} dias.
                </p>

                {item.error_message && (
                  <p className="mt-2 text-sm font-bold text-red-700">
                    {item.error_message}
                  </p>
                )}
              </article>
            )
          )}

          {!data?.recent_purges?.length && (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Ainda não existem limpezas registadas.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
