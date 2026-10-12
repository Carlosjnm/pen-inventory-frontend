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

type Provider = {
  id: string;
  public_name: string;
  slug: string;
};

type MediaImage = {
  id: string;
  caption: string | null;
  image_type:
    | "portfolio"
    | "certificate"
    | "workspace";
  sort_order: number;
  is_active: boolean;
  image_path: string;
};

type MediaData = {
  provider: {
    id: string;
    slug: string;
    public_name: string;
    logo_path: string | null;
    cover_path: string | null;
  };
  images: MediaImage[];
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

export default function ProviderMediaManager({
  user,
  provider,
  onClose,
}: {
  user: User;
  provider: Provider;
  onClose: () => void;
}) {
  const [media, setMedia] =
    useState<MediaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageType, setImageType] =
    useState<
      "portfolio" | "certificate" | "workspace"
    >("portfolio");
  const [refreshKey, setRefreshKey] =
    useState(Date.now());

  useEffect(() => {
    void loadMedia();
  }, [provider.id, user]);

  async function loadMedia() {
    try {
      setLoading(true);
      setMessage("");

      const response = await apiFetch(
        user,
        `/api/marketplace/services/providers/${provider.id}/media`
      );

      const data = await responseData(response);
      setMedia(data);
      setRefreshKey(Date.now());
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao carregar fotografias."
      );
    } finally {
      setLoading(false);
    }
  }

  async function uploadMainImage(
    asset: "logo" | "cover",
    file: File
  ) {
    try {
      setSaving(true);
      setMessage("");

      const form = new FormData();
      form.append("file", file);

      const response = await apiFetch(
        user,
        `/api/marketplace/services/providers/${provider.id}/main-image/${asset}`,
        {
          method: "POST",
          body: form,
        }
      );

      await responseData(response);
      setIsError(false);
      setMessage(
        asset === "logo"
          ? "Fotografia principal atualizada."
          : "Imagem de capa atualizada."
      );
      await loadMedia();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao enviar imagem."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeMainImage(
    asset: "logo" | "cover"
  ) {
    if (
      !window.confirm(
        "Remover esta imagem do profissional?"
      )
    ) {
      return;
    }

    try {
      setSaving(true);

      const response = await apiFetch(
        user,
        `/api/marketplace/services/providers/${provider.id}/main-image/${asset}`,
        { method: "DELETE" }
      );

      await responseData(response);
      setIsError(false);
      setMessage("Imagem removida.");
      await loadMedia();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao remover imagem."
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadPortfolio(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const input = formElement.elements.namedItem(
      "portfolio_file"
    ) as HTMLInputElement | null;

    const file = input?.files?.[0];

    if (!file) {
      setIsError(true);
      setMessage("Selecione uma fotografia.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const form = new FormData();
      form.append("file", file);

      const query = new URLSearchParams({
        image_type: imageType,
        caption: caption.trim(),
        sort_order: "0",
      });

      const response = await apiFetch(
        user,
        `/api/marketplace/services/providers/${provider.id}/portfolio?${query.toString()}`,
        {
          method: "POST",
          body: form,
        }
      );

      await responseData(response);
      formElement.reset();
      setCaption("");
      setIsError(false);
      setMessage("Fotografia adicionada.");
      await loadMedia();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao adicionar fotografia."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removePortfolio(imageId: string) {
    if (
      !window.confirm(
        "Remover esta fotografia do portfólio?"
      )
    ) {
      return;
    }

    try {
      setSaving(true);

      const response = await apiFetch(
        user,
        `/api/marketplace/services/providers/${provider.id}/portfolio/${imageId}`,
        { method: "DELETE" }
      );

      await responseData(response);
      setIsError(false);
      setMessage("Fotografia removida.");
      await loadMedia();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao remover fotografia."
      );
    } finally {
      setSaving(false);
    }
  }

  function imageUrl(path: string) {
    return `${API_URL}${path}?v=${refreshKey}`;
  }

  return (
    <section className="rounded-2xl border-2 border-emerald-300 bg-white p-6 shadow-lg">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Fotografias e portfólio
          </p>
          <h3 className="mt-1 text-2xl font-black">
            {provider.public_name}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            As imagens carregam separadamente para
            manter o painel rápido.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-300 px-4 py-2 font-bold"
        >
          Fechar
        </button>
      </div>

      {message && (
        <div
          className={`mt-5 rounded-xl border px-4 py-3 text-sm font-bold ${
            isError
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {message}
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-xl bg-slate-50 p-8 text-center text-slate-600">
          A carregar fotografias...
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <MainImageBox
              user={user}
              title="Fotografia principal"
              description="Retrato ou logótipo apresentado nos cartões."
              path={media?.provider.logo_path || null}
              imageUrl={imageUrl}
              saving={saving}
              onUpload={(file) =>
                uploadMainImage("logo", file)
              }
              onRemove={() =>
                removeMainImage("logo")
              }
            />

            <MainImageBox
              user={user}
              title="Imagem de capa"
              description="Imagem horizontal do perfil público."
              path={media?.provider.cover_path || null}
              imageUrl={imageUrl}
              saving={saving}
              onUpload={(file) =>
                uploadMainImage("cover", file)
              }
              onRemove={() =>
                removeMainImage("cover")
              }
            />
          </div>

          <form
            onSubmit={uploadPortfolio}
            className="mt-6 rounded-2xl bg-slate-50 p-5"
          >
            <h4 className="font-black">
              Adicionar ao portfólio
            </h4>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label>
                <span className="mb-2 block text-sm font-bold">
                  Tipo
                </span>
                <select
                  value={imageType}
                  onChange={(event) =>
                    setImageType(
                      event.target.value as
                        | "portfolio"
                        | "certificate"
                        | "workspace"
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="portfolio">
                    Trabalho realizado
                  </option>
                  <option value="certificate">
                    Certificado
                  </option>
                  <option value="workspace">
                    Espaço de trabalho
                  </option>
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold">
                  Legenda
                </span>
                <input
                  value={caption}
                  onChange={(event) =>
                    setCaption(event.target.value)
                  }
                  maxLength={250}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  placeholder="Ex.: Cozinha concluída"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold">
                  Fotografia
                </span>
                <input
                  name="portfolio_file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-4 rounded-xl bg-emerald-800 px-5 py-3 font-black text-white disabled:opacity-50"
            >
              {saving
                ? "A enviar..."
                : "Adicionar fotografia"}
            </button>
          </form>

          <div className="mt-6">
            <h4 className="font-black">
              Galeria ({media?.images.length || 0})
            </h4>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {media?.images.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="aspect-[4/3] bg-slate-100">
                    <AuthenticatedImage
                      user={user}
                      url={imageUrl(
                        item.image_path
                      )}
                      alt={
                        item.caption ||
                        "Fotografia do profissional"
                      }
                      loading="lazy"
                      decoding="async"
                      width={640}
                      height={480}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                      {item.image_type ===
                      "certificate"
                        ? "Certificado"
                        : item.image_type ===
                            "workspace"
                          ? "Espaço de trabalho"
                          : "Trabalho realizado"}
                    </p>
                    <p className="mt-1 min-h-5 text-sm text-slate-700">
                      {item.caption ||
                        "Sem legenda"}
                    </p>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        removePortfolio(item.id)
                      }
                      className="mt-3 text-sm font-bold text-red-700 disabled:opacity-50"
                    >
                      Remover
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {media?.images.length === 0 && (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                Ainda não existem fotografias no
                portfólio.
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function MainImageBox({
  user,
  title,
  description,
  path,
  imageUrl,
  saving,
  onUpload,
  onRemove,
}: {
  user: User;
  title: string;
  description: string;
  path: string | null;
  imageUrl: (path: string) => string;
  saving: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <h4 className="font-black">{title}</h4>
      <p className="mt-1 text-sm text-slate-600">
        {description}
      </p>

      <div className="mt-4 aspect-[16/9] overflow-hidden rounded-xl bg-slate-100">
        {path ? (
          <AuthenticatedImage
            user={user}
            url={imageUrl(path)}
            alt={title}
            loading="lazy"
            decoding="async"
            width={800}
            height={450}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-slate-500">
            Sem imagem
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
          {path ? "Substituir" : "Escolher imagem"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={saving}
            className="hidden"
            onChange={(event) => {
              const file =
                event.target.files?.[0];

              if (file) {
                onUpload(file);
              }

              event.target.value = "";
            }}
          />
        </label>

        {path && (
          <button
            type="button"
            disabled={saving}
            onClick={onRemove}
            className="text-sm font-bold text-red-700 disabled:opacity-50"
          >
            Remover
          </button>
        )}
      </div>
    </div>
  );
}


function AuthenticatedImage({ user, url, alt, className, width, height }: {
  user: User; url: string; alt: string; className?: string;
  width?: number; height?: number; loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
}) {
  const [preview, setPreview] = useState<{ url: string; blob: string } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    const controller = new AbortController();
    setPreview(null); setError("");
    async function load() {
      try {
        const token = await user.getIdToken();
        if (!active) return;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal, cache: "no-store",
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(typeof data.detail === "string" ? data.detail : `Erro ao carregar imagem (${response.status}).`);
        }
        const blob = await response.blob();
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ url, blob: objectUrl });
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Erro ao carregar imagem.");
      }
    }
    void load();
    return () => {
      active = false; controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [user, url]);
  if (error) return <div role="alert" className="grid h-full place-items-center p-4 text-center text-sm text-red-700">{error}</div>;
  if (!preview || preview.url !== url) return <div className="grid h-full place-items-center text-sm text-slate-500">A carregar imagem...</div>;
  return <img src={preview.blob} alt={alt} className={className} width={width} height={height} decoding="async" onError={() => setError("Não foi possível apresentar este ficheiro de imagem.")} />;
}
