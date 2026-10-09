"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import MobileNav from "@/components/MobileNav";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type HomeContent = {
  announcement_enabled: boolean;
  announcement_text: string;
  badge_enabled: boolean;
  badge_text: string;
  title: string;
  highlight: string;
  description: string;
  primary_button_enabled: boolean;
  primary_button_label: string;
  primary_button_url: string;
  secondary_button_enabled: boolean;
  secondary_button_label: string;
  secondary_button_url: string;
  cards_enabled: boolean;
  first_card_label: string;
  first_card_title: string;
  second_card_label: string;
  second_card_title: string;
  stats_enabled: boolean;
  stock_stat_title: string;
  stock_stat_subtitle: string;
};

const defaults: HomeContent = {
  announcement_enabled: true,
  announcement_text:
    "Compras locais · Stock real · Entregas coordenadas",
  badge_enabled: true,
  badge_text: "Marketplace angolano",
  title: "Tudo o que procura.",
  highlight: "Mais perto.",
  description:
    "Descubra lojas angolanas, encontre promoções e compre com informação de stock atualizada.",
  primary_button_enabled: true,
  primary_button_label: "Ver promoções",
  primary_button_url: "#promocoes",
  secondary_button_enabled: true,
  secondary_button_label: "Explorar lojas",
  secondary_button_url: "#lojas",
  cards_enabled: true,
  first_card_label: "Descobrir",
  first_card_title: "Marcas locais.",
  second_card_label: "Esta semana",
  second_card_title: "Novas promoções.",
  stats_enabled: true,
  stock_stat_title: "Stock real",
  stock_stat_subtitle: "Antes de encomendar",
};

