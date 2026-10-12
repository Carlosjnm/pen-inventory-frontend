"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pen-inventory-backend-250574343787.africa-south1.run.app";
type Location = { id: string; location_code: string; name: string; address: string | null; city: string | null; country: string | null; location_active: boolean; linked: boolean; is_fulfilment_location: boolean; is_collection_location: boolean; is_default: boolean };
export default function StoreLocationsEditor({ user, storeId, onUpdated }: { user: User; storeId: string; onUpdated: () => void | Promise<void> }) {
 const [rows,setRows] = useState<Location[]>([]); const [snapshot,setSnapshot] = useState<Location[]>([]);
 const [loading,setLoading] = useState(true); const [saving,setSaving] = useState(false); const [error,setError] = useState(""); const [message,setMessage] = useState(""); const busy=useRef(false);
 const request=useCallback(async (path:string,options:RequestInit={}) => {
  const token=await user.getIdToken(); const response=await fetch(`${API_URL}${path}`,{...options,cache:"no-store",headers:{Authorization:`Bearer ${token}`,...(options.body?{"Content-Type":"application/json"}:{})}});
  const data=await response.json(); if(!response.ok)throw new Error(typeof data.detail==="string"?data.detail:"Não foi possível atualizar os locais.");return data;
 },[user]);
 const load=useCallback(async()=>{setLoading(true);setError("");try{const data=await request(`/api/marketplace/stores/${storeId}/physical-locations`);setRows(data.locations||[]);setSnapshot(data.locations||[]);}catch(reason){setError(reason instanceof Error?reason.message:"Erro ao carregar locais.");}finally{setLoading(false);}},[request,storeId]);
 useEffect(()=>{void load();},[load]);
 function edit(id:string,changes:Partial<Location>){setRows(current=>current.map(row=>row.id===id?{...row,...changes}:row));}
 async function save(location?:Location){if(busy.current)return;busy.current=true;setSaving(true);setError("");setMessage("");
  try{if(location){const before=snapshot.find(row=>row.id===location.id);if(!before)throw new Error("Atualize os locais antes de guardar.");await request(`/api/marketplace/stores/${storeId}/physical-locations/${location.id}`,{method:"PATCH",body:JSON.stringify({address:location.address,city:location.city,country:location.country,expected_address:before.address,expected_city:before.city,expected_country:before.country})});}
   else{await request(`/api/marketplace/stores/${storeId}/physical-locations`,{method:"PUT",body:JSON.stringify({locations:rows.filter(row=>row.linked).map(({id,is_fulfilment_location,is_collection_location,is_default})=>({id,is_fulfilment_location,is_collection_location,is_default}))})});}
   if(location){const saved={address:location.address?.trim()||null,city:location.city?.trim()||null,country:location.country?.trim()||null};setRows(current=>current.map(row=>row.id===location.id?{...row,...saved}:row));setSnapshot(current=>current.map(row=>row.id===location.id?{...row,...saved}:row));}
   else{setSnapshot(current=>current.map(row=>{const draft=rows.find(item=>item.id===row.id);return draft?{...row,linked:draft.linked,is_fulfilment_location:draft.is_fulfilment_location,is_collection_location:draft.is_collection_location,is_default:draft.is_default}:row;}));}
   setMessage("Locais atualizados.");await onUpdated();
  }catch(reason){setError(reason instanceof Error?reason.message:"Erro ao guardar locais.");}finally{busy.current=false;setSaving(false);}}
 return <section className="mb-6 space-y-4 rounded-2xl border bg-white p-6"><h3 className="text-xl font-bold">Locais físicos e endereços da loja</h3>
 <p className="text-sm text-slate-600">O endereço pertence ao local físico e será atualizado também onde esse local é usado no PEN. Alterar os locais de expedição muda a disponibilidade apresentada na loja; não transfere stock.</p>
 {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}{message&&<p role="status" className="text-emerald-800">{message}</p>}
 {loading?<p>A carregar locais...</p>:<><fieldset disabled={saving} className="space-y-4">{rows.filter(row=>row.location_active||row.linked).map(row=><div key={row.id} className="space-y-3 rounded-xl border p-4">
 <label className="flex items-center gap-2 font-bold"><input type="checkbox" disabled={!row.location_active} checked={Boolean(row.linked)} onChange={event=>edit(row.id,{linked:event.target.checked,is_default:event.target.checked?row.is_default:false})}/>{row.name} ({row.location_code}){!row.location_active&&" — local inativo"}</label>
 {row.linked&&<><div className="flex flex-wrap gap-4"><label><input type="checkbox" checked={row.is_fulfilment_location} onChange={event=>edit(row.id,{is_fulfilment_location:event.target.checked})}/> Expedição</label><label><input type="checkbox" checked={row.is_collection_location} onChange={event=>edit(row.id,{is_collection_location:event.target.checked})}/> Recolha</label><label><input type="radio" name={`default-${storeId}`} checked={row.is_default} onChange={()=>setRows(current=>current.map(item=>({...item,is_default:item.id===row.id})))}/> Predefinido</label></div>
 <div className="grid gap-3 md:grid-cols-3">{([['address','Endereço'],['city','Cidade'],['country','País']] as const).map(([name,label])=><label key={name} className="text-sm font-bold">{label}<input value={row[name]||""} onChange={event=>edit(row.id,{[name]:event.target.value||null})} className="mt-2 w-full rounded-xl border p-3"/></label>)}</div>
 {!snapshot.find(item=>item.id===row.id)?.linked&&<p className="text-sm text-slate-600">Guarde a associação antes de editar o endereço deste local.</p>}
 <button type="button" disabled={!snapshot.find(item=>item.id===row.id)?.linked} onClick={()=>void save(row)} className="rounded-xl border px-4 py-2">Guardar endereço deste local</button></>}
 </div>)}</fieldset><button type="button" disabled={saving} onClick={()=>void save()} className="rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white">{saving?"A guardar...":"Guardar associações e modalidades"}</button></>}
 </section>;
}
