"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pen-inventory-backend-250574343787.africa-south1.run.app";
const statuses = { new: "Nova", reviewing: "Em análise", contacted: "Contactada", approved: "Aprovada", rejected: "Rejeitada" };
type Status = keyof typeof statuses;
type Application = {
  id: string; public_name: string; contact_name: string; email: string; phone: string;
  province: string; municipality: string; service_category: string; description: string;
  offers_at_location: boolean; offers_at_customer: boolean; offers_online: boolean;
  social_url: string | null; notes: string | null; internal_notes: string | null;
  status: Status; created_provider_id: string | null;
};
type Category = { id: string; name: string; is_active: boolean };

export default function ServiceApplicationsManager({ user, onApproved }: { user: User; onApproved: () => void }) {
  const [items, setItems] = useState<Application[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Status | "all">("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const request = useCallback(async (path: string, options: RequestInit = {}) => {
    const token = await user.getIdToken();
    const response = await fetch(`${API_URL}${path}`, { ...options, cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, ...(options.body ? { "Content-Type": "application/json" } : {}) } });
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Não foi possível concluir a operação.");
    return data;
  }, [user]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [applications, catalog] = await Promise.all([
        request("/api/marketplace/services/applications"), request("/api/marketplace/services/categories"),
      ]);
      setItems(applications.applications || []); setCategories(catalog.categories || []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Erro ao carregar candidaturas."); }
    finally { setLoading(false); }
  }, [request]);
  useEffect(() => { void load(); }, [load]);
  async function act(item: Application, approve: boolean, status?: Status) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(item.id); setError(""); setMessage("");
    try {
      if (approve) {
        await request(`/api/marketplace/services/applications/${item.id}/approve`, {
          method: "POST", body: JSON.stringify({ category_ids: selected[item.id] || [] }),
        });
        setMessage("Candidatura aprovada. Perfil criado em rascunho; prepare as imagens e publique em Profissionais.");
        onApproved();
      } else {
        await request(`/api/marketplace/services/applications/${item.id}`, { method: "PATCH",
          body: JSON.stringify(status ? { status } : { internal_notes: notes[item.id] ?? item.internal_notes ?? "" }) });
        setMessage("Candidatura atualizada.");
      }
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Erro ao atualizar candidatura."); }
    finally { busyRef.current = false; setBusy(""); }
  }
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-2xl font-bold">Candidaturas de serviços ({items.length})</h3><p className="text-slate-600">Profissionais independentes e empresas de serviços.</p></div>
      <button disabled={loading || Boolean(busy)} onClick={() => void load()} className="rounded-xl border px-4 py-2 disabled:opacity-50">Atualizar candidaturas</button></div>
    <label className="block">Estado <select value={filter} onChange={e => setFilter(e.target.value as Status | "all")} className="ml-2 rounded-xl border p-2"><option value="all">Todas</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{message}</p>}
    {loading ? <p>A carregar candidaturas...</p> : items.filter(item => filter === "all" || item.status === filter).length === 0 && !error ? <p className="rounded-xl border bg-white p-8">Sem candidaturas de serviços neste estado.</p> : null}
    {!loading && items.filter(item => filter === "all" || item.status === filter).map(item => <article key={item.id} className="space-y-4 rounded-2xl border bg-white p-6">
      <h4 className="text-xl font-bold">{item.public_name} <span className="text-sm text-emerald-800">{statuses[item.status]}</span></h4>
      <p>{item.contact_name} · {item.email} · {item.phone}</p><p>{item.province}, {item.municipality} · {item.service_category}</p>
      <p className="whitespace-pre-wrap">{item.description}</p>
      <p>Atendimento: {[item.offers_at_location && "no estabelecimento", item.offers_at_customer && "no cliente", item.offers_online && "online"].filter(Boolean).join(", ")}</p>
      {item.social_url && <p className="break-all">Website / redes sociais: {item.social_url}</p>}
      {item.notes && <p className="whitespace-pre-wrap">Informações adicionais: {item.notes}</p>}
      {!item.created_provider_id && <label className="block">Estado <select disabled={Boolean(busy)} value={item.status} onChange={e => void act(item, false, e.target.value as Status)} className="ml-2 rounded-xl border p-2">
        {Object.entries(statuses).filter(([value]) => value !== "approved").map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      <label className="block">Notas internas<textarea value={notes[item.id] ?? item.internal_notes ?? ""} onChange={e => setNotes(current => ({ ...current, [item.id]: e.target.value }))} className="mt-2 w-full rounded-xl border p-3" rows={3} /></label>
      <button disabled={Boolean(busy)} onClick={() => void act(item, false)} className="rounded-xl border px-4 py-2 disabled:opacity-50">Guardar notas</button>
      {!item.created_provider_id && <div className="space-y-3 border-t pt-4"><p className="font-bold">Categorias para o perfil profissional *</p>
        <div className="flex flex-wrap gap-3">{categories.filter(category => category.is_active).map(category => <label key={category.id} className="flex items-center gap-2"><input type="checkbox" checked={(selected[item.id] || []).includes(category.id)} onChange={e => setSelected(current => ({ ...current, [item.id]: e.target.checked ? [...(current[item.id] || []), category.id] : (current[item.id] || []).filter(id => id !== category.id) }))} />{category.name}</label>)}</div>
        <button disabled={Boolean(busy) || item.status === "rejected" || !(selected[item.id] || []).length} onClick={() => void act(item, true)} className="rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white disabled:opacity-50">{busy === item.id ? "A guardar..." : "Aprovar e criar profissional"}</button></div>}
      {item.created_provider_id && <p className="font-bold text-emerald-800">Perfil criado. Gira-o na aba Profissionais.</p>}
    </article>)}
  </section>;
}
