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

type PaymentMode =
  | "disabled"
  | "simulation"
  | "live";

type ProtectedPaymentConfig = {
  mode: PaymentMode;
  enabled: boolean;
  is_simulation: boolean;
  is_live: boolean;
  provider: string | null;
  account_label: string | null;
  account_reference: string | null;
  account_configured: boolean;
  compliance_confirmed: boolean;
  currency: string;
  auto_release_enabled: boolean;
  auto_release_hours: number;
  dispute_window_hours: number;
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

export default function ProtectedPaymentControl({
  user,
}: {
  user: User;
}) {
  const [config, setConfig] =
    useState<ProtectedPaymentConfig | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [isError, setIsError] =
    useState(false);

  useEffect(() => {
    void loadConfig();
  }, [user]);

  async function loadConfig() {
    try {
      setLoading(true);
      setMessage("");

      const response = await apiFetch(
        user,
        "/api/marketplace/services/protected-payments/config"
      );

      const data = await responseData(response);
      setConfig(data.config);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao carregar a configuração."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!config) return;

    if (
      config.mode === "live" &&
      !window.confirm(
        "Confirma a ativação do modo real? " +
        "Este modo só deve ser usado com uma conta " +
        "dedicada e autorização do banco/PSP."
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch(
        user,
        "/api/marketplace/services/protected-payments/config",
        {
          method: "PATCH",
          body: JSON.stringify({
            mode: config.mode,
            provider:
              config.provider || null,
            account_label:
              config.account_label || null,
            account_reference:
              config.account_reference || null,
            account_configured:
              config.account_configured,
            compliance_confirmed:
              config.compliance_confirmed,
            currency: config.currency,
            auto_release_enabled:
              config.auto_release_enabled,
            auto_release_hours:
              Number(
                config.auto_release_hours
              ),
            dispute_window_hours:
              Number(
                config.dispute_window_hours
              ),
          }),
        }
      );

      const data = await responseData(response);
      setConfig(data.config);
      setIsError(false);

      setMessage(
        data.config.mode === "disabled"
          ? "Pagamento Protegido desativado."
          : data.config.mode === "simulation"
            ? "Modo de demonstração ativado. Nenhum dinheiro real será movimentado."
            : "Modo real ativado."
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
        A carregar Pagamento Protegido...
      </div>
    );
  }

  if (!config) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-6 font-bold text-red-800">
        Configuração indisponível.
      </div>
    );
  }

  const modeDetails = {
    disabled: {
      title: "Desativado",
      text:
        "O Pagamento Protegido não aparece para os clientes.",
      classes:
        "border-slate-300 bg-slate-100 text-slate-800",
    },
    simulation: {
      title: "Demonstração",
      text:
        "O fluxo funciona para testes e apresentações, mas não movimenta dinheiro real.",
      classes:
        "border-amber-300 bg-amber-50 text-amber-900",
    },
    live: {
      title: "Ativo",
      text:
        "Modo destinado a pagamentos reais através da conta dedicada e do banco/PSP configurado.",
      classes:
        "border-emerald-300 bg-emerald-50 text-emerald-900",
    },
  }[config.mode];

  return (
    <form
      onSubmit={saveConfig}
      className="space-y-6"
    >
      <section
        className={`rounded-2xl border p-6 ${modeDetails.classes}`}
      >
        <p className="text-xs font-black uppercase tracking-[0.2em]">
          Estado atual
        </p>

        <h3 className="mt-2 text-2xl font-black">
          {modeDetails.title}
        </h3>

        <p className="mt-2 max-w-3xl text-sm leading-6">
          {modeDetails.text}
        </p>
      </section>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-bold ${
            isError
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-emerald-300 bg-emerald-50 text-emerald-800"
          }`}
        >
          {message}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black">
          Modo de funcionamento
        </h3>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {(
            [
              [
                "disabled",
                "Desativado",
                "Não mostrar aos clientes.",
              ],
              [
                "simulation",
                "Demonstração",
                "Testar todo o fluxo sem dinheiro real.",
              ],
              [
                "live",
                "Ativo",
                "Utilizar a conta dedicada real.",
              ],
            ] as Array<
              [PaymentMode, string, string]
            >
          ).map(
            ([value, label, description]) => (
              <label
                key={value}
                className={`cursor-pointer rounded-2xl border-2 p-5 transition ${
                  config.mode === value
                    ? "border-emerald-700 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <input
                  type="radio"
                  name="protected-payment-mode"
                  value={value}
                  checked={
                    config.mode === value
                  }
                  onChange={() =>
                    setConfig({
                      ...config,
                      mode: value,
                    })
                  }
                  className="h-5 w-5"
                />

                <span className="mt-3 block font-black">
                  {label}
                </span>

                <span className="mt-1 block text-sm leading-5 text-slate-600">
                  {description}
                </span>
              </label>
            )
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black">
          Banco, PSP e conta dedicada
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Não introduza palavra-passe, PIN, token,
          número completo de cartão ou credenciais
          bancárias. Guarde apenas referências
          administrativas.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field
            label="Banco ou PSP"
            value={config.provider || ""}
            onChange={(value) =>
              setConfig({
                ...config,
                provider: value,
              })
            }
            placeholder="Ex.: Banco parceiro"
          />

          <Field
            label="Designação da conta"
            value={config.account_label || ""}
            onChange={(value) =>
              setConfig({
                ...config,
                account_label: value,
              })
            }
            placeholder="Ex.: Nazunga — fundos protegidos"
          />

          <Field
            label="Referência segura da conta"
            value={
              config.account_reference || ""
            }
            onChange={(value) =>
              setConfig({
                ...config,
                account_reference: value,
              })
            }
            placeholder="Ex.: final 4821 ou referência interna"
          />

          <Field
            label="Moeda"
            value={config.currency}
            onChange={(value) =>
              setConfig({
                ...config,
                currency:
                  value.toUpperCase(),
              })
            }
            placeholder="AOA"
          />
        </div>

        <div className="mt-6 space-y-4">
          <Check
            label="Confirmo que a conta dedicada está configurada"
            checked={config.account_configured}
            onChange={(checked) =>
              setConfig({
                ...config,
                account_configured: checked,
              })
            }
          />

          <Check
            label="Confirmo que o banco/PSP e o enquadramento jurídico foram validados"
            checked={
              config.compliance_confirmed
            }
            onChange={(checked) =>
              setConfig({
                ...config,
                compliance_confirmed: checked,
              })
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black">
          Libertação e disputas
        </h3>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field
            label="Prazo de libertação (horas)"
            type="number"
            value={String(
              config.auto_release_hours
            )}
            onChange={(value) =>
              setConfig({
                ...config,
                auto_release_hours:
                  Number(value),
              })
            }
          />

          <Field
            label="Prazo para disputa (horas)"
            type="number"
            value={String(
              config.dispute_window_hours
            )}
            onChange={(value) =>
              setConfig({
                ...config,
                dispute_window_hours:
                  Number(value),
              })
            }
          />
        </div>

        <div className="mt-6">
          <Check
            label="Permitir libertação automática no modo real"
            checked={
              config.auto_release_enabled
            }
            onChange={(checked) =>
              setConfig({
                ...config,
                auto_release_enabled: checked,
              })
            }
          />
        </div>

        {config.mode !== "live" && (
          <p className="mt-3 text-sm font-bold text-amber-800">
            A libertação automática permanece
            desligada fora do modo ativo.
          </p>
        )}
      </section>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-slate-950 px-6 py-3 font-black text-white disabled:opacity-50"
      >
        {saving
          ? "A guardar..."
          : "Guardar configuração"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black">
        {label}
      </span>

      <input
        type={type}
        value={value}
        min={type === "number" ? 0 : undefined}
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
    <label className="flex items-start gap-3 text-sm font-bold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="mt-0.5 h-5 w-5"
      />
      <span>{label}</span>
    </label>
  );
}
