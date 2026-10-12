"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pen-inventory-backend-250574343787.africa-south1.run.app";
const fields = [
  ["public_name", "Nome público", "text"], ["legal_name", "Nome legal", "text"],
  ["slug", "Identificador público", "text"], ["headline", "Título profissional", "text"],
  ["contact_name", "Pessoa de contacto", "text"], ["phone", "Telefone", "tel"],
  ["email", "Email de contacto (não muda o login)", "email"], ["whatsapp", "WhatsApp", "tel"],
  ["province", "Província", "text"], ["municipality", "Município", "text"],
  ["address", "Endereço de atendimento", "text"], ["years_experience", "Anos de experiência", "number"],
  ["service_radius_km", "Raio de atendimento (km)", "number"], ["commission_percentage", "Comissão (%)", "number"],
] as const;
const required = ["public_name", "slug", "contact_name", "phone", "province", "municipality"];
const modes = { offers_at_location: "Atendimento no estabelecimento", offers_at_customer: "Atendimento no cliente", offers_online: "Atendimento online", is_accepting_requests: "Aceitar novos pedidos", is_featured: "Em destaque" };
type Values = Record<string, string | boolean | number | null>;
export default function ProviderProfileEditor({ user, providerId, onClose, onSaved }: {
  user: User; providerId: string; onClose: () => void; onSaved: () => void;
}) {
  const [original, setOriginal] = useState<Values | null>(null);
  const [form, setForm] = useState<Values>({});
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`${API_URL}/api/marketplace/services/providers`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Não foi possível carregar o perfil.");
        const record = data.providers?.find((item: { id: string }) => item.id === providerId);
        if (!record) throw new Error("Profissional não encontrado.");
        if (active) { setOriginal(record); setForm(record); }
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : "Erro ao carregar perfil."); }
    }
    void load(); return () => { active = false; };
  }, [user, providerId]);
  function set(name: string, value: string | boolean) { setForm(current => ({ ...current, [name]: value })); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!original || busy.current) return;
    const changes: Values = {};
    const names = [...fields.map(([name]) => name), "description", "currency", "status", "verification_status", ...Object.keys(modes)];
    for (const name of names) {
      const field = fields.find(([key]) => key === name);
      const raw = form[name];
      const value = typeof raw === "boolean" ? raw : field?.[2] === "number" ? raw == null || raw === "" ? null : Number(raw) : String(raw ?? "").trim() || null;
      const before = typeof original[name] === "boolean" ? original[name] : field?.[2] === "number" ? original[name] == null ? null : Number(original[name]) : String(original[name] ?? "").trim() || null;
      if (value !== before) changes[name] = value;
    }
    if (!Object.keys(changes).length) { onClose(); return; }
    if (required.some(name => !String(form[name] ?? "").trim())) { setError("Preencha os campos obrigatórios."); return; }
    if (!Object.keys(modes).slice(0,3).some(name => form[name])) { setError("Selecione pelo menos uma modalidade de atendimento."); return; }
    busy.current = true; setSaving(true); setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/marketplace/services/providers/${providerId}/super-profile`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(changes) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Não foi possível guardar o perfil.");
      onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Erro ao guardar perfil."); }
    finally { busy.current = false; setSaving(false); }
  }
  return <form onSubmit={save} className="space-y-5 rounded-2xl border-2 border-emerald-300 bg-white p-6">
    <div className="flex justify-between gap-3"><h3 className="text-xl font-black">Editar perfil e atendimento</h3><button type="button" disabled={saving} onClick={onClose}>Fechar</button></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {!original ? <p>A carregar perfil...</p> : <fieldset disabled={saving} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">{fields.map(([name,label,type]) => <label key={name} className="block text-sm font-bold">{label}{required.includes(name) && " *"}<input required={required.includes(name)} type={type} min={type === "number" ? 0 : undefined} max={name === "commission_percentage" ? 100 : undefined} step={name === "years_experience" ? 1 : "any"} value={String(form[name] ?? "")} onChange={event => set(name,event.target.value)} className="mt-2 w-full rounded-xl border p-3" /></label>)}</div>
      <p className="text-sm text-slate-600">Alterar o identificador público muda o endereço do perfil na Nazunga.</p>
      <label className="block font-bold">Apresentação<textarea rows={6} value={String(form.description ?? "")} onChange={event => set("description",event.target.value)} className="mt-2 w-full rounded-xl border p-3" /></label>
      <div className="flex flex-wrap gap-4">{Object.entries(modes).map(([name,label]) => <label key={name} className="flex items-center gap-2"><input type="checkbox" checked={Boolean(form[name])} onChange={event => set(name,event.target.checked)} />{label}</label>)}</div>
      <div className="grid gap-4 md:grid-cols-3">
        <Select label="Estado" name="status" value={String(form.status)} set={set} choices={{draft:"Rascunho",pending:"Pendente",active:"Ativo",suspended:"Suspenso",closed:"Encerrado"}} />
        <Select label="Verificação" name="verification_status" value={String(form.verification_status)} set={set} choices={{unverified:"Não verificado",pending:"Pendente",verified:"Verificado",rejected:"Rejeitado"}} />
        <Select label="Moeda" name="currency" value={String(form.currency)} set={set} choices={{AOA:"AOA",USD:"USD",ZAR:"ZAR",CNY:"CNY"}} />
      </div>
      <p className="text-sm text-slate-600">Encerrar preserva o perfil e o histórico. As categorias e fotografias são geridas nos respetivos botões.</p>
      <button className="rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white">{saving ? "A guardar..." : "Guardar perfil"}</button>
    </fieldset>}
  </form>;
}
function Select({label,name,value,set,choices}:{label:string;name:string;value:string;set:(name:string,value:string)=>void;choices:Record<string,string>}) {
 return <label className="block text-sm font-bold">{label}<select value={value} onChange={event => set(name,event.target.value)} className="mt-2 w-full rounded-xl border p-3">{Object.entries(choices).map(([key,text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}
