"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import MobileNav from "@/components/MobileNav";
import PermissionGate from "@/components/PermissionGate";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type CurrentUser = {
  permissions: string[];
};

type Location = {
  id: string;
  location_code: string;
  name: string;
};

type DeliverySettings = {
  id: string;
  location_id: string;
  location_code: string;
  location_name: string;
  max_deliveries_per_day: number;
  working_day_start: string;
  working_day_end: string;
  available_weekdays: number[];
  warning_percentage: number;
  is_active: boolean;
};

type CapacityDay = {
  delivery_date: string;
  weekday: number;
  is_available: boolean;
  is_closed: boolean;
  daily_limit: number;
  booked: number;
  remaining: number;
  capacity_status:
    | "available"
    | "almost_full"
    | "full"
    | "closed";
  override_reason: string | null;
};

type SalesOrder = {
  id: string;
  sale_number: string;
  location_id: string;
  customer_name: string | null;
  sale_date: string;
  status: string;
};

type Delivery = {
  id: string;
  delivery_number: string;
  delivery_date: string;
  delivery_window_start: string | null;
  delivery_window_end: string | null;
  recipient_name: string;
  recipient_phone: string | null;
  delivery_address: string;
  city: string | null;
  delivery_method: string;
  assigned_to_name: string | null;
  delivery_fee: number;
  status:
    | "scheduled"
    | "preparing"
    | "ready"
    | "in_transit"
    | "delivered"
    | "failed"
    | "cancelled";
  location_id: string;
  location_name: string;
  sales_order_id: string | null;
  sale_number: string | null;
  customer_name: string | null;
  country: string | null;
  customer_instructions: string | null;
  internal_notes: string | null;
};

type DeliveryForm = {
  sales_order_id: string;
  location_id: string;
  delivery_date: string;
  delivery_window_start: string;
  delivery_window_end: string;
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  city: string;
  country: string;
  delivery_method: string;
  assigned_to_name: string;
  delivery_fee: string;
  customer_instructions: string;
  internal_notes: string;
};

const today = new Date();
const todayText = localDateKey(today);

const emptyForm: DeliveryForm = {
  sales_order_id: "",
  location_id: "",
  delivery_date: todayText,
  delivery_window_start: "09:00",
  delivery_window_end: "12:00",
  recipient_name: "",
  recipient_phone: "",
  delivery_address: "",
  city: "",
  country: "Angola",
  delivery_method: "own_delivery",
  assigned_to_name: "",
  delivery_fee: "0",
  customer_instructions: "",
  internal_notes: "",
};

function localDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthRange(value: string) {
  const [year, month] = value.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);

  return {
    dateFrom: localDateKey(first),
    dateTo: localDateKey(last),
    first,
    last,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT").format(
    new Date(`${value}T00:00:00`)
  );
}

function formatTime(value: string | null) {
  if (!value) return "—";
  return value.slice(0, 5);
}

