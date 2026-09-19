"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import MobileNav from "@/components/MobileNav";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Balance = {
  product_id: string;
  sku: string;
  product_name: string;
  location_id: string;
  location_code: string;
  location_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  weighted_average_cost: number;
  stock_value: number;
};

type Movement = {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  location_id: string;
  location_code: string;
  location_name: string;
  movement_type: string;
  quantity: number;
  unit_cost: number | null;
  currency: string | null;
  reference_type: string | null;
  reference_number: string | null;
  reason: string | null;
  notes: string | null;
  occurred_at: string;
  created_at: string;
};

type InventoryLocation = {
  id: string;
  location_code: string;
  name: string;
  location_type?: string;
};

type QuarantineRecord = {
  id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  location_id: string;
  location_code: string;
  location_name: string;
  reference_number: string;
  quantity_original: number;
  quantity_remaining: number;
  unit_cost: number;
  currency: string;
  reason: string;
  notes: string | null;
  status: "open" | "resolved";
  resolution_action: string | null;
  resolution_notes: string | null;
  created_by_name: string;
  resolved_by_name: string | null;
  created_at: string;
  resolved_at: string | null;
};

export default function InventoryPage() {
  const router = useRouter();

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [inventoryLocations, setInventoryLocations] =
    useState<InventoryLocation[]>([]);
  const [operationalLocations, setOperationalLocations] =
    useState<InventoryLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"balances" | "movements" | "quarantine">("balances");
  const [search, setSearch] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<Balance | null>(null);
  const [adjustType, setAdjustType] = useState<"adjustment_in" | "adjustment_out">("adjustment_out");
  const [adjustQty, setAdjustQty] = useState("1");
  const [adjustCost, setAdjustCost] = useState("");
  const [adjustReference, setAdjustReference] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferItem, setTransferItem] = useState<Balance | null>(null);
  const [transferDestination, setTransferDestination] = useState("");
  const [transferQty, setTransferQty] = useState("1");
  const [transferReference, setTransferReference] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [transferSaving, setTransferSaving] = useState(false);

  const [quarantine, setQuarantine] = useState<QuarantineRecord[]>([]);
  const [quarantineLoading, setQuarantineLoading] = useState(false);
  const [quarantineOpen, setQuarantineOpen] = useState(false);
  const [quarantineItem, setQuarantineItem] = useState<Balance | null>(null);
  const [quarantineQty, setQuarantineQty] = useState("1");
  const [quarantineReason, setQuarantineReason] = useState("Produto danificado");
  const [quarantineNotes, setQuarantineNotes] = useState("");
  const [quarantineReference, setQuarantineReference] = useState("");
  const [quarantineSaving, setQuarantineSaving] = useState(false);
  const [resolvingQuarantineId, setResolvingQuarantineId] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/");
        return;
      }

      try {
        setLoading(true);
        setError("");

        setFirebaseUser(user);
        const token = await user.getIdToken();

        const [
          balancesResponse,
          movementsResponse,
          inventoryLocationsResponse,
          operationalLocationsResponse,
        ] = await Promise.all([
          fetch(`${API_URL}/api/inventory/balances`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_URL}/api/inventory/movements`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_URL}/api/inventory/locations`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_URL}/api/locations`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!balancesResponse.ok) {
          throw new Error(`API de saldos: ${balancesResponse.status}`);
        }

        if (!movementsResponse.ok) {
          throw new Error(`API de movimentos: ${movementsResponse.status}`);
        }

        if (!inventoryLocationsResponse.ok) {
          throw new Error(
            `API de lojas do inventário: ${inventoryLocationsResponse.status}`
          );
        }

        if (!operationalLocationsResponse.ok) {
          throw new Error(
            `API de lojas operacionais: ${operationalLocationsResponse.status}`
          );
        }

        const balancesData = await balancesResponse.json();
        const movementsData = await movementsResponse.json();
        const inventoryLocationsData =
          await inventoryLocationsResponse.json();
        const operationalLocationsData =
          await operationalLocationsResponse.json();

        setBalances(balancesData.balances || []);
        setMovements(movementsData.movements || []);
        setInventoryLocations(
          inventoryLocationsData.locations || inventoryLocationsData || []
        );
        setOperationalLocations(
          operationalLocationsData.locations || operationalLocationsData || []
        );
      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar os dados do inventário.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!firebaseUser) return;

    const authenticatedUser = firebaseUser;

    async function loadSelectedInventory() {
      try {
        setLoading(true);
        setError("");

        const token = await authenticatedUser.getIdToken();
        const query = selectedLocationId
          ? `?location_id=${encodeURIComponent(selectedLocationId)}`
          : "";

        const [balancesResponse, movementsResponse] = await Promise.all([
          fetch(`${API_URL}/api/inventory/balances${query}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_URL}/api/inventory/movements${query}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!balancesResponse.ok) {
          throw new Error(`API de saldos: ${balancesResponse.status}`);
        }

        if (!movementsResponse.ok) {
          throw new Error(`API de movimentos: ${movementsResponse.status}`);
        }

        const balancesData = await balancesResponse.json();
        const movementsData = await movementsResponse.json();

        setBalances(balancesData.balances || []);
        setMovements(movementsData.movements || []);
      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar o inventário desta loja.");
      } finally {
        setLoading(false);
      }
    }

    loadSelectedInventory();
  }, [firebaseUser, selectedLocationId]);

  useEffect(() => {
    if (!firebaseUser || !selectedLocationId) {
      setQuarantine([]);
      return;
    }

    void loadQuarantine(selectedLocationId);
  }, [firebaseUser, selectedLocationId]);

  async function loadQuarantine(locationId: string) {
    if (!auth.currentUser || !locationId) return;

    try {
      setQuarantineLoading(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(
        `${API_URL}/api/inventory/quarantine?location_id=${encodeURIComponent(locationId)}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Não foi possível carregar o stock em quarentena.");
      }

      const data = await response.json();
      setQuarantine(data.quarantine || []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar o stock em quarentena."
      );
    } finally {
      setQuarantineLoading(false);
    }
  }

  function openQuarantine(item: Balance) {
    setQuarantineItem(item);
    setQuarantineQty("1");
    setQuarantineReason("Produto danificado");
    setQuarantineNotes("");
    setQuarantineReference("");
    setError("");
    setQuarantineOpen(true);
  }

  async function submitQuarantine() {
    if (!quarantineItem || !auth.currentUser) return;

    const quantity = Number(quarantineQty);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Introduza uma quantidade válida.");
      return;
    }
    if (quantity > Number(quarantineItem.quantity_available || 0)) {
      setError(
        `Stock disponível insuficiente. Disponível: ${formatQty(
          quarantineItem.quantity_available
        )}.`
      );
      return;
    }
    if (!quarantineReason.trim()) {
      setError("Selecione ou escreva o motivo da quarentena.");
      return;
    }

    try {
      setQuarantineSaving(true);
      setError("");
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_URL}/api/inventory/quarantine`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: quarantineItem.product_id,
          location_id: quarantineItem.location_id,
          quantity,
          reason: quarantineReason.trim(),
          notes: quarantineNotes.trim() || null,
          reference_number: quarantineReference.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const detail = data.detail || `Falha ao colocar o produto em quarentena: ${response.status}`;
        throw new Error(
          typeof detail === "string"
            ? detail
                .replace("Insufficient available stock. Available quantity:", "Stock disponível insuficiente. Quantidade disponível:")
                .replace("Reason is required", "O motivo é obrigatório.")
                .replace("Quantity must be greater than zero", "A quantidade deve ser superior a zero.")
            : "Falha ao colocar o produto em quarentena."
        );
      }

      setQuarantineOpen(false);
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Falha ao colocar o produto em quarentena."
      );
    } finally {
      setQuarantineSaving(false);
    }
  }

  async function resolveQuarantine(
    record: QuarantineRecord,
    action: "restored" | "written_off" | "returned_to_supplier"
  ) {
    if (!auth.currentUser) return;

    const actionNames = {
      restored: "restaurar este produto ao stock disponível",
      written_off: "abater definitivamente este produto",
      returned_to_supplier: "registar a devolução deste produto ao fornecedor",
    };

    if (!window.confirm(`Confirma que pretende ${actionNames[action]}?`)) return;
    const notes = window.prompt("Notas da resolução (opcional):", "") || null;

    try {
      setResolvingQuarantineId(record.id);
      setError("");
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(
        `${API_URL}/api/inventory/quarantine/${record.id}/resolve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action, notes }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Não foi possível resolver a quarentena.");
      }

      await loadQuarantine(record.location_id);
      const currentLocation = selectedLocationId;
      if (action === "restored" && currentLocation) {
        window.location.reload();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível resolver a quarentena."
      );
    } finally {
      setResolvingQuarantineId("");
    }
  }

  function openAdjustment(item: Balance) {
    setAdjustItem(item);
    setAdjustType("adjustment_out");
    setAdjustQty("1");
    setAdjustCost("");
    setAdjustReference("");
    setAdjustReason("");
    setAdjustNotes("");
    setAdjustOpen(true);
  }

  async function handleLogout() {
    await signOut(auth);
    router.replace("/");
  }

  async function submitAdjustment() {
    if (!adjustItem || !auth.currentUser) return;
    if (Number(adjustQty) <= 0 || !adjustReason.trim()) {
      setError("A quantidade e o motivo são obrigatórios.");
      return;
    }
    if (
      adjustType === "adjustment_in" &&
      (adjustCost.trim() === "" || Number(adjustCost) < 0)
    ) {
      setError("Introduza um custo unitário válido.");
      return;
    }

    setAdjustSaving(true);
    setError("");

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_URL}/api/inventory/adjustments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: adjustItem.product_id,
          location_id: adjustItem.location_id,
          adjustment_type: adjustType,
          quantity: Number(adjustQty),
          unit_cost: adjustType === "adjustment_in" ? Number(adjustCost) : null,
          currency: "AOA",
          reference_number: adjustReference || null,
          reason: adjustReason,
          notes: adjustNotes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Falha ao efetuar o ajuste: ${response.status}`);
      }

      setAdjustOpen(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao efetuar o ajuste.");
    } finally {
      setAdjustSaving(false);
    }
  }

  function openTransfer(item: Balance) {
    const destinations = operationalLocations.filter(
      (location) => location.id !== item.location_id
    );

    setTransferItem(item);
    setTransferDestination(destinations[0]?.id || "");
    setTransferQty("1");
    setTransferReference("");
    setTransferReason("");
    setTransferNotes("");
    setError("");
    setTransferOpen(true);
  }

  async function submitTransfer() {
    if (!transferItem || !auth.currentUser) return;

    const quantity = Number(transferQty);

    if (!transferDestination) {
      setError("Selecione a localização de destino.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Introduza uma quantidade válida.");
      return;
    }

    if (quantity > Number(transferItem.quantity_available || 0)) {
      setError(
        `Stock disponível insuficiente. Disponível: ${formatQty(
          transferItem.quantity_available
        )}.`
      );
      return;
    }

    setTransferSaving(true);
    setError("");

    try {
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(`${API_URL}/api/inventory/transfers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: transferItem.product_id,
          from_location_id: transferItem.location_id,
          to_location_id: transferDestination,
          quantity,
          reference_number: transferReference.trim() || null,
          reason: transferReason.trim() || null,
          notes: transferNotes.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        const detailTranslations: Record<string, string> = {
          "Origin and destination locations must be different":
            "A localização de origem e destino devem ser diferentes.",
          "Product not found": "Produto não encontrado.",
          "Origin location not found":
            "Localização de origem não encontrada.",
          "Destination location not found":
            "Localização de destino não encontrada.",
        };

        const detail =
          typeof data.detail === "string"
            ? data.detail
            : `Falha ao transferir stock: ${response.status}`;

        if (detail.startsWith("Insufficient available stock.")) {
          throw new Error(
            detail.replace(
              "Insufficient available stock. Available quantity:",
              "Stock disponível insuficiente. Quantidade disponível:"
            )
          );
        }

        throw new Error(detailTranslations[detail] || detail);
      }

      setTransferOpen(false);
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Falha ao transferir stock."
      );
    } finally {
      setTransferSaving(false);
    }
  }

  const transferDestinations = transferItem
    ? operationalLocations
        .filter((location) => location.id !== transferItem.location_id)
        .map((location) => ({
          location_id: location.id,
          location_code: location.location_code,
          location_name: location.name,
        }))
    : [];

  const filteredBalances = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return balances;

    return balances.filter(
      (item) =>
        item.sku.toLowerCase().includes(q) ||
        item.product_name.toLowerCase().includes(q) ||
        item.location_name.toLowerCase().includes(q)
    );
  }, [balances, search]);

  const filteredMovements = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return movements;

    return movements.filter(
      (item) =>
        item.sku.toLowerCase().includes(q) ||
        item.product_name.toLowerCase().includes(q) ||
        item.movement_type.toLowerCase().includes(q) ||
        (item.reference_number || "").toLowerCase().includes(q)
    );
  }, [movements, search]);

  const filteredQuarantine = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quarantine;

    return quarantine.filter(
      (item) =>
        item.product_sku.toLowerCase().includes(q) ||
        item.product_name.toLowerCase().includes(q) ||
        item.location_name.toLowerCase().includes(q) ||
        (item.reference_number || "").toLowerCase().includes(q) ||
        (item.reason || "").toLowerCase().includes(q)
    );
  }, [quarantine, search]);

  const totalUnits = balances.reduce(
    (sum, item) => sum + Number(item.quantity_on_hand || 0),
    0
  );

  const totalStockValue = balances.reduce(
    (sum, item) => sum + Number(item.stock_value || 0),
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="text-slate-600">A carregar inventário...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-slate-950 text-white lg:block">
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <div>
            <div className="text-xl font-bold tracking-tight">PEN</div>
            <div className="text-xs text-slate-400">Inventário</div>
          </div>
        </div>

        <nav className="space-y-1 px-3 py-5 text-sm">
          {[
            ["Painel", "/dashboard", "⌂"],
            ["Produtos", "/products", "▦"],
            ["Inventário", "/inventory", "▣"],
            ["Compras", "/purchases", "↓"],
            ["Vendas", "/sales", "↑"],
            ["Fornecedores", "/suppliers", "♢"],
            ["Clientes", "/customers", "♙"],
            ["Relatórios", "/reports", "▤"],
            ["Utilizadores", "/users", "♧"],
            ["Definições", "/settings", "⚙"],
          ].map(([label, href, icon]) => (
            <button
              key={label}
              onClick={() => router.push(href)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium ${
                href === "/inventory"
                  ? "bg-white text-slate-950"
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="w-5 text-center">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Terminar Sessão
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-4 md:px-8">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                  Inventário
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Saldos de stock e histórico de movimentos de inventário
                </p>
              </div>

              <div className="min-w-[220px]">
                <label
                  htmlFor="inventory-store"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Loja do Inventário
                </label>

                <select
                  id="inventory-store"
                  value={selectedLocationId}
                  onChange={(event) =>
                    setSelectedLocationId(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-slate-400"
                >
                  <option value="">
                    Todas as lojas
                  </option>

                  {inventoryLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} · {location.location_code}
                    </option>
                  ))}
                </select>

                <div className="mt-1 text-xs text-slate-500">
                  {selectedLocationId
                    ? "Inventário da loja selecionada"
                    : "Inventário de todas as lojas autorizadas"}
                </div>
              </div>
            </div>

            <MobileNav onLogout={handleLogout} />
          </div>
        </header>

        <main className="p-4 md:p-8">

          {error && (
            <div className="mb-5 rounded-lg bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryCard
              label="Produtos / Localizações"
              value={String(balances.length)}
            />
            <SummaryCard
              label="Unidades em Stock"
              value={formatQty(totalUnits)}
            />
            <SummaryCard
              label="Valor do Stock"
              value={formatMoney(totalStockValue, "AOA")}
            />
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setTab("balances")}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                tab === "balances"
                  ? "bg-slate-900 text-white"
                  : "border bg-white text-slate-700"
              }`}
            >
              Saldos de Stock
            </button>

            <button
              onClick={() => setTab("movements")}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                tab === "movements"
                  ? "bg-slate-900 text-white"
                  : "border bg-white text-slate-700"
              }`}
            >
              Histórico de Movimentos
            </button>

            <button
              onClick={() => setTab("quarantine")}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                tab === "quarantine"
                  ? "bg-amber-600 text-white"
                  : "border bg-white text-slate-700"
              }`}
            >
              Stock em Quarentena
            </button>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar SKU, produto ou referência..."
              className="ml-auto w-80 rounded-lg border bg-white px-4 py-2 text-sm"
            />
          </div>

          {tab === "balances" && (
            <div className="overflow-hidden rounded-xl border bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <Th>SKU</Th>
                      <Th>Produto</Th>
                      <Th>Localização</Th>
                      <Th>Em Stock</Th>
                      <Th>Reservado</Th>
                      <Th>Disponível</Th>
                      <Th>Custo Médio</Th>
                      <Th>Valor do Stock</Th>
                      <Th>Ação</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredBalances.map((item) => (
                      <tr
                        key={`${item.product_id}-${item.location_id}`}
                        className="border-t"
                      >
                        <Td>{item.sku}</Td>
                        <Td>{item.product_name}</Td>
                        <Td>{item.location_name}</Td>
                        <Td>{formatQty(item.quantity_on_hand)}</Td>
                        <Td>{formatQty(item.quantity_reserved)}</Td>
                        <Td>{formatQty(item.quantity_available)}</Td>
                        <Td>
                          {formatMoney(
                            Number(item.weighted_average_cost || 0),
                            "AOA"
                          )}
                        </Td>
                        <Td>
                          {formatMoney(
                            Number(item.stock_value || 0),
                            "AOA"
                          )}
                        </Td>
                        <Td>
                          {operationalLocations.some(
                            (location) => location.id === item.location_id
                          ) ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => openAdjustment(item)}
                                className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                              >
                                Ajustar
                              </button>

                              <button
                                onClick={() => openQuarantine(item)}
                                disabled={Number(item.quantity_available || 0) <= 0}
                                className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Quarentena
                              </button>

                              <button
                                onClick={() => openTransfer(item)}
                                disabled={
                                  Number(item.quantity_available || 0) <= 0 ||
                                  operationalLocations.filter(
                                    (location) =>
                                      location.id !== item.location_id
                                  ).length === 0
                                }
                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Transferir
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">
                              Apenas consulta
                            </span>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "movements" && (
            <div className="overflow-hidden rounded-xl border bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <Th>Data</Th>
                      <Th>SKU</Th>
                      <Th>Produto</Th>
                      <Th>Localização</Th>
                      <Th>Movimento</Th>
                      <Th>Quantidade</Th>
                      <Th>Custo Unitário</Th>
                      <Th>Referência</Th>
                      <Th>Motivo</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredMovements.map((item) => (
                      <tr key={item.id} className="border-t">
                        <Td>{formatDate(item.occurred_at)}</Td>
                        <Td>{item.sku}</Td>
                        <Td>{item.product_name}</Td>
                        <Td>{item.location_name}</Td>
                        <Td>{formatMovement(item.movement_type)}</Td>
                        <Td>{formatQty(item.quantity)}</Td>
                        <Td>
                          {item.unit_cost !== null
                            ? formatMoney(
                                Number(item.unit_cost),
                                item.currency || "AOA"
                              )
                            : "—"}
                        </Td>
                        <Td>{item.reference_number || "—"}</Td>
                        <Td>{item.reason || "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {tab === "quarantine" && (
            !selectedLocationId ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
                Selecione uma loja em <strong>Loja do Inventário</strong> para consultar e gerir o stock em quarentena.
              </div>
            ) : quarantineLoading ? (
              <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">
                A carregar stock em quarentena...
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-amber-50 text-left text-slate-700">
                      <tr>
                        <Th>Data</Th>
                        <Th>Referência</Th>
                        <Th>Produto</Th>
                        <Th>Localização</Th>
                        <Th>Quantidade</Th>
                        <Th>Motivo</Th>
                        <Th>Registado por</Th>
                        <Th>Estado</Th>
                        <Th>Resolução</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuarantine.length === 0 ? (
                        <tr className="border-t">
                          <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                            Não existem produtos em quarentena nesta loja.
                          </td>
                        </tr>
                      ) : (
                        filteredQuarantine.map((item) => (
                          <tr key={item.id} className="border-t align-top">
                            <Td>{formatDate(item.created_at)}</Td>
                            <Td>{item.reference_number}</Td>
                            <Td>
                              <div className="font-semibold text-slate-900">{item.product_sku}</div>
                              <div className="text-xs text-slate-500">{item.product_name}</div>
                            </Td>
                            <Td>{item.location_name}</Td>
                            <Td>{formatQty(Number(item.quantity_remaining || item.quantity_original || 0))}</Td>
                            <Td>
                              <div>{item.reason}</div>
                              {item.notes && <div className="mt-1 text-xs text-slate-500">{item.notes}</div>}
                            </Td>
                            <Td>{item.created_by_name || "—"}</Td>
                            <Td>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                item.status === "open"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {item.status === "open" ? "Em quarentena" : "Resolvido"}
                              </span>
                            </Td>
                            <Td>
                              {item.status === "open" && operationalLocations.some(
                                (location) => location.id === item.location_id
                              ) ? (
                                <div className="flex min-w-[180px] flex-col gap-2">
                                  <button
                                    onClick={() => resolveQuarantine(item, "restored")}
                                    disabled={resolvingQuarantineId === item.id}
                                    className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                                  >
                                    Restaurar ao stock
                                  </button>
                                  <button
                                    onClick={() => resolveQuarantine(item, "written_off")}
                                    disabled={resolvingQuarantineId === item.id}
                                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    Abater produto
                                  </button>
                                  <button
                                    onClick={() => resolveQuarantine(item, "returned_to_supplier")}
                                    disabled={resolvingQuarantineId === item.id}
                                    className="rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                  >
                                    Devolver ao fornecedor
                                  </button>
                                </div>
                              ) : item.status === "resolved" ? (
                                <div className="text-xs text-slate-600">
                                  <div>{formatQuarantineResolution(item.resolution_action)}</div>
                                  {item.resolved_by_name && <div className="mt-1">Por: {item.resolved_by_name}</div>}
                                  {item.resolved_at && <div>{formatDate(item.resolved_at)}</div>}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">Apenas consulta</span>
                              )}
                            </Td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {transferOpen && transferItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Transferir Stock
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {transferItem.sku} · {transferItem.product_name}
                    </p>

                    <p className="text-sm text-slate-500">
                      Origem: {transferItem.location_name}
                    </p>

                    <p className="text-sm text-slate-500">
                      Disponível:{" "}
                      {formatQty(transferItem.quantity_available)}
                    </p>
                  </div>

                  <button
                    onClick={() => setTransferOpen(false)}
                    className="text-xl text-slate-400 hover:text-slate-700"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Localização de Destino *
                    </label>

                    <select
                      value={transferDestination}
                      onChange={(e) =>
                        setTransferDestination(e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                    >
                      <option value="">Selecionar destino</option>

                      {transferDestinations.map((destination) => (
                        <option
                          key={destination.location_id}
                          value={destination.location_id}
                        >
                          {destination.location_name}
                          {destination.location_code
                            ? ` (${destination.location_code})`
                            : ""}
                        </option>
                      ))}
                    </select>

                    {transferDestinations.length === 0 && (
                      <p className="mt-2 text-xs text-amber-700">
                        Não existe outra localização ativa disponível
                        para este produto.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Quantidade *
                    </label>

                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      max={Number(
                        transferItem.quantity_available || 0
                      )}
                      value={transferQty}
                      onChange={(e) => setTransferQty(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                    />

                    <p className="mt-1 text-xs text-slate-500">
                      Máximo disponível:{" "}
                      {formatQty(transferItem.quantity_available)}
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Referência
                    </label>

                    <input
                      value={transferReference}
                      onChange={(e) =>
                        setTransferReference(e.target.value)
                      }
                      placeholder="Automática se ficar em branco"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Motivo
                    </label>

                    <input
                      value={transferReason}
                      onChange={(e) =>
                        setTransferReason(e.target.value)
                      }
                      placeholder="Ex.: Reposição de stock da loja"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Notas
                    </label>

                    <textarea
                      value={transferNotes}
                      onChange={(e) =>
                        setTransferNotes(e.target.value)
                      }
                      rows={3}
                      placeholder="Informação adicional sobre a transferência"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setTransferOpen(false)}
                    disabled={transferSaving}
                    className="rounded-lg border px-4 py-2"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={submitTransfer}
                    disabled={
                      transferSaving ||
                      !transferDestination ||
                      transferDestinations.length === 0
                    }
                    className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {transferSaving
                      ? "A transferir..."
                      : "Confirmar Transferência"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {quarantineOpen && quarantineItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Colocar em Quarentena</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {quarantineItem.sku} · {quarantineItem.product_name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {quarantineItem.location_name} · Disponível: {formatQty(quarantineItem.quantity_available)}
                    </p>
                  </div>
                  <button
                    onClick={() => setQuarantineOpen(false)}
                    className="text-xl text-slate-400 hover:text-slate-700"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Quantidade *</label>
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      max={Number(quarantineItem.quantity_available || 0)}
                      value={quarantineQty}
                      onChange={(e) => setQuarantineQty(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Motivo *</label>
                    <select
                      value={quarantineReason}
                      onChange={(e) => setQuarantineReason(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                    >
                      <option>Produto danificado</option>
                      <option>Produto partido</option>
                      <option>Embalagem danificada</option>
                      <option>Defeito de fabrico</option>
                      <option>Devolução de cliente para inspeção</option>
                      <option>Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Referência</label>
                    <input
                      value={quarantineReference}
                      onChange={(e) => setQuarantineReference(e.target.value)}
                      placeholder="Automática se ficar em branco"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
                    <textarea
                      value={quarantineNotes}
                      onChange={(e) => setQuarantineNotes(e.target.value)}
                      rows={3}
                      placeholder="Descreva o estado do produto"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setQuarantineOpen(false)}
                    disabled={quarantineSaving}
                    className="rounded-lg border px-4 py-2"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={submitQuarantine}
                    disabled={quarantineSaving}
                    className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {quarantineSaving ? "A guardar..." : "Confirmar Quarentena"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {adjustOpen && adjustItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Ajustar Stock
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {adjustItem.sku} · {adjustItem.product_name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {adjustItem.location_name} · Em stock: {formatQty(adjustItem.quantity_on_hand)}
                    </p>
                  </div>

                  <button
                    onClick={() => setAdjustOpen(false)}
                    className="text-xl text-slate-400 hover:text-slate-700"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Ajuste</label>
                    <select
                      value={adjustType}
                      onChange={(e) =>
                        setAdjustType(
                          e.target.value as "adjustment_in" | "adjustment_out"
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    >
                      <option value="adjustment_out">Diminuir stock</option>
                      <option value="adjustment_in">Aumentar stock</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Quantidade</label>
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  {adjustType === "adjustment_in" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Custo Unitário (AOA)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={adjustCost}
                        onChange={(e) => setAdjustCost(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Referência
                    </label>
                    <input
                      value={adjustReference}
                      onChange={(e) => setAdjustReference(e.target.value)}
                      placeholder="e.g. GR-000002-REV"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Motivo *
                    </label>
                    <input
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      placeholder="Motivo do ajuste de stock"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
                    <textarea
                      value={adjustNotes}
                      onChange={(e) => setAdjustNotes(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setAdjustOpen(false)}
                    className="rounded-lg border px-4 py-2"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={submitAdjustment}
                    disabled={adjustSaving}
                    className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
                  >
                    {adjustSaving ? "A guardar..." : "Confirmar Ajuste"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-slate-700">{children}</td>;
}

function formatQty(value: number) {
  return Number(value || 0).toLocaleString("en-ZA", {
    maximumFractionDigits: 3,
  });
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMovement(value: string) {
  const translations: Record<string, string> = {
    adjustment_in: "Ajuste de Entrada",
    adjustment_out: "Ajuste de Saída",
    purchase_receipt: "Entrada de Compra",
    purchase_return: "Devolução de Compra",
    sale: "Venda",
    sale_return: "Devolução de Venda",
    transfer_in: "Transferência de Entrada",
    transfer_out: "Transferência de Saída",
    stock_transfer_in: "Transferência de Entrada",
    stock_transfer_out: "Transferência de Saída",
    quarantine_out: "Saída para Quarentena",
    quarantine_restore: "Reposição da Quarentena",
  };

  return (
    translations[value.toLowerCase()] ||
    value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}


function formatQuarantineResolution(value: string | null) {
  const translations: Record<string, string> = {
    restored: "Restaurado ao stock",
    written_off: "Produto abatido",
    returned_to_supplier: "Devolvido ao fornecedor",
  };

  return value ? translations[value] || value : "—";
}
