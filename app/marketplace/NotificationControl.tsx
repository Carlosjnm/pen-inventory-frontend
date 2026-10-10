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

type Mode =
  | "disabled"
  | "simulation"
  | "live";

type NotificationConfig = {
  master_enabled: boolean;
  in_app_enabled: boolean;

  whatsapp_mode: Mode;
  email_mode: Mode;
  sms_mode: Mode;
  push_mode: Mode;

  whatsapp_provider: string | null;
  whatsapp_sender_label: string | null;
  whatsapp_account_reference: string | null;
  whatsapp_account_configured: boolean;
  whatsapp_compliance_confirmed: boolean;

  email_provider: string | null;
  email_sender_address: string | null;
  email_account_configured: boolean;

  sms_provider: string | null;
  sms_sender_label: string | null;
  sms_account_configured: boolean;

  push_provider: string | null;
  push_account_configured: boolean;

  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  maximum_attempts: number;
};

type NotificationEvent = {
  id: string;
  event_type: string;
  display_name: string;
  in_app_enabled: boolean;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  customer_enabled: boolean;
  provider_enabled: boolean;
  admin_enabled: boolean;
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

function modeLabel(mode: Mode) {
  if (mode === "live") return "Ativo";
  if (mode === "simulation") {
    return "Simulação";
  }
  return "Desativado";
}

function modeClasses(mode: Mode) {
  if (mode === "live") {
    return "border-emerald-300 bg-emerald-50 text-emerald-900";
  }

  if (mode === "simulation") {
    return "border-amber-300 bg-amber-50 text-amber-900";
  }

  return "border-slate-300 bg-slate-50 text-slate-700";
}

export default function NotificationControl({
  user,
}: {
  user: User;
}) {
  const [config, setConfig] =
    useState<NotificationConfig | null>(null);

  const [events, setEvents] =
    useState<NotificationEvent[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");

      const response = await apiFetch(
        user,
        "/api/marketplace/notifications/config"
      );

      const data =
        await responseData(response);

      setConfig(data.config);
      setEvents(data.events || []);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao carregar notificações."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function saveConfig(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!config) return;

    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch(
        user,
        "/api/marketplace/notifications/config",
        {
          method: "PATCH",
          body: JSON.stringify({
            master_enabled:
              config.master_enabled,
            in_app_enabled:
              config.in_app_enabled,

            whatsapp_mode:
              config.whatsapp_mode,
            email_mode:
              config.email_mode,
            sms_mode:
              config.sms_mode,
            push_mode:
              config.push_mode,

            whatsapp_provider:
              config.whatsapp_provider || null,
            whatsapp_sender_label:
              config.whatsapp_sender_label ||
              null,
            whatsapp_account_reference:
              config
                .whatsapp_account_reference ||
              null,
            whatsapp_account_configured:
              config
                .whatsapp_account_configured,
            whatsapp_compliance_confirmed:
              config
                .whatsapp_compliance_confirmed,

            email_provider:
              config.email_provider || null,
            email_sender_address:
              config.email_sender_address ||
              null,
            email_account_configured:
              config.email_account_configured,

            sms_provider:
              config.sms_provider || null,
            sms_sender_label:
              config.sms_sender_label || null,
            sms_account_configured:
              config.sms_account_configured,

            push_provider:
              config.push_provider || null,
            push_account_configured:
              config.push_account_configured,

            quiet_hours_enabled:
              config.quiet_hours_enabled,
            quiet_hours_start:
              config.quiet_hours_start || null,
            quiet_hours_end:
              config.quiet_hours_end || null,
            maximum_attempts:
              Number(
                config.maximum_attempts
              ),
          }),
        }
      );

      const data =
        await responseData(response);

      setConfig(data.config);
      setIsError(false);
      setMessage(
        "Configuração das notificações guardada."
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao guardar notificações."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateEvent(
    notificationEvent: NotificationEvent,
    field: keyof NotificationEvent,
    value: boolean
  ) {
    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch(
        user,
        `/api/marketplace/notifications/events/${notificationEvent.event_type}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            [field]: value,
          }),
        }
      );

      const data =
        await responseData(response);

      setEvents((current) =>
        current.map((item) =>
          item.event_type ===
          notificationEvent.event_type
            ? data.event
            : item
        )
      );

      setIsError(false);
      setMessage(
        `Alerta “${notificationEvent.display_name}” atualizado.`
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar o alerta."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
        A carregar controlo das notificações...
      </div>
    );
  }

  if (!config) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        Não foi possível carregar a configuração.
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <form
        onSubmit={saveConfig}
        className="space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                Controlo central
              </p>

              <h3 className="mt-2 text-2xl font-black">
                Notificações da Nazunga
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                O interruptor geral bloqueia todos
                os novos alertas. Os canais podem
                ser configurados separadamente.
              </p>
            </div>

            <label
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-5 py-4 font-black ${
                config.master_enabled
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-red-300 bg-red-50 text-red-900"
              }`}
            >
              <input
                type="checkbox"
                checked={
                  config.master_enabled
                }
                onChange={(event) =>
                  setConfig({
                    ...config,
                    master_enabled:
                      event.target.checked,
                  })
                }
                className="h-5 w-5"
              />

              {config.master_enabled
                ? "Sistema ativo"
                : "Sistema desativado"}
            </label>
          </div>

          {!config.master_enabled && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
              Nenhum novo alerta será criado enquanto
              o sistema estiver desativado.
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ChannelCard
            title="Dentro da Nazunga"
            description="Alertas apresentados no portal e no painel."
            mode={
              config.in_app_enabled
                ? "live"
                : "disabled"
            }
          >
            <Check
              label="Ativar alertas internos"
              checked={
                config.in_app_enabled
              }
              onChange={(checked) =>
                setConfig({
                  ...config,
                  in_app_enabled: checked,
                })
              }
            />
          </ChannelCard>

          <ChannelCard
            title="WhatsApp"
            description="Avisos sem revelar os números entre as partes."
            mode={config.whatsapp_mode}
          >
            <ModeSelect
              value={config.whatsapp_mode}
              onChange={(value) =>
                setConfig({
                  ...config,
                  whatsapp_mode: value,
                })
              }
            />

            <TextInput
              label="Fornecedor"
              placeholder="Meta Cloud API, Twilio..."
              value={
                config.whatsapp_provider ||
                ""
              }
              onChange={(value) =>
                setConfig({
                  ...config,
                  whatsapp_provider: value,
                })
              }
            />

            <TextInput
              label="Nome do remetente"
              placeholder="Nazunga"
              value={
                config
                  .whatsapp_sender_label ||
                ""
              }
              onChange={(value) =>
                setConfig({
                  ...config,
                  whatsapp_sender_label:
                    value,
                })
              }
            />

            <TextInput
              label="Referência da conta"
              placeholder="ID ou número empresarial"
              value={
                config
                  .whatsapp_account_reference ||
                ""
              }
              onChange={(value) =>
                setConfig({
                  ...config,
                  whatsapp_account_reference:
                    value,
                })
              }
            />

            <Check
              label="Conta configurada"
              checked={
                config
                  .whatsapp_account_configured
              }
              onChange={(checked) =>
                setConfig({
                  ...config,
                  whatsapp_account_configured:
                    checked,
                })
              }
            />

            <Check
              label="Conformidade confirmada"
              checked={
                config
                  .whatsapp_compliance_confirmed
              }
              onChange={(checked) =>
                setConfig({
                  ...config,
                  whatsapp_compliance_confirmed:
                    checked,
                })
              }
            />
          </ChannelCard>

          <ChannelCard
            title="Email"
            description="Avisos enviados pelo endereço oficial."
            mode={config.email_mode}
          >
            <ModeSelect
              value={config.email_mode}
              onChange={(value) =>
                setConfig({
                  ...config,
                  email_mode: value,
                })
              }
            />

            <TextInput
              label="Fornecedor"
              placeholder="SendGrid, Mailgun..."
              value={
                config.email_provider || ""
              }
              onChange={(value) =>
                setConfig({
                  ...config,
                  email_provider: value,
                })
              }
            />

            <TextInput
              label="Email remetente"
              placeholder="avisos@nazunga.com"
              value={
                config.email_sender_address ||
                ""
              }
              onChange={(value) =>
                setConfig({
                  ...config,
                  email_sender_address:
                    value,
                })
              }
            />

            <Check
              label="Conta configurada"
              checked={
                config.email_account_configured
              }
              onChange={(checked) =>
                setConfig({
                  ...config,
                  email_account_configured:
                    checked,
                })
              }
            />
          </ChannelCard>

          <ChannelCard
            title="SMS"
            description="Canal alternativo para alertas urgentes."
            mode={config.sms_mode}
          >
            <ModeSelect
              value={config.sms_mode}
              onChange={(value) =>
                setConfig({
                  ...config,
                  sms_mode: value,
                })
              }
            />

            <TextInput
              label="Fornecedor"
              placeholder="Fornecedor SMS"
              value={
                config.sms_provider || ""
              }
              onChange={(value) =>
                setConfig({
                  ...config,
                  sms_provider: value,
                })
              }
            />

            <TextInput
              label="Nome do remetente"
              placeholder="Nazunga"
              value={
                config.sms_sender_label || ""
              }
              onChange={(value) =>
                setConfig({
                  ...config,
                  sms_sender_label: value,
                })
              }
            />

            <Check
              label="Conta configurada"
              checked={
                config.sms_account_configured
              }
              onChange={(checked) =>
                setConfig({
                  ...config,
                  sms_account_configured:
                    checked,
                })
              }
            />
          </ChannelCard>

          <ChannelCard
            title="Push"
            description="Notificações no telefone ou navegador."
            mode={config.push_mode}
          >
            <ModeSelect
              value={config.push_mode}
              onChange={(value) =>
                setConfig({
                  ...config,
                  push_mode: value,
                })
              }
            />

            <TextInput
              label="Fornecedor"
              placeholder="Firebase Cloud Messaging"
              value={
                config.push_provider || ""
              }
              onChange={(value) =>
                setConfig({
                  ...config,
                  push_provider: value,
                })
              }
            />

            <Check
              label="Conta configurada"
              checked={
                config.push_account_configured
              }
              onChange={(checked) =>
                setConfig({
                  ...config,
                  push_account_configured:
                    checked,
                })
              }
            />
          </ChannelCard>

          <ChannelCard
            title="Horário e tentativas"
            description="Limites aplicados aos canais externos."
            mode={
              config.quiet_hours_enabled
                ? "simulation"
                : "disabled"
            }
          >
            <Check
              label="Respeitar horário silencioso"
              checked={
                config.quiet_hours_enabled
              }
              onChange={(checked) =>
                setConfig({
                  ...config,
                  quiet_hours_enabled:
                    checked,
                })
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label="Início"
                type="time"
                value={
                  config.quiet_hours_start ||
                  ""
                }
                onChange={(value) =>
                  setConfig({
                    ...config,
                    quiet_hours_start:
                      value,
                  })
                }
              />

              <TextInput
                label="Fim"
                type="time"
                value={
                  config.quiet_hours_end ||
                  ""
                }
                onChange={(value) =>
                  setConfig({
                    ...config,
                    quiet_hours_end: value,
                  })
                }
              />
            </div>

            <TextInput
              label="Máximo de tentativas"
              type="number"
              value={String(
                config.maximum_attempts
              )}
              onChange={(value) =>
                setConfig({
                  ...config,
                  maximum_attempts:
                    Number(value),
                })
              }
            />
          </ChannelCard>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-emerald-800 px-6 py-3 font-black text-white disabled:opacity-50"
        >
          {saving
            ? "A guardar..."
            : "Guardar configuração geral"}
        </button>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black">
          Alertas por acontecimento
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Escolha quem recebe cada alerta e por
          quais canais. As alterações são guardadas
          imediatamente.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">
                  Acontecimento
                </th>
                <th className="px-3 py-3">
                  Nazunga
                </th>
                <th className="px-3 py-3">
                  WhatsApp
                </th>
                <th className="px-3 py-3">
                  Email
                </th>
                <th className="px-3 py-3">
                  SMS
                </th>
                <th className="px-3 py-3">
                  Push
                </th>
                <th className="px-3 py-3">
                  Cliente
                </th>
                <th className="px-3 py-3">
                  Profissional
                </th>
                <th className="px-3 py-3">
                  Admin
                </th>
              </tr>
            </thead>

            <tbody>
              {events.map((item) => (
                <tr
                  key={item.event_type}
                  className="border-b border-slate-100"
                >
                  <td className="px-3 py-4 font-bold">
                    {item.display_name}
                  </td>

                  {[
                    "in_app_enabled",
                    "whatsapp_enabled",
                    "email_enabled",
                    "sms_enabled",
                    "push_enabled",
                    "customer_enabled",
                    "provider_enabled",
                    "admin_enabled",
                  ].map((field) => (
                    <td
                      key={field}
                      className="px-3 py-4"
                    >
                      <input
                        type="checkbox"
                        disabled={saving}
                        checked={Boolean(
                          item[
                            field as keyof NotificationEvent
                          ]
                        )}
                        onChange={(event) =>
                          void updateEvent(
                            item,
                            field as keyof NotificationEvent,
                            event.target.checked
                          )
                        }
                        className="h-5 w-5"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ChannelCard({
  title,
  description,
  mode,
  children,
}: {
  title: string;
  description: string;
  mode: Mode;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-black">
            {title}
          </h4>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${modeClasses(
            mode
          )}`}
        >
          {modeLabel(mode)}
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {children}
      </div>
    </article>
  );
}

function ModeSelect({
  value,
  onChange,
}: {
  value: Mode;
  onChange: (value: Mode) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase text-slate-500">
        Estado do canal
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value as Mode
          )
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-950"
      >
        <option value="disabled">
          Desativado
        </option>
        <option value="simulation">
          Simulação
        </option>
        <option value="live">
          Ativo
        </option>
      </select>
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase text-slate-500">
        {label}
      </span>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400"
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