function money(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "AOA",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export default function DeliveriesPage() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [settings, setSettings] = useState<DeliverySettings[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [capacity, setCapacity] = useState<CapacityDay[]>([]);

  const [selectedLocation, setSelectedLocation] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(todayText.slice(0, 7));

  const [loading, setLoading] = useState(true);
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"success" | "error">("success");

  const [formOpen, setFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] =
    useState<Delivery | null>(null);
  const [editingDeliveryId, setEditingDeliveryId] =
    useState<string | null>(null);
  const [form, setForm] = useState<DeliveryForm>(emptyForm);

  const [settingsForm, setSettingsForm] = useState({
    max_deliveries_per_day: "10",
    working_day_start: "09:00",
    working_day_end: "18:00",
    warning_percentage: "80",
    available_weekdays: [1, 2, 3, 4, 5, 6] as number[],
    is_active: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      setFirebaseUser(user);
      await loadPage(user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (firebaseUser && selectedLocation) {
      void loadCapacity(firebaseUser);
    }
  }, [firebaseUser, selectedLocation, month]);

  async function authenticatedFetch(
    user: User,
    path: string,
    options: RequestInit = {}
  ) {
    const token = await user.getIdToken();

    return fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
      cache: "no-store",
    });
  }

  async function loadPage(user: User) {
    try {
      setLoading(true);
      setMessage("");

      const [meResponse, locationResponse, settingsResponse, deliveryResponse] =
        await Promise.all([
          authenticatedFetch(user, "/api/me"),
          authenticatedFetch(user, "/api/locations"),
          authenticatedFetch(user, "/api/delivery-settings"),
          authenticatedFetch(user, "/api/deliveries"),
        ]);

      if (!meResponse.ok) {
        throw new Error("Não foi possível identificar o utilizador.");
      }

      if (!locationResponse.ok || !settingsResponse.ok || !deliveryResponse.ok) {
        const errorResponse = !deliveryResponse.ok
          ? deliveryResponse
          : !settingsResponse.ok
            ? settingsResponse
            : locationResponse;

        const data = await errorResponse.json().catch(() => ({}));
        throw new Error(
          data.detail || "Não foi possível carregar as entregas."
        );
      }

      const [meData, locationData, settingsData, deliveryData] =
        await Promise.all([
          meResponse.json(),
          locationResponse.json(),
          settingsResponse.json(),
          deliveryResponse.json(),
        ]);

      const availableLocations: Location[] = locationData.locations || [];

      setCurrentUser(meData);
      setLocations(availableLocations);
      setSettings(settingsData.settings || []);
      setDeliveries(deliveryData.deliveries || []);

      if (availableLocations.length) {
        const firstLocation =
          selectedLocation || availableLocations[0].id;

        setSelectedLocation(firstLocation);
        setForm((current) => ({
          ...current,
          location_id: current.location_id || firstLocation,
        }));
      }

      const salesResponse = await authenticatedFetch(
        user,
        "/api/sales-orders"
      );

      if (salesResponse.ok) {
        const salesData = await salesResponse.json();
        const loadedSales: SalesOrder[] =
          salesData.sales_orders || [];

        setSalesOrders(loadedSales);

        const query = new URLSearchParams(
          window.location.search
        );

        const requestedSaleId = query.get("sale_id");
        const requestedLocationId =
          query.get("location_id");

        if (requestedSaleId) {
          const requestedSale = loadedSales.find(
            (sale) => sale.id === requestedSaleId
          );

          if (requestedSale) {
            const saleLocationId =
              requestedSale.location_id ||
              requestedLocationId ||
              "";

            setSelectedLocation(saleLocationId);
            setForm({
              ...emptyForm,
              sales_order_id: requestedSale.id,
              location_id: saleLocationId,
            });
            setFormOpen(true);

            window.history.replaceState(
              {},
              "",
              "/deliveries"
            );
          }
        }
      } else {
        setSalesOrders([]);
      }
    } catch (error) {
      console.error(error);
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as entregas."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCapacity(user: User) {
    if (!selectedLocation) return;

    try {
      setCapacityLoading(true);

      const range = monthRange(month);
      const query = new URLSearchParams({
        location_id: selectedLocation,
        date_from: range.dateFrom,
        date_to: range.dateTo,
      });

      const response = await authenticatedFetch(
        user,
        `/api/delivery-capacity?${query.toString()}`
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível carregar a capacidade."
        );
      }

      setCapacity(data.days || []);
    } catch (error) {
      console.error(error);
      setCapacity([]);
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a capacidade."
      );
    } finally {
      setCapacityLoading(false);
    }
  }

  async function refresh(user = firebaseUser) {
    if (!user) return;

    const response = await authenticatedFetch(user, "/api/deliveries");
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Não foi possível atualizar as entregas."
      );
    }

    setDeliveries(data.deliveries || []);

    if (selectedLocation) {
      await loadCapacity(user);
    }
  }

  function openNewDelivery(day?: CapacityDay) {
    const locationId = selectedLocation || locations[0]?.id || "";

    setEditingDeliveryId(null);
    setForm({
      ...emptyForm,
      location_id: locationId,
      delivery_date: day?.delivery_date || todayText,
    });

    setMessage("");
    setFormOpen(true);
  }

  function openEditDelivery(delivery: Delivery) {
    setEditingDeliveryId(delivery.id);
    setForm({
      sales_order_id: delivery.sales_order_id || "",
      location_id: delivery.location_id,
      delivery_date: delivery.delivery_date,
      delivery_window_start:
        delivery.delivery_window_start?.slice(0, 5) || "",
      delivery_window_end:
        delivery.delivery_window_end?.slice(0, 5) || "",
      recipient_name: delivery.recipient_name || "",
      recipient_phone: delivery.recipient_phone || "",
      delivery_address: delivery.delivery_address || "",
      city: delivery.city || "",
      country: delivery.country || "Angola",
      delivery_method:
        delivery.delivery_method || "own_delivery",
      assigned_to_name:
        delivery.assigned_to_name || "",
      delivery_fee: String(delivery.delivery_fee || 0),
      customer_instructions:
        delivery.customer_instructions || "",
      internal_notes: delivery.internal_notes || "",
    });

    setMessage("");
    setFormOpen(true);
  }

  function chooseSale(value: string) {
    const sale = salesOrders.find((item) => item.id === value);

    setForm((current) => ({
      ...current,
      sales_order_id: value,
      location_id: sale?.location_id || current.location_id,
    }));
  }

  async function createDelivery() {
    if (!firebaseUser) return;

    if (
      !form.location_id ||
      !form.delivery_date ||
      (!form.sales_order_id &&
        (!form.recipient_name.trim() || !form.delivery_address.trim()))
    ) {
      setMessageType("error");
      setMessage(
        "Selecione a loja e a data. Sem venda associada, indique o destinatário e a morada."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        sales_order_id: form.sales_order_id || null,
        location_id: form.location_id,
        delivery_date: form.delivery_date,
        delivery_window_start: form.delivery_window_start || null,
        delivery_window_end: form.delivery_window_end || null,
        recipient_name: form.recipient_name.trim() || null,
        recipient_phone: form.recipient_phone.trim() || null,
        delivery_address: form.delivery_address.trim() || null,
        city: form.city.trim() || null,
        country: form.country.trim() || "Angola",
        delivery_method: form.delivery_method,
        assigned_to_name: form.assigned_to_name.trim() || null,
        delivery_fee: Number(form.delivery_fee || 0),
        customer_instructions:
          form.customer_instructions.trim() || null,
        internal_notes: form.internal_notes.trim() || null,
      };

      const {
        sales_order_id,
        location_id,
        ...updatePayload
      } = payload;

      const response = await authenticatedFetch(
        firebaseUser,
        editingDeliveryId
          ? `/api/deliveries/${editingDeliveryId}`
          : "/api/deliveries",
        {
          method: editingDeliveryId ? "PATCH" : "POST",
          body: JSON.stringify(
            editingDeliveryId ? updatePayload : payload
          ),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível agendar a entrega."
        );
      }

      const wasEditing = Boolean(editingDeliveryId);

      setFormOpen(false);
      setEditingDeliveryId(null);
      setMessageType("success");
      setMessage(
        wasEditing
          ? "Entrega corrigida com sucesso."
          : "Entrega agendada com sucesso."
      );
      await refresh(firebaseUser);
    } catch (error) {
      console.error(error);
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível agendar a entrega."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(
    delivery: Delivery,
    nextStatus: Delivery["status"]
  ) {
    if (!firebaseUser) return;

    let notes: string | null = null;

    if (nextStatus === "failed") {
      notes = window.prompt("Indique o motivo da entrega falhada:");

      if (!notes?.trim()) return;
    }

    if (nextStatus === "cancelled") {
      notes = window.prompt("Indique o motivo do cancelamento:");

      if (!notes?.trim()) return;
    }

    try {
      setStatusBusyId(delivery.id);
      setMessage("");

      const response = await authenticatedFetch(
        firebaseUser,
        `/api/deliveries/${delivery.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: nextStatus,
            notes,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível atualizar a entrega."
        );
      }

      setMessageType("success");
      setMessage("Estado da entrega atualizado.");
      await refresh(firebaseUser);
    } catch (error) {
      console.error(error);
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a entrega."
      );
    } finally {
      setStatusBusyId("");
    }
  }

  function openSettings() {
    const current = settings.find(
      (item) => item.location_id === selectedLocation
    );

    if (!current) return;

    setSettingsForm({
      max_deliveries_per_day: String(current.max_deliveries_per_day),
      working_day_start: current.working_day_start.slice(0, 5),
      working_day_end: current.working_day_end.slice(0, 5),
      warning_percentage: String(current.warning_percentage),
      available_weekdays: current.available_weekdays || [],
      is_active: current.is_active,
    });

    setSettingsOpen(true);
  }

  async function saveSettings() {
    if (!firebaseUser || !selectedLocation) return;

    try {
      setSaving(true);
      setMessage("");

      const response = await authenticatedFetch(
        firebaseUser,
        `/api/locations/${selectedLocation}/delivery-settings`,
        {
          method: "PATCH",
          body: JSON.stringify({
            max_deliveries_per_day: Number(
              settingsForm.max_deliveries_per_day
            ),
            working_day_start: settingsForm.working_day_start,
            working_day_end: settingsForm.working_day_end,
            warning_percentage: Number(
              settingsForm.warning_percentage
            ),
            available_weekdays: settingsForm.available_weekdays,
            is_active: settingsForm.is_active,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível guardar a configuração."
        );
      }

      setSettings((current) =>
        current.map((item) =>
          item.location_id === selectedLocation
            ? { ...item, ...data.settings }
            : item
        )
      );

      setSettingsOpen(false);
      setMessageType("success");
      setMessage("Capacidade de entregas atualizada.");
      await loadCapacity(firebaseUser);
    } catch (error) {
      console.error(error);
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar a configuração."
      );
    } finally {
      setSaving(false);
    }
  }

  const canManage =
    currentUser?.permissions?.includes("deliveries.manage") || false;

  const currentSettings = settings.find(
    (item) => item.location_id === selectedLocation
  );

  const filteredDeliveries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return deliveries.filter((delivery) => {
      const matchesSearch =
        !query ||
        delivery.delivery_number.toLowerCase().includes(query) ||
        delivery.recipient_name.toLowerCase().includes(query) ||
        (delivery.recipient_phone || "").toLowerCase().includes(query) ||
        (delivery.sale_number || "").toLowerCase().includes(query);

      return (
        matchesSearch &&
        (!selectedLocation ||
          delivery.location_id === selectedLocation) &&
        (!statusFilter || delivery.status === statusFilter)
      );
    });
  }, [deliveries, search, selectedLocation, statusFilter]);

  const monthDeliveries = filteredDeliveries.filter(
    (delivery) => delivery.delivery_date.startsWith(month)
  );

  const deliveredCount = monthDeliveries.filter(
    (delivery) => delivery.status === "delivered"
  ).length;

  const pendingCount = monthDeliveries.filter(
    (delivery) =>
      !["delivered", "cancelled", "failed"].includes(delivery.status)
  ).length;

  const calendarCells = useMemo(() => {
    const range = monthRange(month);
    const blanks = (range.first.getDay() + 6) % 7;

    return [
      ...Array.from({ length: blanks }, () => null),
      ...capacity,
    ];
  }, [month, capacity]);

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  return (
    <PermissionGate permission="deliveries.view">
      <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-slate-950 text-white lg:block">
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <div>
            <div className="text-xl font-bold">PEN</div>
            <div className="text-xs text-slate-400">Inventário</div>
          </div>
        </div>

        <nav className="space-y-1 px-3 py-5 text-sm">
          <NavItem label="Painel" icon="⌂" href="/dashboard" />
          <NavItem label="Produtos" icon="▦" href="/products" />
          <NavItem label="Inventário" icon="▣" href="/inventory" />
          <NavItem label="Compras" icon="↓" href="/purchases" />
          <NavItem label="Vendas" icon="↑" href="/sales" />
          <NavItem label="Entregas" icon="▰" href="/deliveries" active />
          <NavItem label="Despesas" icon="−" href="/expenses" />
          <NavItem label="Fornecedores" icon="♢" href="/suppliers" />
          <NavItem label="Clientes" icon="♙" href="/customers" />
          <NavItem label="Relatórios" icon="▤" href="/reports" />
          <PermissionGate permission="users.manage">
            <NavItem label="Utilizadores" icon="♧" href="/users" />
          </PermissionGate>
          <PermissionGate permission="settings.manage">
            <NavItem label="Definições" icon="⚙" href="/settings" />
          </PermissionGate>
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/10"
          >
            Terminar Sessão
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-950">
                Entregas
              </h1>
              <p className="text-sm text-slate-500">
                Agendamento e capacidade diária por loja
              </p>
            </div>

            <div className="flex items-center gap-2">
              {canManage && (
                <button
                  onClick={openSettings}
                  disabled={!selectedLocation}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  Capacidade
                </button>
              )}

              <button
                onClick={() => openNewDelivery()}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
              >
                + Agendar
              </button>

              <MobileNav onLogout={handleLogout} />
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            {message && (
              <div
                className={`mb-6 rounded-xl border p-4 text-sm ${
                  messageType === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {message}
              </div>
            )}

            <section className="mb-6 grid gap-4 md:grid-cols-4">
              <SummaryCard
                label="Capacidade diária"
                value={currentSettings?.max_deliveries_per_day ?? "—"}
              />
              <SummaryCard
                label="Entregas no mês"
                value={monthDeliveries.length}
              />
              <SummaryCard
                label="Pendentes"
                value={pendingCount}
              />
              <SummaryCard
                label="Entregues"
                value={deliveredCount}
              />
            </section>

            <section className="mb-5 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-4">
              <select
                value={selectedLocation}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedLocation(value);
                  setForm((current) => ({
                    ...current,
                    location_id: value,
                    sales_order_id: "",
                  }));
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} · {location.location_code}
                  </option>
                ))}
              </select>

              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar entrega..."
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 placeholder:text-slate-400"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"
              >
                <option value="">Todos os estados</option>
                <option value="scheduled">Agendada</option>
                <option value="preparing">Em preparação</option>
                <option value="ready">Pronta</option>
                <option value="in_transit">Em trânsito</option>
                <option value="delivered">Entregue</option>
                <option value="failed">Falhada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </section>

            <section className="mb-6 overflow-hidden rounded-xl border bg-white p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-950">
                    Calendário de capacidade
                  </h2>
                  <p className="text-sm text-slate-500">
                    Clique num dia disponível para agendar.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700">
                  <Legend color="bg-emerald-500" label="Disponível" />
                  <Legend color="bg-amber-400" label="Quase cheio" />
                  <Legend color="bg-red-500" label="Lotado" />
                  <Legend color="bg-slate-500" label="Fechado" />
                </div>
              </div>

              <div className="grid grid-cols-7 border-l border-t text-center text-xs font-semibold uppercase text-slate-500">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(
                  (day) => (
                    <div
                      key={day}
                      className="border-b border-r bg-slate-50 p-2"
                    >
                      {day}
                    </div>
                  )
                )}
              </div>

              {capacityLoading ? (
                <div className="p-10 text-center text-slate-500">
                  A carregar calendário...
                </div>
              ) : (
                <div className="grid grid-cols-7 border-l">
                  {calendarCells.map((day, index) =>
                    day ? (
                      <button
                        key={day.delivery_date}
                        type="button"
                        disabled={
                          !day.is_available ||
                          day.capacity_status === "full"
                        }
                        onClick={() => openNewDelivery(day)}
                        className={`min-h-24 border-b border-r p-2 text-left transition hover:ring-2 hover:ring-inset hover:ring-slate-400 disabled:cursor-not-allowed ${
                          day.capacity_status === "available"
                            ? "border-emerald-200 bg-emerald-100"
                            : day.capacity_status === "almost_full"
                              ? "border-amber-300 bg-amber-100"
                              : day.capacity_status === "full"
                                ? "border-red-300 bg-red-100"
                                : "border-slate-300 bg-slate-200"
                        }`}
                      >
                        <div className="font-bold text-slate-900">
                          {Number(day.delivery_date.slice(-2))}
                        </div>
                        <div className="mt-2 text-xs font-semibold text-slate-800">
                          {day.booked}/{day.daily_limit}
                        </div>
                        <div className="text-[11px] font-medium text-slate-700">
                          {day.capacity_status === "closed"
                            ? "Fechado"
                            : day.capacity_status === "full"
                              ? "Lotado"
                              : `${day.remaining} vaga(s)`}
                        </div>
                      </button>
                    ) : (
                      <div
                        key={`blank-${index}`}
                        className="min-h-24 border-b border-r bg-white"
                      />
                    )
                  )}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-xl border bg-white">
              <div className="border-b px-5 py-4">
                <h2 className="font-bold text-slate-950">
                  Entregas da loja
                </h2>
              </div>

              {loading ? (
                <div className="p-10 text-center text-slate-500">
                  A carregar entregas...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                      <tr>
                        <Th>Data</Th>
                        <Th>Referência</Th>
                        <Th>Destinatário</Th>
                        <Th>Venda</Th>
                        <Th>Horário</Th>
                        <Th>Entregador</Th>
                        <Th>Estado</Th>
                        <Th>Ação</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredDeliveries.map((delivery) => (
                        <tr key={delivery.id}>
                          <Td>{formatDate(delivery.delivery_date)}</Td>
                          <Td>{delivery.delivery_number}</Td>
                          <Td>
                            <div className="font-medium text-slate-900">
                              {delivery.recipient_name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {delivery.recipient_phone || "Sem telefone"}
                            </div>
                          </Td>
                          <Td>{delivery.sale_number || "—"}</Td>
                          <Td>
                            {formatTime(delivery.delivery_window_start)}
                            {" – "}
                            {formatTime(delivery.delivery_window_end)}
                          </Td>
                          <Td>{delivery.assigned_to_name || "Por atribuir"}</Td>
                          <Td>
                            <DeliveryStatus status={delivery.status} />
                          </Td>
                          <Td>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => setSelectedDelivery(delivery)}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                              >
                                Ver
                              </button>

                              {canManage &&
                                !["delivered", "cancelled"].includes(
                                  delivery.status
                                ) && (
                                  <button
                                    onClick={() =>
                                      openEditDelivery(delivery)
                                    }
                                    className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700"
                                  >
                                    Corrigir
                                  </button>
                                )}

                              {nextStatus(delivery.status) && (
                                <button
                                  disabled={statusBusyId === delivery.id}
                                  onClick={() =>
                                    void changeStatus(
                                      delivery,
                                      nextStatus(delivery.status)!
                                    )
                                  }
                                  className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  {nextStatusLabel(delivery.status)}
                                </button>
                              )}

                              {delivery.status === "in_transit" && (
                                <button
                                  disabled={statusBusyId === delivery.id}
                                  onClick={() =>
                                    void changeStatus(delivery, "failed")
                                  }
                                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                                >
                                  Falhou
                                </button>
                              )}

                              {canManage &&
                                !["delivered", "cancelled"].includes(
                                  delivery.status
                                ) && (
                                  <button
                                    disabled={statusBusyId === delivery.id}
                                    onClick={() =>
                                      void changeStatus(delivery, "cancelled")
                                    }
                                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                                  >
                                    Cancelar
                                  </button>
                                )}
                            </div>
                          </Td>
                        </tr>
                      ))}

                      {!filteredDeliveries.length && (
                        <tr>
                          <td
                            colSpan={8}
                            className="p-10 text-center text-slate-500"
                          >
                            Nenhuma entrega encontrada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {formOpen && (
        <Modal
          title={
            editingDeliveryId
              ? "Corrigir Entrega"
              : "Agendar Entrega"
          }
          subtitle={
            editingDeliveryId
              ? "Alterar data, hora ou dados da entrega"
              : "Registar uma nova entrega para o cliente"
          }
          onClose={() => {
            setFormOpen(false);
            setEditingDeliveryId(null);
          }}
          footer={
            <>
              <button
                onClick={() => {
                  setFormOpen(false);
                  setEditingDeliveryId(null);
                }}
                disabled={saving}
                className="rounded-xl border px-4 py-2.5 font-semibold text-slate-600 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => void createDelivery()}
                disabled={saving}
                className="rounded-xl bg-slate-950 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? editingDeliveryId
                    ? "A guardar..."
                    : "A agendar..."
                  : editingDeliveryId
                    ? "Guardar Correções"
                    : "Agendar Entrega"}
              </button>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Loja *"
              value={form.location_id}
              onChange={(value) =>
                setForm({
                  ...form,
                  location_id: value,
                  sales_order_id: "",
                })
              }
              options={locations.map((location) => ({
                value: location.id,
                label: `${location.name} · ${location.location_code}`,
              }))}
              disabled={Boolean(editingDeliveryId)}
            />

            <SelectField
              label="Venda associada"
              value={form.sales_order_id}
              onChange={chooseSale}
              placeholder="Sem venda associada"
              options={salesOrders
                .filter(
                  (sale) =>
                    !form.location_id ||
                    sale.location_id === form.location_id
                )
                .map((sale) => ({
                  value: sale.id,
                  label: `${sale.sale_number} · ${
                    sale.customer_name || "Sem cliente"
                  }`,
                }))}
              disabled={Boolean(editingDeliveryId)}
            />

            <Field
              label="Data *"
              type="date"
              value={form.delivery_date}
              min={todayText}
              onChange={(value) =>
                setForm({ ...form, delivery_date: value })
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Início"
                type="time"
                value={form.delivery_window_start}
                onChange={(value) =>
                  setForm({
                    ...form,
                    delivery_window_start: value,
                  })
                }
              />
              <Field
                label="Fim"
                type="time"
                value={form.delivery_window_end}
                onChange={(value) =>
                  setForm({
                    ...form,
                    delivery_window_end: value,
                  })
                }
              />
            </div>

            <Field
              label="Destinatário"
              value={form.recipient_name}
              placeholder="Preenchido pela venda, se disponível"
              onChange={(value) =>
                setForm({ ...form, recipient_name: value })
              }
            />

            <Field
              label="Telefone"
              value={form.recipient_phone}
              onChange={(value) =>
                setForm({ ...form, recipient_phone: value })
              }
            />

            <div className="md:col-span-2">
              <Field
                label="Morada de entrega"
                value={form.delivery_address}
                placeholder="Preenchida pelo cliente da venda, se disponível"
                onChange={(value) =>
                  setForm({ ...form, delivery_address: value })
                }
              />
            </div>

            <Field
              label="Cidade"
              value={form.city}
              onChange={(value) => setForm({ ...form, city: value })}
            />

            <SelectField
              label="Método"
              value={form.delivery_method}
              onChange={(value) =>
                setForm({ ...form, delivery_method: value })
              }
              options={[
                { value: "own_delivery", label: "Entrega própria" },
                { value: "motorbike", label: "Motorizada" },
                { value: "courier", label: "Transportadora" },
                {
                  value: "customer_collection",
                  label: "Recolha pelo cliente",
                },
                { value: "other", label: "Outro" },
              ]}
            />

            <Field
              label="Entregador / Motorista"
              value={form.assigned_to_name}
              onChange={(value) =>
                setForm({ ...form, assigned_to_name: value })
              }
            />

            <Field
              label="Custo da entrega"
              type="number"
              value={form.delivery_fee}
              onChange={(value) =>
                setForm({ ...form, delivery_fee: value })
              }
            />

            <div className="md:col-span-2">
              <TextArea
                label="Instruções do cliente"
                value={form.customer_instructions}
                onChange={(value) =>
                  setForm({
                    ...form,
                    customer_instructions: value,
                  })
                }
              />
            </div>

            <div className="md:col-span-2">
              <TextArea
                label="Notas internas"
                value={form.internal_notes}
                onChange={(value) =>
                  setForm({ ...form, internal_notes: value })
                }
              />
            </div>
          </div>
        </Modal>
      )}

      {settingsOpen && (
        <Modal
          title="Capacidade de Entregas"
          subtitle={
            currentSettings?.location_name ||
            "Configuração da loja"
          }
          onClose={() => setSettingsOpen(false)}
          footer={
            <>
              <button
                onClick={() => setSettingsOpen(false)}
                disabled={saving}
                className="rounded-xl border px-4 py-2.5 font-semibold text-slate-600 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => void saveSettings()}
                disabled={saving}
                className="rounded-xl bg-slate-950 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {saving ? "A guardar..." : "Guardar"}
              </button>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Máximo de entregas por dia"
              type="number"
              value={settingsForm.max_deliveries_per_day}
              onChange={(value) =>
                setSettingsForm({
                  ...settingsForm,
                  max_deliveries_per_day: value,
                })
              }
            />

            <Field
              label="Aviso quando atingir (%)"
              type="number"
              value={settingsForm.warning_percentage}
              onChange={(value) =>
                setSettingsForm({
                  ...settingsForm,
                  warning_percentage: value,
                })
              }
            />

            <Field
              label="Início do dia"
              type="time"
              value={settingsForm.working_day_start}
              onChange={(value) =>
                setSettingsForm({
                  ...settingsForm,
                  working_day_start: value,
                })
              }
            />

            <Field
              label="Fim do dia"
              type="time"
              value={settingsForm.working_day_end}
              onChange={(value) =>
                setSettingsForm({
                  ...settingsForm,
                  working_day_end: value,
                })
              }
            />

            <div className="md:col-span-2">
              <div className="mb-2 text-sm font-medium text-slate-700">
                Dias disponíveis
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  [1, "Segunda"],
                  [2, "Terça"],
                  [3, "Quarta"],
                  [4, "Quinta"],
                  [5, "Sexta"],
                  [6, "Sábado"],
                  [7, "Domingo"],
                ].map(([value, label]) => {
                  const day = Number(value);
                  const checked =
                    settingsForm.available_weekdays.includes(day);

                  return (
                    <label
                      key={day}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${
                        checked
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSettingsForm((current) => ({
                            ...current,
                            available_weekdays: checked
                              ? current.available_weekdays.filter(
                                  (item) => item !== day
                                )
                              : [
                                  ...current.available_weekdays,
                                  day,
                                ].sort(),
                          }))
                        }
                        className="sr-only"
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {selectedDelivery && (
        <Modal
          title="Detalhes da Entrega"
          subtitle={selectedDelivery.delivery_number}
          onClose={() => setSelectedDelivery(null)}
          footer={
            <button
              onClick={() => setSelectedDelivery(null)}
              className="rounded-xl border px-4 py-2.5 font-semibold text-slate-700"
            >
              Fechar
            </button>
          }
        >
          <div className="grid gap-5 md:grid-cols-3">
            <Detail
              label="Data"
              value={formatDate(selectedDelivery.delivery_date)}
            />
            <Detail
              label="Horário"
              value={`${formatTime(
                selectedDelivery.delivery_window_start
              )} – ${formatTime(
                selectedDelivery.delivery_window_end
              )}`}
            />
            <Detail
              label="Estado"
              value={statusLabel(selectedDelivery.status)}
            />
            <Detail
              label="Destinatário"
              value={selectedDelivery.recipient_name}
            />
            <Detail
              label="Telefone"
              value={selectedDelivery.recipient_phone || "—"}
            />
            <Detail
              label="Venda"
              value={selectedDelivery.sale_number || "—"}
            />
            <Detail
              label="Entregador"
              value={selectedDelivery.assigned_to_name || "Por atribuir"}
            />
            <Detail
              label="Custo"
              value={money(selectedDelivery.delivery_fee)}
            />
            <Detail
              label="Loja"
              value={selectedDelivery.location_name}
            />
            <div className="md:col-span-3">
              <Detail
                label="Morada"
                value={`${selectedDelivery.delivery_address}${
                  selectedDelivery.city
                    ? `, ${selectedDelivery.city}`
                    : ""
                }`}
              />
            </div>
          </div>
        </Modal>
      )}
      </div>
    </PermissionGate>
  );
}

function statusLabel(status: Delivery["status"]) {
  const labels: Record<Delivery["status"], string> = {
    scheduled: "Agendada",
    preparing: "Em preparação",
    ready: "Pronta",
    in_transit: "Em trânsito",
    delivered: "Entregue",
    failed: "Falhada",
    cancelled: "Cancelada",
  };

  return labels[status];
}

function nextStatus(status: Delivery["status"]): Delivery["status"] | null {
  const next: Partial<Record<Delivery["status"], Delivery["status"]>> = {
    scheduled: "preparing",
    preparing: "ready",
    ready: "in_transit",
    in_transit: "delivered",
    failed: "scheduled",
  };

  return next[status] || null;
}

function nextStatusLabel(status: Delivery["status"]) {
  const labels: Partial<Record<Delivery["status"], string>> = {
    scheduled: "Preparar",
    preparing: "Marcar pronta",
    ready: "Enviar",
    in_transit: "Entregue",
    failed: "Reabrir",
  };

  return labels[status] || "Avançar";
}

function DeliveryStatus({ status }: { status: Delivery["status"] }) {
  const styles: Record<Delivery["status"], string> = {
    scheduled: "bg-blue-100 text-blue-700",
    preparing: "bg-amber-100 text-amber-700",
    ready: "bg-violet-100 text-violet-700",
    in_transit: "bg-cyan-100 text-cyan-700",
    delivered: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-slate-200 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-950">
        {value}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`h-3.5 w-3.5 rounded-full ring-1 ring-black/10 ${color}`}
      />
      <span className="text-slate-700">{label}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  min?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-medium text-slate-700">
        {label}
      </div>
      <input
        type={type}
        value={value}
        min={min}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950 placeholder:text-slate-400"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-medium text-slate-700">
        {label}
      </div>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        {placeholder !== undefined && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
      <div className="mb-1.5 text-sm font-medium text-slate-700">
        {label}
      </div>
      <textarea
        value={value}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950"
      />
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase text-slate-500">
        {label}
      </div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Modal({
  title,
  subtitle,
  children,
  footer,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3">
      <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b px-5 py-4 md:px-6">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-slate-400"
          >
            ×
          </button>
        </div>

        <div className="p-5 md:p-6">{children}</div>

        <div className="flex justify-end gap-3 border-t px-5 py-4 md:px-6">
          {footer}
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-slate-700">{children}</td>;
}

function NavItem({
  label,
  icon,
  href,
  active = false,
}: {
  label: string;
  icon: string;
  href: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition ${
        active
          ? "bg-white text-slate-950"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="w-5 text-center">{icon}</span>
      <span>{label}</span>
    </a>
  );
}
