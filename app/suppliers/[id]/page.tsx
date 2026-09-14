"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useParams } from "next/navigation";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Supplier = {
  id: string;
  supplier_code: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  default_currency: string | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      await loadSupplier(user);
    });

    return () => unsubscribe();
  }, [params.id]);

  async function loadSupplier(user: User) {
    try {
      setLoading(true);
      setMessage("");

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/suppliers/${params.id}`,
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
          data.detail || "Não foi possível carregar o fornecedor."
        );
      }

      setSupplier(data.supplier || null);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o fornecedor."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(value: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              A carregar fornecedor...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (message || !supplier) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/suppliers";
            }}
            className="mb-5 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            ← Voltar aos Fornecedores
          </button>

          <div className="rounded-2xl border border-red-200 bg-white p-8 text-red-600 shadow-sm">
            {message || "Fornecedor não encontrado."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => {
            window.location.href = "/suppliers";
          }}
          className="mb-3 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
        >
          ← Voltar aos Fornecedores
        </button>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {supplier.name}
              </h1>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  supplier.is_active
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {supplier.is_active ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="rounded-lg bg-slate-200 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                {supplier.supplier_code}
              </span>

              <span>
                {[supplier.city, supplier.country]
                  .filter(Boolean)
                  .join(", ") || "Localização não definida"}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Moeda Predefinida
            </div>
            <div className="mt-1 text-lg font-bold text-slate-950">
              {supplier.default_currency || "—"}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              title="Contacto"
              description="Informações principais de contacto do fornecedor."
            />

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <DetailField
                label="Pessoa de Contacto"
                value={supplier.contact_person}
              />
              <DetailField label="Email" value={supplier.email} />
              <DetailField label="Telefone" value={supplier.phone} />
              <DetailField label="WhatsApp" value={supplier.whatsapp} />

              <div className="sm:col-span-2">
                <DetailField
                  label="Website"
                  value={supplier.website}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              title="Localização"
              description="Endereço e localização do fornecedor."
            />

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <DetailField label="Cidade" value={supplier.city} />
              <DetailField label="País" value={supplier.country} />

              <div className="sm:col-span-2">
                <DetailField label="Endereço" value={supplier.address} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              title="Condições Comerciais"
              description="Condições definidas para compras a este fornecedor."
            />

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <DetailField
                label="Moeda Predefinida"
                value={supplier.default_currency}
              />

              <DetailField
                label="Condições de Pagamento"
                value={supplier.payment_terms}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              title="Registo"
              description="Informação administrativa do fornecedor."
            />

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <DetailField
                label="Criado em"
                value={formatDate(supplier.created_at)}
              />

              <DetailField
                label="Última Atualização"
                value={formatDate(supplier.updated_at)}
              />

              <DetailField
                label="Estado"
                value={supplier.is_active ? "Ativo" : "Inativo"}
              />

              <DetailField
                label="Código"
                value={supplier.supplier_code}
              />
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            title="Notas"
            description="Informações adicionais registadas para este fornecedor."
          />

          <div className="p-5 sm:p-6">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {supplier.notes || "Nenhuma nota registada."}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1.5 break-words text-sm font-semibold text-slate-800">
        {value || "—"}
      </div>
    </div>
  );
}