export default function MarketplaceHomePage() {
  const [content, setContent] =
    useState<HomeContent>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          window.location.href = "/";
          return;
        }

        try {
          setLoading(true);
          const token = await user.getIdToken();

          const response = await fetch(
            `${API_URL}/api/settings`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              cache: "no-store",
            }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.detail ||
                "Não foi possível carregar a página."
            );
          }

          const setting = (
            data.settings || []
          ).find(
            (item: {
              setting_key: string;
              setting_value: unknown;
            }) =>
              item.setting_key ===
              "marketplace_home_content"
          );

          if (
            setting &&
            setting.setting_value &&
            typeof setting.setting_value === "object"
          ) {
            setContent({
              ...defaults,
              ...setting.setting_value,
            });
          }
        } catch (error) {
          setIsError(true);
          setMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar a página."
          );
        } finally {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  function update<K extends keyof HomeContent>(
    key: K,
    value: HomeContent[K]
  ) {
    setContent((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function save() {
    const user = auth.currentUser;

    if (!user) {
      setIsError(true);
      setMessage("Autenticação necessária.");
      return;
    }

    if (
      !content.title.trim() ||
      !content.highlight.trim() ||
      !content.description.trim()
    ) {
      setIsError(true);
      setMessage(
        "O título, destaque e descrição são obrigatórios."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setIsError(false);

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/settings/marketplace_home_content`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            setting_value: content,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Não foi possível guardar o conteúdo."
        );
      }

      setContent({
        ...defaults,
        ...data.setting.setting_value,
      });
      setMessage(
        "Página principal guardada com sucesso."
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar o conteúdo."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="font-semibold text-slate-600">
          A carregar página principal…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <MobileNav />
            <div>
              <h1 className="text-xl font-black">
                Página principal Nazunga
              </h1>
              <p className="text-sm text-slate-500">
                Conteúdo da apresentação pública
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/marketplace"
              className="hidden rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold hover:bg-slate-50 sm:inline-flex"
            >
              Voltar ao Marketplace
            </a>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {saving
                ? "A guardar…"
                : "Guardar alterações"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 lg:grid-cols-[1fr_0.9fr]">
        <section className="space-y-6">
          {message && (
            <div
              className={`rounded-2xl border px-5 py-4 text-sm font-semibold ${
                isError
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {message}
            </div>
          )}

          <EditorSection title="Faixa superior">
            <Toggle
              label="Mostrar faixa superior"
              checked={content.announcement_enabled}
              onChange={(value) =>
                update(
                  "announcement_enabled",
                  value
                )
              }
            />
            <TextField
              label="Texto da faixa"
              value={content.announcement_text}
              onChange={(value) =>
                update("announcement_text", value)
              }
            />
          </EditorSection>

          <EditorSection title="Título principal">
            <Toggle
              label="Mostrar etiqueta"
              checked={content.badge_enabled}
              onChange={(value) =>
                update("badge_enabled", value)
              }
            />
            <TextField
              label="Texto da etiqueta"
              value={content.badge_text}
              onChange={(value) =>
                update("badge_text", value)
              }
            />
            <TextField
              label="Título"
              value={content.title}
              onChange={(value) =>
                update("title", value)
              }
            />
            <TextField
              label="Texto em destaque"
              value={content.highlight}
              onChange={(value) =>
                update("highlight", value)
              }
            />
            <TextArea
              label="Descrição"
              value={content.description}
              onChange={(value) =>
                update("description", value)
              }
            />
          </EditorSection>

          <EditorSection title="Botões">
            <Toggle
              label="Mostrar botão principal"
              checked={
                content.primary_button_enabled
              }
              onChange={(value) =>
                update(
                  "primary_button_enabled",
                  value
                )
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Botão principal"
                value={
                  content.primary_button_label
                }
                onChange={(value) =>
                  update(
                    "primary_button_label",
                    value
                  )
                }
              />
              <TextField
                label="Ligação principal"
                value={
                  content.primary_button_url
                }
                onChange={(value) =>
                  update(
                    "primary_button_url",
                    value
                  )
                }
              />
            </div>

            <Toggle
              label="Mostrar botão secundário"
              checked={
                content.secondary_button_enabled
              }
              onChange={(value) =>
                update(
                  "secondary_button_enabled",
                  value
                )
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Botão secundário"
                value={
                  content.secondary_button_label
                }
                onChange={(value) =>
                  update(
                    "secondary_button_label",
                    value
                  )
                }
              />
              <TextField
                label="Ligação secundária"
                value={
                  content.secondary_button_url
                }
                onChange={(value) =>
                  update(
                    "secondary_button_url",
                    value
                  )
                }
              />
            </div>
          </EditorSection>

          <EditorSection title="Cartões laterais">
            <Toggle
              label="Mostrar cartões"
              checked={content.cards_enabled}
              onChange={(value) =>
                update("cards_enabled", value)
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Etiqueta do primeiro"
                value={content.first_card_label}
                onChange={(value) =>
                  update(
                    "first_card_label",
                    value
                  )
                }
              />
              <TextField
                label="Título do primeiro"
                value={content.first_card_title}
                onChange={(value) =>
                  update(
                    "first_card_title",
                    value
                  )
                }
              />
              <TextField
                label="Etiqueta do segundo"
                value={content.second_card_label}
                onChange={(value) =>
                  update(
                    "second_card_label",
                    value
                  )
                }
              />
              <TextField
                label="Título do segundo"
                value={content.second_card_title}
                onChange={(value) =>
                  update(
                    "second_card_title",
                    value
                  )
                }
              />
            </div>
          </EditorSection>

          <EditorSection title="Indicadores">
            <Toggle
              label="Mostrar indicadores"
              checked={content.stats_enabled}
              onChange={(value) =>
                update("stats_enabled", value)
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Título do indicador"
                value={content.stock_stat_title}
                onChange={(value) =>
                  update(
                    "stock_stat_title",
                    value
                  )
                }
              />
              <TextField
                label="Descrição do indicador"
                value={
                  content.stock_stat_subtitle
                }
                onChange={(value) =>
                  update(
                    "stock_stat_subtitle",
                    value
                  )
                }
              />
            </div>
          </EditorSection>
        </section>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Pré-visualização
          </p>

          {content.announcement_enabled && (
            <div className="rounded-t-3xl bg-[#b9ff66] px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest text-[#102820]">
              {content.announcement_text}
            </div>
          )}

          <div
            className={`overflow-hidden bg-[#102820] p-8 text-white ${
              content.announcement_enabled
                ? "rounded-b-3xl"
                : "rounded-3xl"
            }`}
          >
            {content.badge_enabled && (
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#b9ff66]">
                {content.badge_text}
              </span>
            )}

            <h2 className="mt-6 text-4xl font-black leading-none tracking-tight">
              {content.title}{" "}
              <span className="text-[#b9ff66]">
                {content.highlight}
              </span>
            </h2>

            <p className="mt-5 leading-7 text-white/70">
              {content.description}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {content.primary_button_enabled && (
                <span className="rounded-full bg-[#b9ff66] px-5 py-3 text-sm font-black text-[#102820]">
                  {content.primary_button_label}
                </span>
              )}
              {content.secondary_button_enabled && (
                <span className="rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold">
                  {content.secondary_button_label}
                </span>
              )}
            </div>

            {content.cards_enabled && (
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#ff735c] p-5 text-[#3f1711]">
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {content.first_card_label}
                  </span>
                  <p className="mt-4 text-2xl font-black">
                    {content.first_card_title}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#b9ff66] p-5 text-[#102820]">
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {content.second_card_label}
                  </span>
                  <p className="mt-4 text-2xl font-black">
                    {content.second_card_title}
                  </p>
                </div>
              </div>
            )}

            {content.stats_enabled && (
              <div className="mt-8 text-sm text-white/70">
                <strong className="block text-xl text-white">
                  {content.stock_stat_title}
                </strong>
                {content.stock_stat_subtitle}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

function EditorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black">
        {title}
      </h2>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-700">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-700"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-700">
        {label}
      </span>
      <textarea
        rows={4}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-700"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold">
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="h-5 w-5 accent-emerald-700"
      />
    </label>
  );
}
