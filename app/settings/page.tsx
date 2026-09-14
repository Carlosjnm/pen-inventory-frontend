"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Organization = {
  id: string;
  name: string;
  code: string;
  base_currency: string;
  default_language: string;
  is_active: boolean;
};

type Setting = {
  setting_key: string;
  setting_value: unknown;
  description: string | null;
  is_system: boolean;
};

export default function SettingsPage() {
  const [organization, setOrganization] =
    useState<Organization | null>(null);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [reorderLevel, setReorderLevel] = useState("5");
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState("cash");
  const [businessName, setBusinessName] = useState("PEN");
  const [businessSubtitle, setBusinessSubtitle] = useState("Inventário e Vendas");
  const [businessTaxNumber, setBusinessTaxNumber] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("Obrigado pela sua compra.");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState<"upload" | "delete" | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      try {
        setLoading(true);
        setMessage("");

        const token = await user.getIdToken();

        const response = await fetch(`${API_URL}/api/settings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load settings.");
        }

        const data = await response.json();

        setOrganization(data.organization || null);
        setSettings(data.settings || []);

        const reorderSetting = (data.settings || []).find(
          (setting: Setting) =>
            setting.setting_key === "default_reorder_level"
        );

        if (reorderSetting) {
          setReorderLevel(String(reorderSetting.setting_value));
        }

        const paymentSetting = (data.settings || []).find(
          (setting: Setting) =>
            setting.setting_key === "default_payment_method"
        );

        if (paymentSetting) {
          setDefaultPaymentMethod(String(paymentSetting.setting_value));
        }

        const settingMap = Object.fromEntries(
          (data.settings || []).map((setting: Setting) => [
            setting.setting_key,
            setting.setting_value,
          ])
        );

        setBusinessName(String(settingMap.business_name ?? "PEN"));
        setBusinessSubtitle(
          String(settingMap.business_subtitle ?? "Inventário e Vendas")
        );
        setBusinessTaxNumber(String(settingMap.business_tax_number ?? ""));
        setBusinessPhone(String(settingMap.business_phone ?? ""));
        setBusinessEmail(String(settingMap.business_email ?? ""));
        setBusinessAddress(String(settingMap.business_address ?? ""));
        setReceiptFooter(
          String(
            settingMap.receipt_footer ??
              "Obrigado pela sua compra."
          )
        );

        const logoResponse = await fetch(
          `${API_URL}/api/settings/business-logo`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          setBusinessLogoUrl(URL.createObjectURL(logoBlob));
        } else if (logoResponse.status === 404) {
          setBusinessLogoUrl(null);
        } else {
          console.error("Unable to load business logo.");
        }
      } catch (error) {
        console.error(error);
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load settings."
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function saveReorderLevel() {
    const value = Number(reorderLevel);

    if (!Number.isInteger(value) || value < 0) {
      setMessage("O nível predefinido de reposição deve ser um número inteiro igual ou superior a 0.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setMessage("Authentication required.");
      return;
    }

    try {
      setSavingKey("default_reorder_level");
      setMessage("");

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/settings/default_reorder_level`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            setting_value: value,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to save setting.");
      }

      setSettings((current) =>
        current.map((setting) =>
          setting.setting_key === "default_reorder_level"
            ? data.setting
            : setting
        )
      );

      setReorderLevel(String(data.setting.setting_value));
      setMessage("Nível predefinido de reposição guardado com sucesso.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save setting."
      );
    } finally {
      setSavingKey(null);
    }
  }

  async function saveDefaultPaymentMethod() {
    const user = auth.currentUser;

    if (!user) {
      setMessage("Authentication required.");
      return;
    }

    try {
      setSavingKey("default_payment_method");
      setMessage("");

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/settings/default_payment_method`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            setting_value: defaultPaymentMethod,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to save default payment method."
        );
      }

      setSettings((current) =>
        current.map((setting) =>
          setting.setting_key === "default_payment_method"
            ? data.setting
            : setting
        )
      );

      setDefaultPaymentMethod(String(data.setting.setting_value));
      setMessage("Método de pagamento predefinido guardado com sucesso.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save default payment method."
      );
    } finally {
      setSavingKey(null);
    }
  }

  async function saveReceiptSetting(
    settingKey: string,
    value: string,
    successMessage: string
  ) {
    const user = auth.currentUser;

    if (!user) {
      setMessage("Authentication required.");
      return;
    }

    try {
      setSavingKey(settingKey);
      setMessage("");

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/settings/${settingKey}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            setting_value: value,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to save receipt setting."
        );
      }

      setSettings((current) =>
        current.map((setting) =>
          setting.setting_key === settingKey
            ? data.setting
            : setting
        )
      );

      setMessage(successMessage);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save receipt setting."
      );
    } finally {
      setSavingKey(null);
    }
  }

  async function uploadBusinessLogo(file: File) {
    const user = auth.currentUser;

    if (!user) {
      setMessage("Authentication required.");
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Please select a JPEG, PNG or WEBP image.");
      return;
    }

    if (file.size === 0) {
      setMessage("The selected logo file is empty.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("O logótipo da empresa deve ter 5 MB ou menos.");
      return;
    }

    try {
      setLogoBusy("upload");
      setMessage("");

      const token = await user.getIdToken();

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/api/settings/business-logo`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to upload business logo."
        );
      }

      const logoResponse = await fetch(
        `${API_URL}/api/settings/business-logo`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (!logoResponse.ok) {
        throw new Error("O logótipo foi carregado, mas não foi possível carregar a pré-visualização.");
      }

      const logoBlob = await logoResponse.blob();
      const newLogoUrl = URL.createObjectURL(logoBlob);

      setBusinessLogoUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return newLogoUrl;
      });

      setMessage("Logótipo da empresa carregado com sucesso.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload business logo."
      );
    } finally {
      setLogoBusy(null);
    }
  }

  async function deleteBusinessLogo() {
    const user = auth.currentUser;

    if (!user) {
      setMessage("Authentication required.");
      return;
    }

    try {
      setLogoBusy("delete");
      setMessage("");

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/settings/business-logo`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to remove business logo."
        );
      }

      setBusinessLogoUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return null;
      });

      setMessage("Logótipo da empresa removido com sucesso.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to remove business logo."
      );
    } finally {
      setLogoBusy(null);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  function formatValue(value: unknown) {
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (Array.isArray(value)) {
      return value.join(", ");
    }

    if (value === null || value === undefined) {
      return "—";
    }

    return String(value);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-700">
        A carregar definições...
      </main>
    );
  }

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
          <NavItem label="Utilizadores" icon="♧" href="/users" />
          <NavItem label="Definições" icon="⚙" active href="/settings" />
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
          <div className="flex h-20 items-center justify-between px-4 md:px-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                Definições
              </h1>
              <p className="text-sm text-slate-500">
                Configuração da organização e do sistema
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"
            >
              Terminar Sessão
            </button>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <div className="mx-auto max-w-6xl">

        {message && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {message}
          </div>
        )}

        {organization && (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Organization
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Nome
                </div>
                <div className="mt-1 font-medium text-slate-950">
                  {organization.name}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Code
                </div>
                <div className="mt-1 font-medium text-slate-950">
                  {organization.code}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Moeda Base
                </div>
                <div className="mt-1 font-medium text-slate-950">
                  {organization.base_currency}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Idioma Predefinido
                </div>
                <div className="mt-1 font-medium text-slate-950">
                  {organization.default_language.toUpperCase()}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Logótipo da Empresa
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Logótipo utilizado em recibos e documentos da empresa.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-32 w-48 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4">
              {businessLogoUrl ? (
                <img
                  src={businessLogoUrl}
                  alt="Logótipo da empresa"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-sm text-slate-400">
                  No logo uploaded
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap gap-3">
                <label
                  className={`inline-flex cursor-pointer items-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white ${
                    logoBusy ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  {logoBusy === "upload"
                    ? "A carregar..."
                    : businessLogoUrl
                      ? "Substituir Logótipo"
                      : "Carregar Logótipo"}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={logoBusy !== null}
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (file) {
                        void uploadBusinessLogo(file);
                      }

                      event.currentTarget.value = "";
                    }}
                  />
                </label>

                {businessLogoUrl && (
                  <button
                    type="button"
                    onClick={() => void deleteBusinessLogo()}
                    disabled={logoBusy !== null}
                    className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {logoBusy === "delete"
                      ? "A remover..."
                      : "Remover Logótipo"}
                  </button>
                )}
              </div>

              <p className="mt-3 text-xs text-slate-500">
                JPEG, PNG or WEBP. Maximum file size: 5 MB.
              </p>

              <p className="mt-1 text-xs text-slate-400">
                For best receipt quality, use a logo with a transparent or white background.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-950">
              Definições do Sistema
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Valores atuais de configuração desta organização
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {settings
              .filter(
                (setting) =>
                  ![
                    "business_logo_bucket",
                    "business_logo_object_key",
                  ].includes(setting.setting_key)
              )
              .map((setting) => (
              <div
                key={setting.setting_key}
                className="grid gap-3 px-6 py-5 md:grid-cols-[1.4fr_1fr_auto]"
              >
                <div>
                  <div className="font-medium text-slate-950">
                    {setting.setting_key
                      .split("_")
                      .map(
                        (part) =>
                          part.charAt(0).toUpperCase() +
                          part.slice(1)
                      )
                      .join(" ")}
                  </div>

                  {setting.description && (
                    <div className="mt-1 text-sm text-slate-500">
                      {setting.description}
                    </div>
                  )}
                </div>

                <div className="font-medium text-slate-700">
                  {setting.setting_key === "default_reorder_level" ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={reorderLevel}
                        onChange={(event) =>
                          setReorderLevel(event.target.value)
                        }
                        className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-500"
                      />

                      <button
                        type="button"
                        onClick={saveReorderLevel}
                        disabled={savingKey === "default_reorder_level"}
                        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {savingKey === "default_reorder_level"
                          ? "A guardar..."
                          : "Guardar"}
                      </button>
                    </div>
                  ) : setting.setting_key === "default_payment_method" ? (
                    <div className="flex items-center gap-3">
                      <select
                        value={defaultPaymentMethod}
                        onChange={(event) =>
                          setDefaultPaymentMethod(event.target.value)
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-500"
                      >
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="multicaixa">Multicaixa</option>
                        <option value="card">Card</option>
                        <option value="online">Online</option>
                        <option value="voucher">Voucher</option>
                        <option value="other">Other</option>
                      </select>

                      <button
                        type="button"
                        onClick={saveDefaultPaymentMethod}
                        disabled={savingKey === "default_payment_method"}
                        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {savingKey === "default_payment_method"
                          ? "A guardar..."
                          : "Guardar"}
                      </button>
                    </div>
                  ) : setting.setting_key === "business_name" ? (
                    <SettingTextEditor
                      value={businessName}
                      onChange={setBusinessName}
                      onSave={() =>
                        saveReceiptSetting(
                          "business_name",
                          businessName,
                          "Nome da empresa guardado com sucesso."
                        )
                      }
                      saving={savingKey === "business_name"}
                    />
                  ) : setting.setting_key === "business_subtitle" ? (
                    <SettingTextEditor
                      value={businessSubtitle}
                      onChange={setBusinessSubtitle}
                      onSave={() =>
                        saveReceiptSetting(
                          "business_subtitle",
                          businessSubtitle,
                          "Subtítulo da empresa guardado com sucesso."
                        )
                      }
                      saving={savingKey === "business_subtitle"}
                    />
                  ) : setting.setting_key === "business_tax_number" ? (
                    <SettingTextEditor
                      value={businessTaxNumber}
                      onChange={setBusinessTaxNumber}
                      onSave={() =>
                        saveReceiptSetting(
                          "business_tax_number",
                          businessTaxNumber,
                          "Número fiscal da empresa guardado com sucesso."
                        )
                      }
                      saving={savingKey === "business_tax_number"}
                    />
                  ) : setting.setting_key === "business_phone" ? (
                    <SettingTextEditor
                      value={businessPhone}
                      onChange={setBusinessPhone}
                      onSave={() =>
                        saveReceiptSetting(
                          "business_phone",
                          businessPhone,
                          "Telefone da empresa guardado com sucesso."
                        )
                      }
                      saving={savingKey === "business_phone"}
                    />
                  ) : setting.setting_key === "business_email" ? (
                    <SettingTextEditor
                      value={businessEmail}
                      onChange={setBusinessEmail}
                      onSave={() =>
                        saveReceiptSetting(
                          "business_email",
                          businessEmail,
                          "Email da empresa guardado com sucesso."
                        )
                      }
                      saving={savingKey === "business_email"}
                    />
                  ) : setting.setting_key === "business_address" ? (
                    <SettingTextEditor
                      value={businessAddress}
                      onChange={setBusinessAddress}
                      onSave={() =>
                        saveReceiptSetting(
                          "business_address",
                          businessAddress,
                          "Endereço da empresa guardado com sucesso."
                        )
                      }
                      saving={savingKey === "business_address"}
                      multiline
                    />
                  ) : setting.setting_key === "receipt_footer" ? (
                    <SettingTextEditor
                      value={receiptFooter}
                      onChange={setReceiptFooter}
                      onSave={() =>
                        saveReceiptSetting(
                          "receipt_footer",
                          receiptFooter,
                          "Rodapé do recibo guardado com sucesso."
                        )
                      }
                      saving={savingKey === "receipt_footer"}
                      multiline
                    />
                  ) : (
                    formatValue(setting.setting_value)
                  )}
                </div>

                <div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      setting.is_system
                        ? "bg-slate-100 text-slate-600"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {setting.is_system ? "Sistema" : "Editável"}
                  </span>
                </div>
              </div>
            ))}

            {!settings.length && (
              <div className="px-6 py-10 text-center text-sm text-slate-400">
                Nenhuma definição encontrada.
              </div>
            )}
          </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({
  label,
  icon,
  active = false,
  href,
}: {
  label: string;
  icon: string;
  active?: boolean;
  href?: string;
}) {
  return (
    <div
      onClick={() => {
        if (href) window.location.href = href;
      }}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium ${
        active
          ? "bg-white text-slate-950"
          : href
          ? "cursor-pointer text-slate-400 transition hover:bg-white/10 hover:text-white"
          : "cursor-default text-slate-400"
      }`}
    >
      <span className="w-5 text-center text-base">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function SettingTextEditor({
  value,
  onChange,
  onSave,
  saving,
  multiline = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-500"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-500"
        />
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="shrink-0 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "A guardar..." : "Guardar"}
      </button>
    </div>
  );
}
