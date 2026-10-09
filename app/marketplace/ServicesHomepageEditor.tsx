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

type HomeContent = {
  announcement: string;
  badge: string;
  title: string;
  highlight: string;
  description: string;
  hero_image_path: string | null;
};

const defaults: HomeContent = {
  announcement:
    "PROFISSIONAIS LOCAIS · MARCAÇÕES SIMPLES · ATENDIMENTO DE CONFIANÇA",
  badge: "Serviços Nazunga",
  title: "Encontre quem sabe",
  highlight: "fazer.",
  description:
    "Encontre profissionais perto de si. Marque um horário ou solicite um orçamento.",
  hero_image_path: null,
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
      ...(options.body &&
      !(options.body instanceof FormData)
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

export default function ServicesHomepageEditor({
  user,
}: {
  user: User;
}) {
  const [content, setContent] =
    useState<HomeContent>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] =
    useState(false);
  const [selectedImage, setSelectedImage] =
    useState<File | null>(null);
  const [previewUrl, setPreviewUrl] =
    useState("");
  const [imageVersion, setImageVersion] =
    useState(() => Date.now());
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    void loadContent();
  }, [user]);

  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(selectedImage);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  async function loadContent() {
    try {
      setLoading(true);
      setMessage("");

      const response = await apiFetch(
        user,
        "/api/marketplace/services/homepage"
      );
      const data = await responseData(response);
      const received = data.content || data || {};

      setContent({
        ...defaults,
        ...received,
      });
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao carregar a página de Serviços."
      );
    } finally {
      setLoading(false);
    }
  }

  function update(
    field: keyof HomeContent,
    value: string
  ) {
    setContent((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveText(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setIsError(false);

      const response = await apiFetch(
        user,
        "/api/marketplace/services/homepage",
        {
          method: "PATCH",
          body: JSON.stringify({
            announcement: content.announcement,
            badge: content.badge,
            title: content.title,
            highlight: content.highlight,
            description: content.description,
          }),
        }
      );

      const data = await responseData(response);
      const received = data.content || data || {};

      setContent((current) => ({
        ...current,
        ...received,
      }));

      setMessage(
        "Textos da página de Serviços guardados."
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao guardar os textos."
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage() {
    if (!selectedImage) return;

    try {
      setImageBusy(true);
      setMessage("");
      setIsError(false);

      const formData = new FormData();
      formData.append("file", selectedImage);

      const response = await apiFetch(
        user,
        "/api/marketplace/services/homepage/hero-image",
        {
          method: "POST",
          body: formData,
        }
      );

      await responseData(response);

      setContent((current) => ({
        ...current,
        hero_image_path:
          "/public/marketplace/services/homepage/hero-image",
      }));
      setSelectedImage(null);
      setImageVersion(Date.now());
      setMessage(
        "Imagem de fundo atualizada."
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao enviar a imagem."
      );
    } finally {
      setImageBusy(false);
    }
  }

  async function removeImage() {
    if (
      !window.confirm(
        "Remover a imagem de fundo atual?"
      )
    ) {
      return;
    }

    try {
      setImageBusy(true);
      setMessage("");
      setIsError(false);

      const response = await apiFetch(
        user,
        "/api/marketplace/services/homepage/hero-image",
        { method: "DELETE" }
      );

      await responseData(response);

      setContent((current) => ({
        ...current,
        hero_image_path: null,
      }));
      setSelectedImage(null);
      setMessage("Imagem de fundo removida.");
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao remover a imagem."
      );
    } finally {
      setImageBusy(false);
    }
  }

  const currentImage = previewUrl
    ? previewUrl
    : content.hero_image_path
      ? `${API_URL}${content.hero_image_path}?v=${imageVersion}`
      : "";

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
        A carregar a página inicial...
      </div>
    );
  }

  return (
    <form
      onSubmit={saveText}
      className="space-y-6"
    >
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

      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-black">
            Página de Serviços Nazunga
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Altere a imagem e os textos sempre que
            desejar. Os botões permanecem fixos.
          </p>
        </div>

        <div
          className="relative min-h-[430px] overflow-hidden rounded-2xl bg-emerald-950 bg-cover bg-center p-7 md:p-12"
          style={
            currentImage
              ? {
                  backgroundImage:
                    `linear-gradient(90deg, rgba(5,46,35,.94) 0%, rgba(5,46,35,.75) 50%, rgba(5,46,35,.30) 100%), url("${currentImage}")`,
                }
              : undefined
          }
        >
          <div className="relative max-w-2xl text-white">
            <div className="mb-8 text-xs font-black uppercase tracking-[0.22em] text-lime-200">
              {content.announcement}
            </div>

            <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold">
              {content.badge}
            </span>

            <h3 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
              {content.title}
              <span className="block text-lime-300">
                {content.highlight}
              </span>
            </h3>

            <p className="mt-5 max-w-xl text-base leading-7 text-white/85">
              {content.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full bg-lime-400 px-6 py-3 font-black text-emerald-950">
                Profissionais verificados
              </span>
              <span className="rounded-full border border-white/40 px-6 py-3 font-black text-white">
                Avaliações reais
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
        <h3 className="text-lg font-black">
          Imagem de fundo
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Recomendação: imagem horizontal com pelo
          menos 1600 × 900 píxeis.
        </p>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) =>
            setSelectedImage(
              event.target.files?.[0] || null
            )
          }
          className="mt-5 block w-full rounded-xl border border-slate-300 p-3 text-sm"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!selectedImage || imageBusy}
            onClick={uploadImage}
            className="rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {imageBusy
              ? "A processar..."
              : "Carregar nova imagem"}
          </button>

          {content.hero_image_path && (
            <button
              type="button"
              disabled={imageBusy}
              onClick={removeImage}
              className="rounded-xl border border-red-300 px-5 py-3 font-bold text-red-700 disabled:opacity-50"
            >
              Remover imagem
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
        <h3 className="mb-5 text-lg font-black">
          Textos do destaque principal
        </h3>

        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Faixa superior"
            value={content.announcement}
            onChange={(value) =>
              update("announcement", value)
            }
          />

          <Field
            label="Etiqueta"
            value={content.badge}
            onChange={(value) =>
              update("badge", value)
            }
          />

          <Field
            label="Título principal"
            value={content.title}
            onChange={(value) =>
              update("title", value)
            }
          />

          <Field
            label="Texto destacado"
            value={content.highlight}
            onChange={(value) =>
              update("highlight", value)
            }
          />
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-black">
            Descrição
          </span>
          <textarea
            rows={4}
            value={content.description}
            onChange={(event) =>
              update(
                "description",
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </label>

        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Os botões <strong>Profissionais verificados</strong> e{" "}
          <strong>Avaliações reais</strong> são fixos e
          não podem ser alterados aqui.
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 rounded-xl bg-slate-950 px-6 py-3 font-black text-white disabled:opacity-50"
        >
          {saving
            ? "A guardar..."
            : "Guardar textos"}
        </button>
      </section>
    </form>
  );
}

function Field({
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
      <span className="mb-2 block text-sm font-black">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-300 px-4 py-3"
      />
    </label>
  );
}
