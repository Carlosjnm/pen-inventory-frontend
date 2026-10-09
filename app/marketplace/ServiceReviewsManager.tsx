"use client";

import {
  useEffect,
  useState,
} from "react";
import { User } from "firebase/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type ReviewStatus =
  | "pending"
  | "published"
  | "hidden"
  | "rejected";

type Review = {
  id: string;
  request_id: string;
  request_number: string;
  request_title: string;
  provider_id: string;
  provider_name: string;
  provider_slug: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  provider_response: string | null;
  provider_responded_at: string | null;
  moderated_at: string | null;
  created_at: string;
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

function reviewDate(value: string) {
  return new Intl.DateTimeFormat("pt-AO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: ReviewStatus) {
  return {
    pending: "Pendente",
    published: "Publicada",
    hidden: "Oculta",
    rejected: "Rejeitada",
  }[status];
}

export default function ServiceReviewsManager({
  user,
}: {
  user: User;
}) {
  const [reviews, setReviews] =
    useState<Review[]>([]);
  const [filter, setFilter] =
    useState<"all" | ReviewStatus>("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] =
    useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    void loadReviews();
  }, [user, filter]);

  async function loadReviews() {
    try {
      setLoading(true);
      setMessage("");

      const query =
        filter === "all"
          ? ""
          : `?status=${filter}`;

      const response = await apiFetch(
        user,
        `/api/marketplace/services/reviews${query}`
      );

      const data = await responseData(response);
      setReviews(data.reviews || []);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao carregar avaliações."
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateReview(
    reviewId: string,
    changes: {
      status?: ReviewStatus;
      provider_response?: string;
    }
  ) {
    try {
      setSavingId(reviewId);
      setMessage("");

      const response = await apiFetch(
        user,
        `/api/marketplace/services/reviews/${reviewId}`,
        {
          method: "PATCH",
          body: JSON.stringify(changes),
        }
      );

      await responseData(response);
      setIsError(false);
      setMessage("Avaliação atualizada.");
      await loadReviews();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar avaliação."
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h3 className="text-xl font-black">
              Avaliações dos clientes
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Aprove comentários, controle a publicação
              e registe a resposta do profissional.
            </p>
          </div>

          <label>
            <span className="sr-only">
              Filtrar avaliações
            </span>
            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target.value as
                    | "all"
                    | ReviewStatus
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold"
            >
              <option value="all">
                Todas
              </option>
              <option value="pending">
                Pendentes
              </option>
              <option value="published">
                Publicadas
              </option>
              <option value="hidden">
                Ocultas
              </option>
              <option value="rejected">
                Rejeitadas
              </option>
            </select>
          </label>
        </div>
      </div>

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

      {loading ? (
        <div className="rounded-2xl bg-white p-10 text-center text-slate-600">
          A carregar avaliações...
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              saving={savingId === review.id}
              onSave={(changes) =>
                updateReview(
                  review.id,
                  changes
                )
              }
            />
          ))}

          {reviews.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
              Não existem avaliações neste estado.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ReviewCard({
  review,
  saving,
  onSave,
}: {
  review: Review;
  saving: boolean;
  onSave: (
    changes: {
      status?: ReviewStatus;
      provider_response?: string;
    }
  ) => Promise<void>;
}) {
  const [response, setResponse] = useState(
    review.provider_response || ""
  );

  useEffect(() => {
    setResponse(
      review.provider_response || ""
    );
  }, [review.provider_response]);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row">
        <div>
          <div
            className="text-2xl tracking-wide text-amber-500"
            aria-label={`${review.rating} de 5 estrelas`}
          >
            {"★".repeat(review.rating)}
            <span className="text-slate-200">
              {"★".repeat(5 - review.rating)}
            </span>
          </div>

          <h4 className="mt-2 text-lg font-black">
            {review.customer_name}
          </h4>

          <p className="mt-1 text-sm text-slate-500">
            {reviewDate(review.created_at)}
          </p>
        </div>

        <div className="md:text-right">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
              review.status === "published"
                ? "bg-emerald-100 text-emerald-800"
                : review.status === "pending"
                  ? "bg-amber-100 text-amber-900"
                  : "bg-slate-100 text-slate-700"
            }`}
          >
            {statusLabel(review.status)}
          </span>

          <p className="mt-2 font-bold">
            {review.provider_name}
          </p>
          <p className="text-xs text-slate-500">
            {review.request_number}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
          {review.request_title}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
          {review.comment ||
            "O cliente deixou apenas a classificação."}
        </p>
      </div>

      <label className="mt-5 block">
        <span className="mb-2 block text-sm font-black">
          Resposta do profissional
        </span>
        <textarea
          value={response}
          onChange={(event) =>
            setResponse(event.target.value)
          }
          maxLength={2000}
          rows={3}
          className="w-full rounded-xl border border-slate-300 px-4 py-3"
          placeholder="Resposta pública opcional..."
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            onSave({
              status: "published",
              provider_response:
                response.trim(),
            })
          }
          className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
        >
          Publicar
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() =>
            onSave({
              status: "hidden",
              provider_response:
                response.trim(),
            })
          }
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold disabled:opacity-50"
        >
          Ocultar
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() =>
            onSave({
              status: "rejected",
              provider_response:
                response.trim(),
            })
          }
          className="rounded-xl border border-red-300 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-50"
        >
          Rejeitar
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() =>
            onSave({
              provider_response:
                response.trim(),
            })
          }
          className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-bold text-blue-800 disabled:opacity-50"
        >
          Guardar resposta
        </button>
      </div>
    </article>
  );
}
