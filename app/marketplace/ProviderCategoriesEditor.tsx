"use client";

import { FormEvent, useRef, useState } from "react";
import type { User } from "firebase/auth";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pen-inventory-backend-250574343787.africa-south1.run.app";
type Category = { id: string; name: string; is_active: boolean };
type Provider = { id: string; public_name: string; categories: { id: string; name: string; is_primary: boolean }[] };

export default function ProviderCategoriesEditor({ user, provider, categories, onSaved, onClose }: {
  user: User; provider: Provider; categories: Category[];
  onSaved: () => void; onClose: () => void;
}) {
  const [selected, setSelected] = useState(provider.categories.map(category => category.id));
  const [primary, setPrimary] = useState(provider.categories.find(category => category.is_primary)?.id || provider.categories[0]?.id || "");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  // Include existing inactive categories so saving does not silently remove them.
  const available = [
    ...categories.filter(category => category.is_active || provider.categories.some(item => item.id === category.id)),
    ...provider.categories.filter(category => !categories.some(item => item.id === category.id)).map(category => ({ ...category, is_active: false })),
  ];
  function toggle(id: string, checked: boolean) {
    const next = checked ? [...selected, id] : selected.filter(value => value !== id);
    setSelected(next);
    if (!next.includes(primary)) setPrimary(next[0] || "");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (!selected.length || !selected.includes(primary)) {
      setError("Selecione pelo menos uma categoria e indique a principal."); return;
    }
    busy.current = true; setSaving(true); setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/marketplace/services/providers/${provider.id}`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ category_ids: [primary, ...selected.filter(id => id !== primary)] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Não foi possível guardar as categorias.");
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível guardar as categorias.");
    } finally { busy.current = false; setSaving(false); }
  }
  return <form onSubmit={save} className="space-y-5 rounded-2xl border-2 border-emerald-300 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-black">Serviços / categorias de {provider.public_name}</h3><p className="mt-1 text-sm text-slate-600">Selecione todas as áreas de atuação. Os clientes poderão escolhê-las ao pedir um serviço.</p></div>
      <button type="button" disabled={saving} onClick={onClose} className="rounded-xl border px-4 py-2">Fechar</button></div>
    <label className="block text-sm font-bold">Pesquisar categorias<input value={search} onChange={event => setSearch(event.target.value)} className="mt-2 w-full rounded-xl border p-3 font-normal" placeholder="Ex.: tradução, logística, consultoria..." /></label>
    <fieldset disabled={saving} className="grid max-h-80 gap-3 overflow-y-auto sm:grid-cols-2">
      <legend className="mb-3 font-bold">Categorias disponíveis ({selected.length} selecionadas)</legend>
      {available.filter(category => category.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).map(category => <label key={category.id} className={`flex items-center gap-3 rounded-xl border p-3 ${selected.includes(category.id) ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}>
        <input type="checkbox" checked={selected.includes(category.id)} onChange={event => toggle(category.id, event.target.checked)} className="h-4 w-4 accent-emerald-700" /><span>{category.name}{!category.is_active && " (inativa)"}</span>
      </label>)}
    </fieldset>
    <label className="block text-sm font-bold">Categoria principal<select disabled={saving || !selected.length} value={primary} onChange={event => setPrimary(event.target.value)} className="mt-2 w-full rounded-xl border p-3">
      {!selected.length && <option value="">Selecione categorias acima</option>}
      {available.filter(category => selected.includes(category.id)).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
    </select></label>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    <div className="flex gap-3"><button disabled={saving || !selected.length} className="rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? "A guardar..." : "Guardar serviços / categorias"}</button><button type="button" disabled={saving} onClick={onClose} className="rounded-xl border px-5 py-3">Cancelar</button></div>
  </form>;
}
