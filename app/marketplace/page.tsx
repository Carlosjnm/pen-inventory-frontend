"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import MobileNav from "@/components/MobileNav";
import PermissionGate from "@/components/PermissionGate";
import HomepageEditor from "./HomepageEditor";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type CurrentUser = {
  permissions: string[];
};

type Store = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  whatsapp: string | null;
  currency: string;
  default_language: string;
  preparation_time_hours: number;
  minimum_order_amount: number;
  return_policy: string | null;
  delivery_policy: string | null;
  collection_policy: string | null;

  // STORE FULFILMENT SETTINGS V1
  allows_collection: boolean;
  allows_delivery: boolean;

  status: "draft" | "active" | "suspended" | "closed";
  is_accepting_orders: boolean;
  listing_count: number;
  active_listing_count: number;
};

type MarketplaceLocation = {
  id: string;
  location_code: string;
  name: string;
  location_type: string;
  address: string | null;
  city: string | null;
  country: string | null;
};

type NewStoreForm = {
  name: string;
  slug: string;
  location_id: string;
  tagline: string;
  description: string;
};

const emptyNewStoreForm: NewStoreForm = {
  name: "",
  slug: "",
  location_id: "",
  tagline: "",
  description: "",
};

type MarketplaceCampaign = {
  id: string;
  store_id: string | null;
  store_name: string | null;
  store_slug: string | null;
  title: string;
  subtitle: string | null;
  placement:
    | "home_hero"
    | "home_banner"
    | "home_grid";
  button_label: string | null;
  target_url: string | null;
  starts_at: string;
  ends_at: string;
  priority: number;
  status:
    | "draft"
    | "active"
    | "paused"
    | "completed"
    | "cancelled";
  is_paid: boolean;
  price: number;
  currency: string;
  impression_count: number;
  click_count: number;
  has_image: boolean;
};

type CampaignForm = {
  store_id: string;
  title: string;
  subtitle: string;
  placement:
    | "home_hero"
    | "home_banner"
    | "home_grid";
  button_label: string;
  target_url: string;
  starts_at: string;
  ends_at: string;
  priority: string;
  status: "draft" | "active";
  is_paid: boolean;
  price: string;
  currency: string;
};

// CANDIDATURAS PÚBLICAS NAZUNGA V1

type ApplicationStatus =
  | "new"
  | "reviewing"
  | "contacted"
  | "approved"
  | "rejected";

type AdvertisingInquiry = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  business_type: string | null;
  advertising_format: string | null;
  campaign_duration: string | null;
  estimated_budget: string | null;
  message: string | null;
  status: ApplicationStatus;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

type StoreApplication = {
  id: string;
  store_name: string;
  legal_name: string | null;
  contact_name: string;
  email: string;
  phone: string;
  province: string;
  municipality: string;
  address: string | null;
  product_category: string;
  business_description: string;
  approximate_product_count: number | null;
  has_physical_store: boolean;
  sells_online: boolean;
  social_url: string | null;
  needs_delivery: boolean;
  tax_number: string | null;
  notes: string | null;
  status: ApplicationStatus;
  internal_notes: string | null;
  created_store_id: string | null;
  created_at: string;
  updated_at: string;
};

const APPLICATION_STATUSES: Array<{
  value: ApplicationStatus;
  label: string;
}> = [
  { value: "new", label: "Nova" },
  { value: "reviewing", label: "Em análise" },
  { value: "contacted", label: "Contactada" },
  { value: "approved", label: "Aprovada" },
  { value: "rejected", label: "Rejeitada" },
];

function applicationStatusLabel(
  status: ApplicationStatus
) {
  return (
    APPLICATION_STATUSES.find(
      (item) => item.value === status
    )?.label || status
  );
}

function applicationStatusClass(
  status: ApplicationStatus
) {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "rejected") {
    return "bg-red-100 text-red-800";
  }

  if (status === "contacted") {
    return "bg-blue-100 text-blue-800";
  }

  if (status === "reviewing") {
    return "bg-amber-100 text-amber-900";
  }

  return "bg-violet-100 text-violet-800";
}

type ProductCandidate = {
  product_id: string;
  sku: string;
  name: string;
  description: string | null;
  brand: string | null;
  category_id: string | null;
  category_name: string | null;
  selling_price: number | null;
  selling_currency: string | null;
  product_status: string;
  available_quantity: number;
  primary_image_id: string | null;
  listing_id: string | null;
  listing_status: string | null;
  public_price: number | null;
  image_path: string | null;
};

type Listing = {
  id: string;
  store_id: string;
  product_id: string;
  variant_id: string | null;
  category_id: string | null;
  slug: string;
  public_name: string;
  short_description: string | null;
  public_description: string | null;
  public_price: number;
  compare_at_price: number | null;
  currency: string;
  minimum_quantity: number;
  maximum_quantity: number | null;
  stock_buffer: number;
  allow_backorder: boolean;
  is_featured: boolean;
  status: string;
  published_at: string | null;
  sku: string;
  internal_product_name: string;
  category_name: string | null;
  available_quantity: number;
  image_path: string | null;
};

type MarketplaceOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  fulfilment_method: string;
  customer_name: string;
  customer_phone: string;
  customer_whatsapp: string | null;
  customer_email: string | null;
  delivery_city: string | null;
  delivery_province: string | null;
  requested_delivery_date: string | null;
  requested_delivery_time: string | null;
  currency: string;
  subtotal: number;
  delivery_amount: number;
  total_amount: number;
  sales_order_id: string | null;
  created_at: string;
  updated_at: string;
  item_count: number;
  total_quantity: number;
};

type MarketplaceOrderDetail = {
  order: MarketplaceOrder & {
    store_id: string;
    store_slug: string;
    store_name: string;
    delivery_address_line1: string | null;
    delivery_address_line2: string | null;
    delivery_postal_code: string | null;
    delivery_country: string | null;
    collection_location_id: string | null;
    collection_location_code: string | null;
    collection_location_name: string | null;
    discount_amount: number;
    tax_amount: number;
    customer_notes: string | null;
    internal_notes: string | null;
    sale_number: string | null;
    confirmed_at: string | null;
    cancelled_at: string | null;
    completed_at: string | null;
  };
  items: Array<{
    id: string;
    listing_id: string | null;
    product_id: string;
    variant_id: string | null;
    product_name: string;
    sku: string | null;
    variant_name: string | null;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    tax_amount: number;
    line_total: number;
  }>;
  history: Array<{
    id: string;
    previous_status: string | null;
    new_status: string;
    notes: string | null;
    changed_at: string;
    changed_by_name: string | null;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    payment_method: string;
    provider_reference: string | null;
    amount: number;
    currency: string;
    status: string;
    initiated_at: string;
    confirmed_at: string | null;
    failed_at: string | null;
  }>;
};

type ListingForm = {
  product_id: string;
  category_id: string;
  slug: string;
  public_name: string;
  short_description: string;
  public_description: string;
  public_price: string;
  compare_at_price: string;
  minimum_quantity: string;
  maximum_quantity: string;
  stock_buffer: string;
  allow_backorder: boolean;
  is_featured: boolean;
  status: string;
};

const emptyListingForm: ListingForm = {
  product_id: "",
  category_id: "",
  slug: "",
  public_name: "",
  short_description: "",
  public_description: "",
  public_price: "",
  compare_at_price: "",
  minimum_quantity: "1",
  maximum_quantity: "",
  stock_buffer: "0",
  allow_backorder: false,
  is_featured: false,
  status: "draft",
};

function money(value: number | string | null, currency = "AOA") {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function imageUrl(path: string | null) {
  return path ? `${API_URL}${path}` : null;
}

function nextOrderAction(
  status: string,
  fulfilmentMethod: string
) {
  if (status === "confirmed") {
    return {
      status: "preparing",
      label: "Iniciar preparação",
    };
  }

  if (status === "preparing") {
    return fulfilmentMethod === "collection"
      ? {
          status: "ready_for_collection",
          label: "Marcar pronta para recolha",
        }
      : {
          status: "scheduled_for_delivery",
          label: "Preparar para entrega",
        };
  }

  if (status === "ready_for_collection") {
    return {
      status: "collected",
      label: "Confirmar recolha",
    };
  }

  if (status === "scheduled_for_delivery") {
    return {
      status: "out_for_delivery",
      label: "Saiu para entrega",
    };
  }

  if (status === "out_for_delivery") {
    return {
      status: "delivered",
      label: "Confirmar entrega",
    };
  }

  return null;
}

function paymentMethodLabel(method: string) {
  const labels: Record<string, string> = {
    cash: "Dinheiro",
    bank_transfer: "Transferência bancária",
    multicaixa: "Multicaixa",
    card: "Cartão",
    online: "Online",
    voucher: "Voucher",
    other: "Outro",
  };

  return labels[method] || method;
}

function paymentAttemptStatusLabel(status: string) {
  const labels: Record<string, string> = {
    created: "Criado",
    pending: "Pendente",
    confirmed: "Confirmado",
    failed: "Falhou",
    cancelled: "Cancelado",
    refunded: "Reembolsado",
  };

  return labels[status] || status;
}

export default function MarketplacePage() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const directOrderHandled = useRef(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [products, setProducts] = useState<ProductCandidate[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [selectedOrder, setSelectedOrder] =
    useState<MarketplaceOrderDetail | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderActionLoading, setOrderActionLoading] =
    useState(false);
  const [showOrderPayment, setShowOrderPayment] =
    useState(false);
  const [orderPaymentMethod, setOrderPaymentMethod] =
    useState("cash");
  const [orderPaymentAmount, setOrderPaymentAmount] =
    useState("");
  const [
    orderPaymentReference,
    setOrderPaymentReference,
  ] = useState("");
  const [orderPaymentNotes, setOrderPaymentNotes] =
    useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"success" | "error">("success");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<
    | "orders"
    | "catalogue"
    | "products"
    | "campaigns"
    | "advertising_inquiries"
    | "store_applications"
    | "homepage"
    | "settings"
  >("orders");
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [listingForm, setListingForm] =
    useState<ListingForm>(emptyListingForm);
  // GESTÃO DE LOJAS E IDENTIDADE V1
  // PAINEL DE PUBLICIDADE NAZUNGA V1
  const [campaigns, setCampaigns] =
    useState<MarketplaceCampaign[]>([]);
  const [
    advertisingInquiries,
    setAdvertisingInquiries,
  ] = useState<AdvertisingInquiry[]>([]);
  const [
    storeApplications,
    setStoreApplications,
  ] = useState<StoreApplication[]>([]);
  const [
    applicationBusyId,
    setApplicationBusyId,
  ] = useState<string | null>(null);
  const [
    applicationStatusFilter,
    setApplicationStatusFilter,
  ] = useState<"all" | ApplicationStatus>("all");
  const [campaignModalOpen, setCampaignModalOpen] =
    useState(false);
  const [campaignSaving, setCampaignSaving] =
    useState(false);
  const [campaignBusyId, setCampaignBusyId] =
    useState<string | null>(null);
  const [campaignImage, setCampaignImage] =
    useState<File | null>(null);
  const [campaignForm, setCampaignForm] =
    useState<CampaignForm>({
      store_id: "",
      title: "",
      subtitle: "",
      placement: "home_banner",
      button_label: "Ver agora",
      target_url: "",
      starts_at: "",
      ends_at: "",
      priority: "0",
      status: "draft",
      is_paid: true,
      price: "0",
      currency: "AOA",
    });

  const [marketplaceLocations, setMarketplaceLocations] =
    useState<MarketplaceLocation[]>([]);
  const [newStoreOpen, setNewStoreOpen] =
    useState(false);
  const [newStoreSaving, setNewStoreSaving] =
    useState(false);
  const [newStoreForm, setNewStoreForm] =
    useState<NewStoreForm>(emptyNewStoreForm);
  const [brandingBusy, setBrandingBusy] = useState<
    "logo" | "banner" | "delete-logo" | "delete-banner" | null
  >(null);
  const [brandingVersion, setBrandingVersion] =
    useState(() => Date.now());
  const [logoVisible, setLogoVisible] =
    useState(true);
  const [bannerVisible, setBannerVisible] =
    useState(true);

  const [storeForm, setStoreForm] = useState({
    name: "",
    tagline: "",
    description: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    whatsapp: "",
    preparation_time_hours: "24",
    minimum_order_amount: "0",
    return_policy: "",
    delivery_policy: "",
    collection_policy: "",
    allows_collection: true,
    allows_delivery: true,
    status: "draft",
    is_accepting_orders: false,
  });

  const canManage =
    currentUser?.permissions?.includes("marketplace.manage") || false;

  const selectedStore =
    stores.find((store) => store.id === selectedStoreId) || null;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      setFirebaseUser(user);
      await loadInitialData(user);
    });

    return () => unsubscribe();
  }, []);

  // ABERTURA DIRETA DA ENCOMENDA V1
  useEffect(() => {
    if (!firebaseUser || directOrderHandled.current) {
      return;
    }

    const parameters = new URLSearchParams(
      window.location.search
    );

    const orderId = parameters.get("order");

    if (!orderId) {
      directOrderHandled.current = true;
      return;
    }

    directOrderHandled.current = true;
    setTab("orders");

    void openOrder(orderId).finally(() => {
      parameters.delete("order");

      const remainingQuery =
        parameters.toString();

      const cleanUrl =
        window.location.pathname +
        (remainingQuery
          ? `?${remainingQuery}`
          : "") +
        window.location.hash;

      window.history.replaceState(
        {},
        "",
        cleanUrl
      );
    });
  }, [firebaseUser]);


  useEffect(() => {
    if (!firebaseUser || !selectedStoreId) return;
    loadStoreData(firebaseUser, selectedStoreId);
  }, [firebaseUser, selectedStoreId]);

  useEffect(() => {
    if (!selectedStore) return;

    setLogoVisible(true);
    setBannerVisible(true);
    setBrandingVersion(Date.now());

    setStoreForm({
      name: selectedStore.name || "",
      tagline: selectedStore.tagline || "",
      description: selectedStore.description || "",
      contact_name: selectedStore.contact_name || "",
      contact_phone: selectedStore.contact_phone || "",
      contact_email: selectedStore.contact_email || "",
      whatsapp: selectedStore.whatsapp || "",
      preparation_time_hours: String(
        selectedStore.preparation_time_hours ?? 24
      ),
      minimum_order_amount: String(
        selectedStore.minimum_order_amount ?? 0
      ),
      return_policy: selectedStore.return_policy || "",
      delivery_policy: selectedStore.delivery_policy || "",
      collection_policy: selectedStore.collection_policy || "",
      allows_collection:
        selectedStore.allows_collection ?? true,
      allows_delivery:
        selectedStore.allows_delivery ?? true,
      status: selectedStore.status,
      is_accepting_orders: selectedStore.is_accepting_orders,
    });
  }, [selectedStore]);

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
      throw new Error(data.detail || "Não foi possível concluir a operação.");
    }

    return data;
  }

  async function loadInitialData(user: User) {
    try {
      setLoading(true);
      setMessage("");

      const [meResponse, storesResponse] = await Promise.all([
        apiFetch(user, "/api/me"),
        apiFetch(user, "/api/marketplace/stores"),
      ]);

      const meData = await responseData(meResponse);
      const storesData = await responseData(storesResponse);

      if (!meData.permissions?.includes("marketplace.view")) {
        window.location.href = "/dashboard";
        return;
      }

      setCurrentUser(meData);
      setStores(storesData.stores || []);

      if (
        meData.permissions?.includes(
          "marketplace.manage"
        )
      ) {
        const locationsResponse = await apiFetch(
          user,
          "/api/marketplace/locations"
        );

        const locationsData = await responseData(
          locationsResponse
        );

        setMarketplaceLocations(
          locationsData.locations || []
        );

        const campaignsResponse = await apiFetch(
          user,
          "/api/marketplace/campaigns"
        );

        const campaignsData = await responseData(
          campaignsResponse
        );

        setCampaigns(
          campaignsData.campaigns || []
        );

        const [
          inquiriesResponse,
          applicationsResponse,
        ] = await Promise.all([
          apiFetch(
            user,
            "/api/marketplace/advertising-inquiries"
          ),
          apiFetch(
            user,
            "/api/marketplace/store-applications"
          ),
        ]);

        const [
          inquiriesData,
          applicationsData,
        ] = await Promise.all([
          responseData(inquiriesResponse),
          responseData(applicationsResponse),
        ]);

        setAdvertisingInquiries(
          inquiriesData.inquiries || []
        );

        setStoreApplications(
          applicationsData.applications || []
        );
      }

      if (storesData.stores?.length) {
        setSelectedStoreId(storesData.stores[0].id);
      }
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o marketplace."
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateMarketplaceApplication(
    kind: "advertising" | "store",
    id: string,
    changes: {
      status?: ApplicationStatus;
      internal_notes?: string;
    }
  ) {
    if (!firebaseUser) {
      return;
    }

    try {
      setApplicationBusyId(id);

      const endpoint =
        kind === "advertising"
          ? `/api/marketplace/advertising-inquiries/${id}`
          : `/api/marketplace/store-applications/${id}`;

      const response = await apiFetch(
        firebaseUser,
        endpoint,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(changes),
        }
      );

      await responseData(response);

      if (kind === "advertising") {
        setAdvertisingInquiries((items) =>
          items.map((item) =>
            item.id === id
              ? { ...item, ...changes }
              : item
          )
        );
      } else {
        setStoreApplications((items) =>
          items.map((item) =>
            item.id === id
              ? { ...item, ...changes }
              : item
          )
        );
      }

      setMessageType("success");
      setMessage("Candidatura atualizada.");
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a candidatura."
      );
    } finally {
      setApplicationBusyId(null);
    }
  }

  async function loadStoreData(user: User, storeId: string) {
    try {
      setLoading(true);

      const [listingsResponse, ordersResponse] =
        await Promise.all([
          apiFetch(
            user,
            `/api/marketplace/stores/${storeId}/listings`
          ),
          apiFetch(
            user,
            `/api/marketplace/stores/${storeId}/orders`
          ),
        ]);

      const [listingsData, ordersData] =
        await Promise.all([
          responseData(listingsResponse),
          responseData(ordersResponse),
        ]);

      setListings(listingsData.listings || []);
      setOrders(ordersData.orders || []);

      if (currentUser?.permissions?.includes("marketplace.manage")) {
        const productsResponse = await apiFetch(
          user,
          `/api/marketplace/stores/${storeId}/product-candidates`
        );

        const productsData = await responseData(productsResponse);
        setProducts(productsData.products || []);
      }
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os produtos da loja."
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    if (!firebaseUser || !selectedStoreId) return;

    const storesResponse = await apiFetch(
      firebaseUser,
      "/api/marketplace/stores"
    );
    const storesData = await responseData(storesResponse);
    setStores(storesData.stores || []);

    await loadStoreData(firebaseUser, selectedStoreId);
  }

  async function openOrder(orderId: string) {
    if (!firebaseUser) return;

    try {
      setOrderLoading(true);
      setMessage("");

      const response = await apiFetch(
        firebaseUser,
        `/api/marketplace/orders/${orderId}`
      );

      const data = await responseData(response);
      setSelectedOrder(data);
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir a encomenda."
      );
    } finally {
      setOrderLoading(false);
    }
  }

  async function confirmMarketplaceOrder() {
    if (!firebaseUser || !selectedOrder) return;

    const orderId = selectedOrder.order.id;
    const orderNumber =
      selectedOrder.order.order_number;

    const confirmed = window.confirm(
      `Confirmar a encomenda ${orderNumber} e criar a venda no PEN?`
    );

    if (!confirmed) return;

    try {
      setOrderActionLoading(true);
      setMessage("");

      const response = await apiFetch(
        firebaseUser,
        `/api/marketplace/orders/${orderId}/confirm`,
        {
          method: "POST",
        }
      );

      const data = await responseData(response);

      setMessageType("success");
      setMessage(
        `Encomenda confirmada. Venda PEN ${data.sales_order?.sale_number || ""} criada com pagamento pendente.`
      );

      await refreshAll();
      await openOrder(orderId);
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível confirmar a encomenda."
      );
    } finally {
      setOrderActionLoading(false);
    }
  }


  function openMarketplacePayment() {
    if (!selectedOrder) return;

    const amountPaid =
      selectedOrder.payments
        .filter(
          (payment) =>
            payment.status === "confirmed"
        )
        .reduce(
          (total, payment) =>
            total + Number(payment.amount || 0),
          0
        );

    const balance = Math.max(
      0,
      Number(selectedOrder.order.total_amount) -
        amountPaid
    );

    setOrderPaymentMethod("cash");
    setOrderPaymentAmount(String(balance));
    setOrderPaymentReference("");
    setOrderPaymentNotes("");
    setShowOrderPayment(true);
  }


  async function registerMarketplacePayment(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!firebaseUser || !selectedOrder) return;

    const amount = Number(orderPaymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessageType("error");
      setMessage(
        "Indique um valor de pagamento válido."
      );
      return;
    }

    const accepted = window.confirm(
      `Registar pagamento de ${money(
        amount,
        selectedOrder.order.currency
      )}? Um pagamento total movimentará o stock.`
    );

    if (!accepted) return;

    const orderId = selectedOrder.order.id;

    try {
      setOrderActionLoading(true);
      setMessage("");

      const response = await apiFetch(
        firebaseUser,
        `/api/marketplace/orders/${orderId}/payments`,
        {
          method: "POST",
          body: JSON.stringify({
            payment_method: orderPaymentMethod,
            amount,
            payment_reference:
              orderPaymentReference.trim() || null,
            notes:
              orderPaymentNotes.trim() || null,
          }),
        }
      );

      const data = await responseData(response);

      setMessageType("success");
      setMessage(
        data.status === "paid"
          ? "Pagamento total registado e stock movimentado."
          : "Pagamento parcial registado com sucesso."
      );

      setShowOrderPayment(false);
      await refreshAll();
      await openOrder(orderId);
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível registar o pagamento."
      );
    } finally {
      setOrderActionLoading(false);
    }
  }


  async function advanceMarketplaceOrder() {
    if (!firebaseUser || !selectedOrder) return;

    const action = nextOrderAction(
      selectedOrder.order.status,
      selectedOrder.order.fulfilment_method
    );

    if (!action) return;

    const confirmed = window.confirm(
      `${action.label} para a encomenda ${selectedOrder.order.order_number}?`
    );

    if (!confirmed) return;

    try {
      setOrderActionLoading(true);
      setMessage("");

      const response = await apiFetch(
        firebaseUser,
        `/api/marketplace/orders/${selectedOrder.order.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: action.status,
          }),
        }
      );

      await responseData(response);

      setMessageType("success");
      setMessage(
        "Estado da encomenda atualizado com sucesso."
      );

      await refreshAll();
      await openOrder(selectedOrder.order.id);
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a encomenda."
      );
    } finally {
      setOrderActionLoading(false);
    }
  }


  function openNewListing(product: ProductCandidate) {
    setEditingListing(null);
    setListingForm({
      ...emptyListingForm,
      product_id: product.product_id,
      category_id: product.category_id || "",
      public_name: product.name,
      short_description: product.description || "",
      public_description: product.description || "",
      public_price:
        product.selling_price !== null
          ? String(product.selling_price)
          : "",
    });
    setListingModalOpen(true);
  }

  function openEditListing(listing: Listing) {
    setEditingListing(listing);
    setListingForm({
      product_id: listing.product_id,
      category_id: listing.category_id || "",
      slug: listing.slug,
      public_name: listing.public_name,
      short_description: listing.short_description || "",
      public_description: listing.public_description || "",
      public_price: String(listing.public_price),
      compare_at_price:
        listing.compare_at_price !== null
          ? String(listing.compare_at_price)
          : "",
      minimum_quantity: String(listing.minimum_quantity),
      maximum_quantity:
        listing.maximum_quantity !== null
          ? String(listing.maximum_quantity)
          : "",
      stock_buffer: String(listing.stock_buffer),
      allow_backorder: listing.allow_backorder,
      is_featured: listing.is_featured,
      status: listing.status,
    });
    setListingModalOpen(true);
  }

  async function saveListing(event: FormEvent) {
    event.preventDefault();

    if (!firebaseUser || !selectedStoreId) return;

    if (!listingForm.public_name.trim() || !listingForm.public_price) {
      setMessageType("error");
      setMessage("Indique o nome público e o preço do produto.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        product_id: listingForm.product_id,
        category_id: listingForm.category_id || null,
        slug: listingForm.slug || null,
        public_name: listingForm.public_name,
        short_description: listingForm.short_description || null,
        public_description: listingForm.public_description || null,
        public_price: Number(listingForm.public_price),
        compare_at_price: listingForm.compare_at_price
          ? Number(listingForm.compare_at_price)
          : null,
        minimum_quantity: Number(listingForm.minimum_quantity || 1),
        maximum_quantity: listingForm.maximum_quantity
          ? Number(listingForm.maximum_quantity)
          : null,
        stock_buffer: Number(listingForm.stock_buffer || 0),
        allow_backorder: listingForm.allow_backorder,
        is_featured: listingForm.is_featured,
        status: listingForm.status,
      };

      const path = editingListing
        ? `/api/marketplace/listings/${editingListing.id}`
        : `/api/marketplace/stores/${selectedStoreId}/listings`;

      if (editingListing) {
        delete (payload as { product_id?: string }).product_id;
      }

      const response = await apiFetch(firebaseUser, path, {
        method: editingListing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      await responseData(response);

      setListingModalOpen(false);
      setMessageType("success");
      setMessage(
        editingListing
          ? "Anúncio atualizado com sucesso."
          : "Produto adicionado ao catálogo."
      );
      await refreshAll();
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar o anúncio."
      );
    } finally {
      setSaving(false);
    }
  }

  function localDateTimeInput(
    date: Date
  ) {
    const local = new Date(
      date.getTime() -
        date.getTimezoneOffset() * 60000
    );

    return local
      .toISOString()
      .slice(0, 16);
  }

  function openNewCampaign() {
    const start = new Date();
    const end = new Date(
      start.getTime() +
        7 * 24 * 60 * 60 * 1000
    );

    setCampaignImage(null);
    setCampaignForm({
      store_id: selectedStoreId || "",
      title: "",
      subtitle: "",
      placement: "home_banner",
      button_label: "Ver agora",
      target_url: selectedStore
        ? `/lojas/${selectedStore.slug}`
        : "",
      starts_at:
        localDateTimeInput(start),
      ends_at:
        localDateTimeInput(end),
      priority: "0",
      status: "draft",
      is_paid: true,
      price: "0",
      currency: "AOA",
    });
    setMessage("");
    setCampaignModalOpen(true);
  }

  async function reloadCampaigns() {
    if (!firebaseUser) return;

    const response = await apiFetch(
      firebaseUser,
      "/api/marketplace/campaigns"
    );
    const data = await responseData(response);

    setCampaigns(data.campaigns || []);
  }

  async function createCampaign(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!firebaseUser) return;

    if (!campaignForm.title.trim()) {
      setMessageType("error");
      setMessage(
        "Indique o título da campanha."
      );
      return;
    }

    try {
      setCampaignSaving(true);
      setMessage("");

      const response = await apiFetch(
        firebaseUser,
        "/api/marketplace/campaigns",
        {
          method: "POST",
          body: JSON.stringify({
            store_id:
              campaignForm.store_id || null,
            title:
              campaignForm.title.trim(),
            subtitle:
              campaignForm.subtitle.trim() ||
              null,
            placement:
              campaignForm.placement,
            button_label:
              campaignForm.button_label.trim() ||
              null,
            target_url:
              campaignForm.target_url.trim() ||
              null,
            starts_at:
              new Date(
                campaignForm.starts_at
              ).toISOString(),
            ends_at:
              new Date(
                campaignForm.ends_at
              ).toISOString(),
            priority: Number(
              campaignForm.priority || 0
            ),
            status:
              campaignForm.status,
            is_paid:
              campaignForm.is_paid,
            price: Number(
              campaignForm.price || 0
            ),
            currency:
              campaignForm.currency,
          }),
        }
      );

      const data = await responseData(response);
      const campaignId =
        data.campaign.id;

      if (campaignImage) {
        const formData = new FormData();
        formData.append(
          "file",
          campaignImage
        );

        const imageResponse = await apiFetch(
          firebaseUser,
          `/api/marketplace/campaigns/${campaignId}/image`,
          {
            method: "POST",
            body: formData,
          }
        );

        await responseData(imageResponse);
      }

      await reloadCampaigns();
      setCampaignModalOpen(false);
      setMessageType("success");
      setMessage(
        campaignForm.status === "active"
          ? "Campanha criada e ativada."
          : "Campanha guardada como rascunho."
      );
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a campanha."
      );
    } finally {
      setCampaignSaving(false);
    }
  }

  async function changeCampaignStatus(
    campaign: MarketplaceCampaign,
    status: "active" | "paused"
  ) {
    if (!firebaseUser) return;

    if (
      status === "active" &&
      !campaign.has_image
    ) {
      setMessageType("error");
      setMessage(
        "Carregue um flyer antes de ativar a campanha."
      );
      return;
    }

    try {
      setCampaignBusyId(campaign.id);
      setMessage("");

      const response = await apiFetch(
        firebaseUser,
        `/api/marketplace/campaigns/${campaign.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );

      await responseData(response);
      await reloadCampaigns();

      setMessageType("success");
      setMessage(
        status === "active"
          ? "Campanha ativada."
          : "Campanha pausada."
      );
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a campanha."
      );
    } finally {
      setCampaignBusyId(null);
    }
  }

  function openNewStore() {
    setNewStoreForm({
      ...emptyNewStoreForm,
      location_id:
        marketplaceLocations[0]?.id || "",
    });
    setMessage("");
    setNewStoreOpen(true);
  }

  function updateNewStoreName(name: string) {
    const automaticSlug = name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    setNewStoreForm((current) => ({
      ...current,
      name,
      slug: automaticSlug,
    }));
  }

  async function createStore(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!firebaseUser) return;

    if (!newStoreForm.name.trim()) {
      setMessageType("error");
      setMessage("Indique o nome da nova loja.");
      return;
    }

    if (!newStoreForm.location_id) {
      setMessageType("error");
      setMessage(
        "Selecione a localização que fornecerá o stock."
      );
      return;
    }

    try {
      setNewStoreSaving(true);
      setMessage("");

      const response = await apiFetch(
        firebaseUser,
        "/api/marketplace/stores",
        {
          method: "POST",
          body: JSON.stringify({
            name: newStoreForm.name.trim(),
            slug: newStoreForm.slug.trim() || null,
            location_id:
              newStoreForm.location_id,
            tagline:
              newStoreForm.tagline.trim() || null,
            description:
              newStoreForm.description.trim() || null,
            currency: "AOA",
            default_language: "pt",
          }),
        }
      );

      const data = await responseData(response);

      const storesResponse = await apiFetch(
        firebaseUser,
        "/api/marketplace/stores"
      );
      const storesData = await responseData(
        storesResponse
      );

      setStores(storesData.stores || []);
      setSelectedStoreId(data.store.id);
      setTab("settings");
      setNewStoreOpen(false);
      setMessageType("success");
      setMessage(
        `Loja ${data.store.name} criada em rascunho. Adicione as imagens e complete a configuração.`
      );
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a loja."
      );
    } finally {
      setNewStoreSaving(false);
    }
  }

  async function uploadStoreBranding(
    asset: "logo" | "banner",
    file: File | null
  ) {
    if (!firebaseUser || !selectedStore || !file) {
      return;
    }

    try {
      setBrandingBusy(asset);
      setMessage("");

      const formData = new FormData();
      formData.append("file", file);

      const response = await apiFetch(
        firebaseUser,
        `/api/marketplace/stores/${selectedStore.id}/branding/${asset}`,
        {
          method: "POST",
          body: formData,
        }
      );

      await responseData(response);

      if (asset === "logo") {
        setLogoVisible(true);
      } else {
        setBannerVisible(true);
      }

      setBrandingVersion(Date.now());
      setMessageType("success");
      setMessage(
        asset === "logo"
          ? "Logótipo da loja atualizado."
          : "Imagem de capa da loja atualizada."
      );
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a imagem."
      );
    } finally {
      setBrandingBusy(null);
    }
  }

  async function deleteStoreBranding(
    asset: "logo" | "banner"
  ) {
    if (!firebaseUser || !selectedStore) return;

    const label =
      asset === "logo" ? "logótipo" : "imagem de capa";

    if (
      !window.confirm(
        `Remover ${label} desta loja?`
      )
    ) {
      return;
    }

    try {
      setBrandingBusy(
        asset === "logo"
          ? "delete-logo"
          : "delete-banner"
      );
      setMessage("");

      const response = await apiFetch(
        firebaseUser,
        `/api/marketplace/stores/${selectedStore.id}/branding/${asset}`,
        { method: "DELETE" }
      );

      await responseData(response);

      if (asset === "logo") {
        setLogoVisible(false);
      } else {
        setBannerVisible(false);
      }

      setMessageType("success");
      setMessage(
        asset === "logo"
          ? "Logótipo removido."
          : "Imagem de capa removida."
      );
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível remover a imagem."
      );
    } finally {
      setBrandingBusy(null);
    }
  }

  async function saveStore(event: FormEvent) {
    event.preventDefault();

    if (!firebaseUser || !selectedStoreId) return;

    if (
      !storeForm.allows_collection &&
      !storeForm.allows_delivery
    ) {
      setMessageType("error");
      setMessage(
        "Selecione pelo menos Recolha na loja ou Entrega."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch(
        firebaseUser,
        `/api/marketplace/stores/${selectedStoreId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: storeForm.name,
            tagline: storeForm.tagline || null,
            description: storeForm.description || null,
            contact_name: storeForm.contact_name || null,
            contact_phone: storeForm.contact_phone || null,
            contact_email: storeForm.contact_email || null,
            whatsapp: storeForm.whatsapp || null,
            preparation_time_hours: Number(
              storeForm.preparation_time_hours || 0
            ),
            minimum_order_amount: Number(
              storeForm.minimum_order_amount || 0
            ),
            return_policy: storeForm.return_policy || null,
            delivery_policy: storeForm.delivery_policy || null,
            collection_policy: storeForm.collection_policy || null,
            allows_collection:
              storeForm.allows_collection,
            allows_delivery:
              storeForm.allows_delivery,
            status: storeForm.status,
            is_accepting_orders: storeForm.is_accepting_orders,
          }),
        }
      );

      await responseData(response);
      setMessageType("success");
      setMessage("Configuração da loja atualizada.");
      await refreshAll();
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a loja."
      );
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(listing: Listing, status: string) {
    if (!firebaseUser) return;

    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch(
        firebaseUser,
        `/api/marketplace/listings/${listing.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );

      await responseData(response);
      setMessageType("success");
      setMessage(
        status === "active"
          ? "Produto publicado."
          : "Produto retirado da loja pública."
      );
      await refreshAll();
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o estado."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  const filteredListings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return listings.filter(
      (listing) =>
        !query ||
        listing.public_name.toLowerCase().includes(query) ||
        listing.internal_product_name.toLowerCase().includes(query) ||
        listing.sku.toLowerCase().includes(query)
    );
  }, [listings, search]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter(
      (product) =>
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        (product.brand || "").toLowerCase().includes(query)
    );
  }, [products, search]);

  if (loading && !selectedStore) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-600">
        A carregar marketplace...
      </div>
    );
  }

  return (
    <PermissionGate permission="marketplace.view">
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
            <PermissionGate permission="deliveries.view">
              <NavItem label="Entregas" icon="▰" href="/deliveries" />
            </PermissionGate>
            <PermissionGate permission="marketplace.view">
              <NavItem
                label="Marketplace"
                icon="◈"
                href="/marketplace"
                active
              />
            </PermissionGate>
            <NavItem label="Despesas" icon="−" href="/expenses" />
            <NavItem label="Fornecedores" icon="♢" href="/suppliers" />
            <NavItem label="Clientes" icon="♙" href="/customers" />
            <NavItem label="Relatórios" icon="▤" href="/reports" />
            <PermissionGate permission="users.manage">
              <NavItem label="Utilizadores" icon="♧" href="/users" />
            </PermissionGate>
            <NavItem label="Definições" icon="⚙" href="/settings" />
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
            <button
              onClick={handleLogout}
              className="w-full rounded-xl px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/10"
            >
              Terminar Sessão
            </button>
          </div>
        </aside>

        <div className="lg:pl-64">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-4 md:px-8">
              <div>
                <h1 className="text-2xl font-bold text-slate-950">
                  Nazunga Marketplace
                </h1>
                <p className="text-sm text-slate-500">
                  Lojas, produtos e publicação online
                </p>
              </div>

              <MobileNav onLogout={handleLogout} />
            </div>
          </header>

          <main className="p-4 md:p-8">
            <div className="mx-auto max-w-7xl">
              {message && (
                <div
                  className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
                    messageType === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
                <div>
                  <div className="text-sm font-medium text-slate-500">
                    Loja selecionada
                  </div>
                  <select
                    value={selectedStoreId}
                    onChange={(event) =>
                      setSelectedStoreId(event.target.value)
                    }
                    className="mt-2 min-w-64 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"
                  >
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>

                  {canManage && (
                    <button
                      type="button"
                      onClick={openNewStore}
                      className="mt-3 inline-flex items-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
                    >
                      + Nova loja
                    </button>
                  )}
                </div>

                {selectedStore && (
                  <div className="flex flex-wrap gap-3">
                    <Stat
                      label="Anúncios"
                      value={selectedStore.listing_count}
                    />
                    <Stat
                      label="Publicados"
                      value={selectedStore.active_listing_count}
                    />
                    <Stat
                      label="Estado"
                      value={statusLabel(selectedStore.status)}
                    />
                  </div>
                )}
              </div>

              {selectedStore && (
                <>
                  <div className="mb-6 flex flex-wrap gap-2">
                    <TabButton
                      active={tab === "orders"}
                      onClick={() => setTab("orders")}
                    >
                      Encomendas
                    </TabButton>

                    <TabButton
                      active={tab === "catalogue"}
                      onClick={() => setTab("catalogue")}
                    >
                      Catálogo
                    </TabButton>

                    {canManage && (
                      <TabButton
                        active={tab === "products"}
                        onClick={() => setTab("products")}
                      >
                        Adicionar produtos
                      </TabButton>
                    )}

                    {canManage && (
                      <TabButton
                        active={tab === "campaigns"}
                        onClick={() => setTab("campaigns")}
                      >
                        Publicidade
                      </TabButton>
                    )}

                    {canManage && (
                      <TabButton
                        active={
                          tab ===
                          "advertising_inquiries"
                        }
                        onClick={() => {
                          setTab(
                            "advertising_inquiries"
                          );
                          setApplicationStatusFilter(
                            "all"
                          );
                        }}
                      >
                        Pedidos de publicidade
                        {advertisingInquiries.filter(
                          (item) =>
                            item.status === "new"
                        ).length > 0 &&
                          ` (${
                            advertisingInquiries.filter(
                              (item) =>
                                item.status ===
                                "new"
                            ).length
                          })`}
                      </TabButton>
                    )}

                    {canManage && (
                      <TabButton
                        active={
                          tab === "store_applications"
                        }
                        onClick={() => {
                          setTab("store_applications");
                          setApplicationStatusFilter(
                            "all"
                          );
                        }}
                      >
                        Candidaturas de lojas
                        {storeApplications.filter(
                          (item) =>
                            item.status === "new"
                        ).length > 0 &&
                          ` (${
                            storeApplications.filter(
                              (item) =>
                                item.status ===
                                "new"
                            ).length
                          })`}
                      </TabButton>
                    )}

                    {canManage && (
                      <TabButton
                        active={tab === "homepage"}
                        onClick={() => setTab("homepage")}
                      >
                        Página Inicial
                      </TabButton>
                    )}

                    {canManage && (
                      <TabButton
                        active={tab === "settings"}
                        onClick={() => setTab("settings")}
                      >
                        Configuração da loja
                      </TabButton>
                    )}
                  </div>

                  {tab !== "settings" &&
                    tab !== "homepage" &&
                    tab !== "campaigns" &&
                    tab !== "advertising_inquiries" &&
                    tab !== "store_applications" && (
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={
                        tab === "orders"
                          ? "Pesquisar número, cliente ou telefone..."
                          : "Pesquisar produto ou SKU..."
                      }
                      className="mb-6 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400"
                    />
                  )}

                  {tab === "orders" && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                              <th className="px-5 py-4">
                                Encomenda
                              </th>
                              <th className="px-5 py-4">
                                Cliente
                              </th>
                              <th className="px-5 py-4">
                                Receção
                              </th>
                              <th className="px-5 py-4">
                                Estado
                              </th>
                              <th className="px-5 py-4">
                                Pagamento
                              </th>
                              <th className="px-5 py-4 text-right">
                                Total
                              </th>
                              <th className="px-5 py-4" />
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-200">
                            {orders
                              .filter((order) => {
                                const query = search
                                  .trim()
                                  .toLowerCase();

                                if (!query) return true;

                                return (
                                  order.order_number
                                    .toLowerCase()
                                    .includes(query) ||
                                  order.customer_name
                                    .toLowerCase()
                                    .includes(query) ||
                                  order.customer_phone
                                    .toLowerCase()
                                    .includes(query)
                                );
                              })
                              .map((order) => (
                                <tr
                                  key={order.id}
                                  className="hover:bg-slate-50"
                                >
                                  <td className="whitespace-nowrap px-5 py-4">
                                    <div className="font-bold text-slate-950">
                                      {order.order_number}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500">
                                      {new Date(
                                        order.created_at
                                      ).toLocaleString(
                                        "pt-PT"
                                      )}
                                    </div>
                                  </td>

                                  <td className="px-5 py-4">
                                    <div className="font-semibold text-slate-950">
                                      {order.customer_name}
                                    </div>
                                    <div className="text-sm text-slate-500">
                                      {order.customer_phone}
                                    </div>
                                  </td>

                                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                                    {order.fulfilment_method ===
                                    "delivery"
                                      ? "Entrega"
                                      : "Recolha na loja"}
                                  </td>

                                  <td className="whitespace-nowrap px-5 py-4">
                                    <OrderBadge
                                      status={order.status}
                                    />
                                  </td>

                                  <td className="whitespace-nowrap px-5 py-4">
                                    <PaymentBadge
                                      status={
                                        order.payment_status
                                      }
                                    />
                                  </td>

                                  <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-slate-950">
                                    {money(
                                      order.total_amount,
                                      order.currency
                                    )}
                                  </td>

                                  <td className="whitespace-nowrap px-5 py-4 text-right">
                                    <button
                                      type="button"
                                      disabled={orderLoading}
                                      onClick={() =>
                                        openOrder(order.id)
                                      }
                                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                    >
                                      Ver detalhes
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>

                      {!orders.filter((order) => {
                        const query = search
                          .trim()
                          .toLowerCase();

                        return (
                          !query ||
                          order.order_number
                            .toLowerCase()
                            .includes(query) ||
                          order.customer_name
                            .toLowerCase()
                            .includes(query) ||
                          order.customer_phone
                            .toLowerCase()
                            .includes(query)
                        );
                      }).length && (
                        <div className="p-8">
                          <EmptyState text="Nenhuma encomenda encontrada para esta loja." />
                        </div>
                      )}
                    </div>
                  )}

                  {tab === "catalogue" && (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {filteredListings.map((listing) => (
                        <article
                          key={listing.id}
                          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                          <ProductImage
                            path={listing.image_path}
                            name={listing.public_name}
                            user={firebaseUser}
                          />

                          <div className="p-5">
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div>
                                <h2 className="font-bold text-slate-950">
                                  {listing.public_name}
                                </h2>
                                <p className="text-xs text-slate-500">
                                  {listing.sku}
                                </p>
                              </div>
                              <Badge status={listing.status} />
                            </div>

                            <div className="text-xl font-bold text-slate-950">
                              {money(
                                listing.public_price,
                                listing.currency
                              )}
                            </div>

                            {listing.compare_at_price !== null && (
                              <div className="text-sm text-slate-400 line-through">
                                {money(
                                  listing.compare_at_price,
                                  listing.currency
                                )}
                              </div>
                            )}

                            <div className="mt-3 text-sm text-slate-600">
                              Stock disponível:{" "}
                              <strong>
                                {Number(listing.available_quantity)}
                              </strong>
                            </div>

                            {canManage && (
                              <div className="mt-5 flex flex-wrap gap-2">
                                <button
                                  onClick={() =>
                                    openEditListing(listing)
                                  }
                                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Editar
                                </button>

                                <button
                                  disabled={saving}
                                  onClick={() =>
                                    quickStatus(
                                      listing,
                                      listing.status === "active"
                                        ? "hidden"
                                        : "active"
                                    )
                                  }
                                  className={
                                    listing.status === "active"
                                      ? "rounded-lg border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                                      : "rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                                  }
                                >
                                  {listing.status === "active"
                                    ? "Ocultar"
                                    : "Publicar"}
                                </button>
                              </div>
                            )}
                          </div>
                        </article>
                      ))}

                      {!filteredListings.length && (
                        <EmptyState text="Ainda não existem produtos no catálogo desta loja." />
                      )}
                    </div>
                  )}

                  {tab === "products" && canManage && (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {filteredProducts.map((product) => (
                        <article
                          key={product.product_id}
                          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                          <ProductImage
                            path={product.image_path}
                            name={product.name}
                            user={firebaseUser}
                          />

                          <div className="p-5">
                            <h2 className="font-bold text-slate-950">
                              {product.name}
                            </h2>
                            <p className="text-xs text-slate-500">
                              {product.sku}
                              {product.category_name
                                ? ` · ${product.category_name}`
                                : ""}
                            </p>

                            <div className="mt-3 text-lg font-bold text-slate-950" style={{ color: "#0f172a", opacity: 1 }}>
                              {product.selling_price !== null
                                ? money(
                                    product.selling_price,
                                    product.selling_currency || "AOA"
                                  )
                                : "Preço não definido"}
                            </div>

                            <div className="mt-2 text-sm text-slate-600">
                              Stock:{" "}
                              <strong>
                                {Number(product.available_quantity)}
                              </strong>
                            </div>

                            <button
                              disabled={Boolean(product.listing_id)}
                              onClick={() => openNewListing(product)}
                              className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                            >
                              {product.listing_id
                                ? "Já está no catálogo"
                                : "Adicionar ao catálogo"}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  {tab === "campaigns" && canManage && (
                    <section className="space-y-5 text-slate-950">
                      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-[#102820] p-6 text-white shadow-sm md:flex-row md:items-center">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#b9ff66]">
                            Receita publicitária
                          </p>
                          <h2 className="mt-2 text-2xl font-black">
                            Campanhas e flyers
                          </h2>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                            Venda posições de destaque às lojas, controle datas, preços e resultados.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={openNewCampaign}
                          className="rounded-xl bg-[#b9ff66] px-5 py-3 font-black text-[#102820] hover:bg-white"
                        >
                          + Nova campanha
                        </button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <Stat
                          label="Campanhas"
                          value={campaigns.length}
                        />
                        <Stat
                          label="Visualizações"
                          value={campaigns.reduce(
                            (total, campaign) =>
                              total +
                              Number(
                                campaign.impression_count ||
                                  0
                              ),
                            0
                          )}
                        />
                        <Stat
                          label="Cliques"
                          value={campaigns.reduce(
                            (total, campaign) =>
                              total +
                              Number(
                                campaign.click_count ||
                                  0
                              ),
                            0
                          )}
                        />
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {campaigns.length ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                              <thead className="bg-slate-50">
                                <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-600">
                                  <th className="px-5 py-4">
                                    Campanha
                                  </th>
                                  <th className="px-5 py-4">
                                    Período
                                  </th>
                                  <th className="px-5 py-4">
                                    Posição
                                  </th>
                                  <th className="px-5 py-4 text-right">
                                    Receita
                                  </th>
                                  <th className="px-5 py-4 text-right">
                                    Resultados
                                  </th>
                                  <th className="px-5 py-4">
                                    Estado
                                  </th>
                                  <th className="px-5 py-4" />
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-slate-200">
                                {campaigns.map(
                                  (campaign) => (
                                    <tr
                                      key={campaign.id}
                                      className="hover:bg-slate-50"
                                    >
                                      <td className="px-5 py-4">
                                        <div className="font-bold text-slate-950">
                                          {campaign.title}
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500">
                                          {campaign.store_name ||
                                            "Campanha Nazunga"}
                                          {!campaign.has_image &&
                                            " · Sem flyer"}
                                        </div>
                                      </td>

                                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                                        {new Date(
                                          campaign.starts_at
                                        ).toLocaleDateString(
                                          "pt-PT"
                                        )}
                                        {" → "}
                                        {new Date(
                                          campaign.ends_at
                                        ).toLocaleDateString(
                                          "pt-PT"
                                        )}
                                      </td>

                                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                                        {campaign.placement ===
                                        "home_hero"
                                          ? "Destaque principal"
                                          : campaign.placement ===
                                              "home_grid"
                                            ? "Grelha comercial"
                                            : "Banner"}
                                      </td>

                                      <td className="whitespace-nowrap px-5 py-4 text-right font-bold">
                                        {money(
                                          campaign.price,
                                          campaign.currency
                                        )}
                                      </td>

                                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm">
                                        <div className="font-bold">
                                          {campaign.impression_count} vistas
                                        </div>
                                        <div className="text-slate-500">
                                          {campaign.click_count} cliques
                                        </div>
                                      </td>

                                      <td className="px-5 py-4">
                                        <span
                                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                                            campaign.status ===
                                            "active"
                                              ? "bg-emerald-100 text-emerald-800"
                                              : campaign.status ===
                                                  "paused"
                                                ? "bg-amber-100 text-amber-900"
                                                : "bg-slate-100 text-slate-700"
                                          }`}
                                        >
                                          {campaign.status ===
                                          "active"
                                            ? "Ativa"
                                            : campaign.status ===
                                                "paused"
                                              ? "Pausada"
                                              : campaign.status ===
                                                  "draft"
                                                ? "Rascunho"
                                                : campaign.status}
                                        </span>
                                      </td>

                                      <td className="whitespace-nowrap px-5 py-4 text-right">
                                        {campaign.status ===
                                        "active" ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              changeCampaignStatus(
                                                campaign,
                                                "paused"
                                              )
                                            }
                                            disabled={
                                              campaignBusyId ===
                                              campaign.id
                                            }
                                            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                                          >
                                            Pausar
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              changeCampaignStatus(
                                                campaign,
                                                "active"
                                              )
                                            }
                                            disabled={
                                              campaignBusyId ===
                                              campaign.id
                                            }
                                            className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                                          >
                                            Ativar
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="p-10 text-center">
                            <h3 className="font-bold text-slate-950">
                              Ainda não existem campanhas
                            </h3>
                            <p className="mt-2 text-sm text-slate-600">
                              Crie o primeiro flyer publicitário da Nazunga.
                            </p>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {tab ===
                    "advertising_inquiries" &&
                    canManage && (
                      <section className="space-y-5 text-slate-950">
                        <ApplicationHeader
                          eyebrow="Receita publicitária"
                          title="Pedidos de publicidade"
                          description="Empresas interessadas em anunciar produtos, serviços e campanhas na Nazunga."
                          total={
                            advertisingInquiries.length
                          }
                          newCount={
                            advertisingInquiries.filter(
                              (item) =>
                                item.status === "new"
                            ).length
                          }
                          filter={
                            applicationStatusFilter
                          }
                          onFilter={
                            setApplicationStatusFilter
                          }
                        />

                        <div className="space-y-4">
                          {advertisingInquiries
                            .filter(
                              (item) =>
                                applicationStatusFilter ===
                                  "all" ||
                                item.status ===
                                  applicationStatusFilter
                            )
                            .map((item) => (
                              <article
                                key={item.id}
                                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                              >
                                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <h3 className="text-xl font-black">
                                        {
                                          item.company_name
                                        }
                                      </h3>
                                      <span
                                        className={`rounded-full px-3 py-1 text-xs font-bold ${applicationStatusClass(
                                          item.status
                                        )}`}
                                      >
                                        {applicationStatusLabel(
                                          item.status
                                        )}
                                      </span>
                                    </div>

                                    <p className="mt-2 text-sm text-slate-600">
                                      {
                                        item.contact_name
                                      }{" "}
                                      ·{" "}
                                      <a
                                        href={`mailto:${item.email}`}
                                        className="font-bold text-emerald-800 hover:underline"
                                      >
                                        {item.email}
                                      </a>{" "}
                                      ·{" "}
                                      <a
                                        href={`tel:${item.phone}`}
                                        className="font-bold text-emerald-800 hover:underline"
                                      >
                                        {item.phone}
                                      </a>
                                    </p>

                                    <p className="mt-2 text-xs text-slate-500">
                                      Recebido em{" "}
                                      {new Date(
                                        item.created_at
                                      ).toLocaleString(
                                        "pt-PT"
                                      )}
                                    </p>
                                  </div>

                                  <select
                                    value={item.status}
                                    disabled={
                                      applicationBusyId ===
                                      item.id
                                    }
                                    onChange={(event) =>
                                      updateMarketplaceApplication(
                                        "advertising",
                                        item.id,
                                        {
                                          status:
                                            event.target
                                              .value as ApplicationStatus,
                                        }
                                      )
                                    }
                                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold"
                                  >
                                    {APPLICATION_STATUSES.map(
                                      (status) => (
                                        <option
                                          key={
                                            status.value
                                          }
                                          value={
                                            status.value
                                          }
                                        >
                                          {
                                            status.label
                                          }
                                        </option>
                                      )
                                    )}
                                  </select>
                                </div>

                                <div className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 text-sm md:grid-cols-4">
                                  <Info
                                    label="Negócio"
                                    value={
                                      item.business_type ||
                                      "Não indicado"
                                    }
                                  />
                                  <Info
                                    label="Formato"
                                    value={
                                      item.advertising_format ||
                                      "A definir"
                                    }
                                  />
                                  <Info
                                    label="Duração"
                                    value={
                                      item.campaign_duration ||
                                      "A definir"
                                    }
                                  />
                                  <Info
                                    label="Orçamento"
                                    value={
                                      item.estimated_budget ||
                                      "A definir"
                                    }
                                  />
                                </div>

                                {item.message && (
                                  <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                    {item.message}
                                  </p>
                                )}

                                <label className="mt-5 block">
                                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                                    Notas internas
                                  </span>
                                  <textarea
                                    key={`${item.id}-${item.internal_notes}`}
                                    defaultValue={
                                      item.internal_notes ||
                                      ""
                                    }
                                    rows={2}
                                    onBlur={(event) =>
                                      updateMarketplaceApplication(
                                        "advertising",
                                        item.id,
                                        {
                                          internal_notes:
                                            event.target
                                              .value,
                                        }
                                      )
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                                  />
                                </label>
                              </article>
                            ))}

                          {!advertisingInquiries.filter(
                            (item) =>
                              applicationStatusFilter ===
                                "all" ||
                              item.status ===
                                applicationStatusFilter
                          ).length && (
                            <EmptyApplications
                              title="Sem pedidos de publicidade"
                              description="Os pedidos enviados pelo formulário público aparecerão aqui."
                            />
                          )}
                        </div>
                      </section>
                    )}

                  {tab ===
                    "store_applications" &&
                    canManage && (
                      <section className="space-y-5 text-slate-950">
                        <ApplicationHeader
                          eyebrow="Novos vendedores"
                          title="Candidaturas de lojas"
                          description="Negócios interessados em vender produtos através do marketplace Nazunga."
                          total={
                            storeApplications.length
                          }
                          newCount={
                            storeApplications.filter(
                              (item) =>
                                item.status === "new"
                            ).length
                          }
                          filter={
                            applicationStatusFilter
                          }
                          onFilter={
                            setApplicationStatusFilter
                          }
                        />

                        <div className="space-y-4">
                          {storeApplications
                            .filter(
                              (item) =>
                                applicationStatusFilter ===
                                  "all" ||
                                item.status ===
                                  applicationStatusFilter
                            )
                            .map((item) => (
                              <article
                                key={item.id}
                                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                              >
                                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <h3 className="text-xl font-black">
                                        {item.store_name}
                                      </h3>
                                      <span
                                        className={`rounded-full px-3 py-1 text-xs font-bold ${applicationStatusClass(
                                          item.status
                                        )}`}
                                      >
                                        {applicationStatusLabel(
                                          item.status
                                        )}
                                      </span>
                                    </div>

                                    <p className="mt-2 text-sm text-slate-600">
                                      {
                                        item.contact_name
                                      }{" "}
                                      ·{" "}
                                      <a
                                        href={`mailto:${item.email}`}
                                        className="font-bold text-emerald-800 hover:underline"
                                      >
                                        {item.email}
                                      </a>{" "}
                                      ·{" "}
                                      <a
                                        href={`tel:${item.phone}`}
                                        className="font-bold text-emerald-800 hover:underline"
                                      >
                                        {item.phone}
                                      </a>
                                    </p>

                                    <p className="mt-2 text-xs text-slate-500">
                                      {item.province},{" "}
                                      {
                                        item.municipality
                                      }{" "}
                                      · Recebida em{" "}
                                      {new Date(
                                        item.created_at
                                      ).toLocaleString(
                                        "pt-PT"
                                      )}
                                    </p>
                                  </div>

                                  <select
                                    value={item.status}
                                    disabled={
                                      applicationBusyId ===
                                      item.id
                                    }
                                    onChange={(event) =>
                                      updateMarketplaceApplication(
                                        "store",
                                        item.id,
                                        {
                                          status:
                                            event.target
                                              .value as ApplicationStatus,
                                        }
                                      )
                                    }
                                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold"
                                  >
                                    {APPLICATION_STATUSES.map(
                                      (status) => (
                                        <option
                                          key={
                                            status.value
                                          }
                                          value={
                                            status.value
                                          }
                                        >
                                          {
                                            status.label
                                          }
                                        </option>
                                      )
                                    )}
                                  </select>
                                </div>

                                <div className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 text-sm md:grid-cols-4">
                                  <Info
                                    label="Categoria"
                                    value={
                                      item.product_category
                                    }
                                  />
                                  <Info
                                    label="Produtos"
                                    value={
                                      item.approximate_product_count?.toString() ||
                                      "Não indicado"
                                    }
                                  />
                                  <Info
                                    label="Loja física"
                                    value={
                                      item.has_physical_store
                                        ? "Sim"
                                        : "Não"
                                    }
                                  />
                                  <Info
                                    label="Entregas"
                                    value={
                                      item.needs_delivery
                                        ? "Necessita"
                                        : "Não necessita"
                                    }
                                  />
                                </div>

                                <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                  {
                                    item.business_description
                                  }
                                </p>

                                {item.social_url && (
                                  <a
                                    href={item.social_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-4 inline-flex font-bold text-emerald-800 hover:underline"
                                  >
                                    Ver presença online →
                                  </a>
                                )}

                                <label className="mt-5 block">
                                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                                    Notas internas
                                  </span>
                                  <textarea
                                    key={`${item.id}-${item.internal_notes}`}
                                    defaultValue={
                                      item.internal_notes ||
                                      ""
                                    }
                                    rows={2}
                                    onBlur={(event) =>
                                      updateMarketplaceApplication(
                                        "store",
                                        item.id,
                                        {
                                          internal_notes:
                                            event.target
                                              .value,
                                        }
                                      )
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                                  />
                                </label>

                                {item.status ===
                                  "approved" &&
                                  !item.created_store_id && (
                                    <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                                      Candidatura aprovada.
                                      A criação automática da
                                      loja será ligada numa
                                      próxima etapa.
                                    </div>
                                  )}
                              </article>
                            ))}

                          {!storeApplications.filter(
                            (item) =>
                              applicationStatusFilter ===
                                "all" ||
                              item.status ===
                                applicationStatusFilter
                          ).length && (
                            <EmptyApplications
                              title="Sem candidaturas de lojas"
                              description="As candidaturas enviadas pelo formulário público aparecerão aqui."
                            />
                          )}
                        </div>
                      </section>
                    )}

                  {tab === "homepage" &&
                    canManage &&
                    firebaseUser && (
                      <HomepageEditor
                        user={firebaseUser}
                      />
                    )}

                  {tab === "settings" && canManage && (
                    <form
                      onSubmit={saveStore}
                      className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-950 shadow-sm"
                    >
                      <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <div className="relative h-52 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-700">
                          {bannerVisible && (
                            <img
                              src={`${API_URL}/public/marketplace/stores/${selectedStore.slug}/banner?v=${brandingVersion}`}
                              alt={`Capa de ${selectedStore.name}`}
                              onLoad={() =>
                                setBannerVisible(true)
                              }
                              onError={() =>
                                setBannerVisible(false)
                              }
                              className="h-full w-full object-cover"
                            />
                          )}

                          {!bannerVisible && (
                            <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-semibold text-emerald-50">
                              Adicione uma imagem de capa horizontal para apresentar a loja.
                            </div>
                          )}

                          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/70 to-transparent" />
                        </div>

                        <div className="relative bg-white px-5 pb-5 pt-16 md:px-7">
                          <div className="absolute -top-14 left-5 flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-amber-300 text-3xl font-black text-slate-950 shadow-xl md:left-7">
                            {logoVisible ? (
                              <img
                                src={`${API_URL}/public/marketplace/stores/${selectedStore.slug}/logo?v=${brandingVersion}`}
                                alt={`Logótipo de ${selectedStore.name}`}
                                onLoad={() =>
                                  setLogoVisible(true)
                                }
                                onError={() =>
                                  setLogoVisible(false)
                                }
                                className="h-full w-full bg-white object-contain p-2"
                              />
                            ) : (
                              selectedStore.name
                                .split(" ")
                                .map((word) => word[0])
                                .join("")
                                .slice(0, 2)
                            )}
                          </div>

                          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                                Identidade visual
                              </p>
                              <h3 className="mt-1 text-xl font-black text-slate-950">
                                {selectedStore.name}
                              </h3>
                              <p className="mt-1 text-sm text-slate-600">
                                JPG, PNG ou WEBP. Logótipo até 5 MB; capa até 10 MB.
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <label className="cursor-pointer rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">
                                {brandingBusy === "logo"
                                  ? "A carregar..."
                                  : "Carregar logótipo"}
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  disabled={Boolean(brandingBusy)}
                                  onChange={(event) => {
                                    void uploadStoreBranding(
                                      "logo",
                                      event.target.files?.[0] ||
                                        null
                                    );
                                    event.currentTarget.value = "";
                                  }}
                                  className="hidden"
                                />
                              </label>

                              <label className="cursor-pointer rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">
                                {brandingBusy === "banner"
                                  ? "A carregar..."
                                  : "Carregar capa"}
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  disabled={Boolean(brandingBusy)}
                                  onChange={(event) => {
                                    void uploadStoreBranding(
                                      "banner",
                                      event.target.files?.[0] ||
                                        null
                                    );
                                    event.currentTarget.value = "";
                                  }}
                                  className="hidden"
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteStoreBranding("logo")
                                }
                                disabled={Boolean(brandingBusy)}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                              >
                                Remover logótipo
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteStoreBranding("banner")
                                }
                                disabled={Boolean(brandingBusy)}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                              >
                                Remover capa
                              </button>
                            </div>
                          </div>
                        </div>
                      </section>

                      <div className="grid gap-5 md:grid-cols-2">
                        <Field
                          label="Nome da loja"
                          value={storeForm.name}
                          onChange={(value) =>
                            setStoreForm({
                              ...storeForm,
                              name: value,
                            })
                          }
                        />

                        <Field
                          label="Slogan"
                          value={storeForm.tagline}
                          onChange={(value) =>
                            setStoreForm({
                              ...storeForm,
                              tagline: value,
                            })
                          }
                        />

                        <Field
                          label="Pessoa de contacto"
                          value={storeForm.contact_name}
                          onChange={(value) =>
                            setStoreForm({
                              ...storeForm,
                              contact_name: value,
                            })
                          }
                        />

                        <Field
                          label="Telefone"
                          value={storeForm.contact_phone}
                          onChange={(value) =>
                            setStoreForm({
                              ...storeForm,
                              contact_phone: value,
                            })
                          }
                        />

                        <Field
                          label="Email"
                          type="email"
                          value={storeForm.contact_email}
                          onChange={(value) =>
                            setStoreForm({
                              ...storeForm,
                              contact_email: value,
                            })
                          }
                        />

                        <Field
                          label="WhatsApp"
                          value={storeForm.whatsapp}
                          onChange={(value) =>
                            setStoreForm({
                              ...storeForm,
                              whatsapp: value,
                            })
                          }
                        />

                        <Field
                          label="Preparação da encomenda (horas)"
                          type="number"
                          value={storeForm.preparation_time_hours}
                          onChange={(value) =>
                            setStoreForm({
                              ...storeForm,
                              preparation_time_hours: value,
                            })
                          }
                        />

                        <Field
                          label="Compra mínima"
                          type="number"
                          value={storeForm.minimum_order_amount}
                          onChange={(value) =>
                            setStoreForm({
                              ...storeForm,
                              minimum_order_amount: value,
                            })
                          }
                        />

                        <SelectField
                          label="Estado da loja"
                          value={storeForm.status}
                          onChange={(value) =>
                            setStoreForm({
                              ...storeForm,
                              status: value,
                            })
                          }
                          options={[
                            ["draft", "Rascunho"],
                            ["active", "Ativa"],
                            ["suspended", "Suspensa"],
                            ["closed", "Encerrada"],
                          ]}
                        />

                        <section className="md:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                          <h3 className="font-black text-slate-950">
                            Formas de receber a encomenda
                          </h3>

                          <p className="mt-1 text-sm text-slate-600">
                            Escolha as opções disponíveis nesta loja.
                            Pelo menos uma deve permanecer ativa.
                          </p>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <label className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-white p-4">
                              <input
                                type="checkbox"
                                checked={
                                  storeForm.allows_collection
                                }
                                disabled={
                                  storeForm.allows_collection &&
                                  !storeForm.allows_delivery
                                }
                                onChange={(event) =>
                                  setStoreForm({
                                    ...storeForm,
                                    allows_collection:
                                      event.target.checked,
                                  })
                                }
                                className="mt-0.5 h-5 w-5 accent-emerald-700 disabled:cursor-not-allowed"
                              />

                              <span>
                                <span className="block font-bold">
                                  Recolha na loja
                                </span>
                                <span className="mt-1 block text-sm text-slate-500">
                                  O cliente pode levantar a
                                  encomenda numa localização da
                                  loja.
                                </span>
                              </span>
                            </label>

                            <label className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-white p-4">
                              <input
                                type="checkbox"
                                checked={
                                  storeForm.allows_delivery
                                }
                                disabled={
                                  storeForm.allows_delivery &&
                                  !storeForm.allows_collection
                                }
                                onChange={(event) =>
                                  setStoreForm({
                                    ...storeForm,
                                    allows_delivery:
                                      event.target.checked,
                                  })
                                }
                                className="mt-0.5 h-5 w-5 accent-emerald-700 disabled:cursor-not-allowed"
                              />

                              <span>
                                <span className="block font-bold">
                                  Entrega ao cliente
                                </span>
                                <span className="mt-1 block text-sm text-slate-500">
                                  O cliente pode indicar uma
                                  morada e escolher uma data de
                                  entrega.
                                </span>
                              </span>
                            </label>
                          </div>
                        </section>

                        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                          <input
                            type="checkbox"
                            checked={storeForm.is_accepting_orders}
                            onChange={(event) =>
                              setStoreForm({
                                ...storeForm,
                                is_accepting_orders:
                                  event.target.checked,
                              })
                            }
                            className="h-5 w-5"
                          />
                          <span>
                            <span className="block font-semibold">
                              Aceitar encomendas
                            </span>
                            <span className="text-sm text-slate-500">
                              Permite novas compras na loja pública.
                            </span>
                          </span>
                        </label>

                        <TextArea
                          label="Descrição pública"
                          value={storeForm.description}
                          onChange={(value) =>
                            setStoreForm({
                              ...storeForm,
                              description: value,
                            })
                          }
                        />

                        <TextArea
                          label="Política de entrega"
                          value={storeForm.delivery_policy}
                          onChange={(value) =>
                            setStoreForm({
                              ...storeForm,
                              delivery_policy: value,
                            })
                          }
                        />

                        <TextArea
                          label="Política de recolha"
                          value={storeForm.collection_policy}
                          onChange={(value) =>
                            setStoreForm({
                              ...storeForm,
                              collection_policy: value,
                            })
                          }
                        />

                        <TextArea
                          label="Política de devolução"
                          value={storeForm.return_policy}
                          onChange={(value) =>
                            setStoreForm({
                              ...storeForm,
                              return_policy: value,
                            })
                          }
                        />
                      </div>

                      <div className="mt-6 flex justify-end">
                        <button
                          type="submit"
                          disabled={saving}
                          className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white disabled:opacity-50"
                        >
                          {saving
                            ? "A guardar..."
                            : "Guardar configuração"}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </main>
        </div>

        {campaignModalOpen && (
          <Modal
            title="Nova campanha publicitária"
            onClose={() => {
              if (!campaignSaving) {
                setCampaignModalOpen(false);
              }
            }}
          >
            <form
              onSubmit={createCampaign}
              className="space-y-6 text-slate-950"
            >
              <div className="rounded-2xl border border-[#ffb7aa] bg-[#fff0ed] p-4">
                <h3 className="font-black text-[#5a2118]">
                  Campanha comercial Nazunga
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#713126]">
                  Registe o valor cobrado, o período contratado e a posição onde o flyer aparecerá.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Título *"
                  value={campaignForm.title}
                  onChange={(value) =>
                    setCampaignForm({
                      ...campaignForm,
                      title: value,
                    })
                  }
                />

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Loja anunciante
                  </span>
                  <select
                    value={campaignForm.store_id}
                    onChange={(event) => {
                      const store = stores.find(
                        (item) =>
                          item.id ===
                          event.target.value
                      );

                      setCampaignForm({
                        ...campaignForm,
                        store_id:
                          event.target.value,
                        target_url: store
                          ? `/lojas/${store.slug}`
                          : campaignForm.target_url,
                      });
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"
                  >
                    <option value="">
                      Campanha da Nazunga
                    </option>
                    {stores.map((store) => (
                      <option
                        key={store.id}
                        value={store.id}
                      >
                        {store.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Texto da campanha
                  </span>
                  <textarea
                    rows={3}
                    value={campaignForm.subtitle}
                    onChange={(event) =>
                      setCampaignForm({
                        ...campaignForm,
                        subtitle:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Posição
                  </span>
                  <select
                    value={campaignForm.placement}
                    onChange={(event) =>
                      setCampaignForm({
                        ...campaignForm,
                        placement:
                          event.target
                            .value as CampaignForm["placement"],
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"
                  >
                    <option value="home_hero">
                      Destaque principal
                    </option>
                    <option value="home_banner">
                      Banner horizontal
                    </option>
                    <option value="home_grid">
                      Grelha comercial
                    </option>
                  </select>
                </label>

                <Field
                  label="Texto do botão"
                  value={campaignForm.button_label}
                  onChange={(value) =>
                    setCampaignForm({
                      ...campaignForm,
                      button_label: value,
                    })
                  }
                />

                <Field
                  label="Link de destino"
                  value={campaignForm.target_url}
                  onChange={(value) =>
                    setCampaignForm({
                      ...campaignForm,
                      target_url: value,
                    })
                  }
                />

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Flyer *
                  </span>
                  <input
                    type="file"
                    required
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      setCampaignImage(
                        event.target.files?.[0] ||
                          null
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Início *
                  </span>
                  <input
                    type="datetime-local"
                    required
                    value={campaignForm.starts_at}
                    onChange={(event) =>
                      setCampaignForm({
                        ...campaignForm,
                        starts_at:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Fim *
                  </span>
                  <input
                    type="datetime-local"
                    required
                    value={campaignForm.ends_at}
                    onChange={(event) =>
                      setCampaignForm({
                        ...campaignForm,
                        ends_at:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"
                  />
                </label>

                <Field
                  label="Preço cobrado"
                  value={campaignForm.price}
                  type="number"
                  onChange={(value) =>
                    setCampaignForm({
                      ...campaignForm,
                      price: value,
                    })
                  }
                />

                <Field
                  label="Prioridade"
                  value={campaignForm.priority}
                  type="number"
                  onChange={(value) =>
                    setCampaignForm({
                      ...campaignForm,
                      priority: value,
                    })
                  }
                />

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Estado inicial
                  </span>
                  <select
                    value={campaignForm.status}
                    onChange={(event) =>
                      setCampaignForm({
                        ...campaignForm,
                        status:
                          event.target
                            .value as CampaignForm["status"],
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"
                  >
                    <option value="draft">
                      Guardar como rascunho
                    </option>
                    <option value="active">
                      Ativar imediatamente
                    </option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() =>
                    setCampaignModalOpen(false)
                  }
                  disabled={campaignSaving}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={campaignSaving}
                  className="rounded-xl bg-[#102820] px-5 py-3 font-black text-white hover:bg-[#1d4438] disabled:bg-slate-300 disabled:text-slate-700"
                >
                  {campaignSaving
                    ? "A guardar..."
                    : "Guardar campanha"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {newStoreOpen && (
          <Modal
            title="Adicionar nova loja"
            onClose={() => {
              if (!newStoreSaving) {
                setNewStoreOpen(false);
              }
            }}
          >
            <form
              onSubmit={createStore}
              className="space-y-6 text-slate-950"
            >
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="font-bold text-emerald-950">
                  Nova loja Nazunga
                </h3>
                <p className="mt-1 text-sm leading-6 text-emerald-900">
                  A loja será criada como rascunho. Depois poderá adicionar produtos, imagens e ativá-la quando estiver pronta.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Nome da loja *"
                  value={newStoreForm.name}
                  onChange={updateNewStoreName}
                />

                <Field
                  label="Endereço da loja"
                  value={newStoreForm.slug}
                  onChange={(value) =>
                    setNewStoreForm({
                      ...newStoreForm,
                      slug: value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, ""),
                    })
                  }
                />

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Localização que fornece o stock *
                  </span>
                  <select
                    required
                    value={newStoreForm.location_id}
                    onChange={(event) =>
                      setNewStoreForm({
                        ...newStoreForm,
                        location_id:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-emerald-700"
                  >
                    <option value="">
                      Selecione uma localização
                    </option>
                    {marketplaceLocations.map(
                      (location) => (
                        <option
                          key={location.id}
                          value={location.id}
                        >
                          {location.name} ·{" "}
                          {location.location_code}
                        </option>
                      )
                    )}
                  </select>
                  <span className="mt-2 block text-xs text-slate-600">
                    O stock público desta loja será calculado a partir desta localização.
                  </span>
                </label>

                <Field
                  label="Slogan"
                  value={newStoreForm.tagline}
                  onChange={(value) =>
                    setNewStoreForm({
                      ...newStoreForm,
                      tagline: value,
                    })
                  }
                />

                <div className="md:col-span-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-800">
                      Descrição pública
                    </span>
                    <textarea
                      rows={4}
                      value={newStoreForm.description}
                      onChange={(event) =>
                        setNewStoreForm({
                          ...newStoreForm,
                          description:
                            event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-emerald-700"
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() =>
                    setNewStoreOpen(false)
                  }
                  disabled={newStoreSaving}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    newStoreSaving ||
                    marketplaceLocations.length === 0
                  }
                  className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
                >
                  {newStoreSaving
                    ? "A criar..."
                    : "Criar loja"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* DETALHES DA ENCOMENDA MARKETPLACE */}
        {selectedOrder && (
          <Modal
            title={`Encomenda ${selectedOrder.order.order_number}`}
            onClose={() => setSelectedOrder(null)}
          >
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <OrderBadge
                  status={selectedOrder.order.status}
                />
                <PaymentBadge
                  status={
                    selectedOrder.order.payment_status
                  }
                />
                <span className="text-sm text-slate-500">
                  Criada em{" "}
                  {new Date(
                    selectedOrder.order.created_at
                  ).toLocaleString("pt-PT")}
                </span>
              </div>

              <section className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-950">
                  Cliente
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <DetailValue
                    label="Nome"
                    value={
                      selectedOrder.order.customer_name
                    }
                  />
                  <DetailValue
                    label="Telefone"
                    value={
                      selectedOrder.order.customer_phone
                    }
                  />
                  <DetailValue
                    label="WhatsApp"
                    value={
                      selectedOrder.order
                        .customer_whatsapp || "—"
                    }
                  />
                  <DetailValue
                    label="Email"
                    value={
                      selectedOrder.order
                        .customer_email || "—"
                    }
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-950">
                  Receção da encomenda
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <DetailValue
                    label="Método"
                    value={
                      selectedOrder.order
                        .fulfilment_method ===
                      "delivery"
                        ? "Entrega"
                        : "Recolha na loja"
                    }
                  />

                  <DetailValue
                    label="Data e hora pretendidas"
                    value={[
                      selectedOrder.order
                        .requested_delivery_date,
                      selectedOrder.order
                        .requested_delivery_time,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Não indicada"}
                  />

                  {selectedOrder.order
                    .fulfilment_method ===
                    "collection" ? (
                    <div className="sm:col-span-2">
                      <DetailValue
                        label="Local de recolha"
                        value={
                          selectedOrder.order
                            .collection_location_name
                            ? `${
                                selectedOrder.order
                                  .collection_location_name
                              } · ${
                                selectedOrder.order
                                  .collection_location_code ||
                                ""
                              }`
                            : "Não definido"
                        }
                      />
                    </div>
                  ) : (
                    <div className="sm:col-span-2">
                      <DetailValue
                        label="Morada de entrega"
                        value={[
                          selectedOrder.order
                            .delivery_address_line1,
                          selectedOrder.order
                            .delivery_address_line2,
                          selectedOrder.order
                            .delivery_city,
                          selectedOrder.order
                            .delivery_province,
                          selectedOrder.order
                            .delivery_postal_code,
                          selectedOrder.order
                            .delivery_country,
                        ]
                          .filter(Boolean)
                          .join(", ") || "Não indicada"}
                      />
                    </div>
                  )}
                </div>

                {selectedOrder.order.customer_notes && (
                  <div className="mt-4">
                    <DetailValue
                      label="Notas do cliente"
                      value={
                        selectedOrder.order
                          .customer_notes
                      }
                    />
                  </div>
                )}
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <h3 className="font-bold text-slate-950">
                    Produtos
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-slate-950">
                    <thead className="bg-white">
                      <tr className="text-left text-xs font-bold uppercase text-slate-500">
                        <th className="px-5 py-3">
                          Produto
                        </th>
                        <th className="px-5 py-3 text-right">
                          Quantidade
                        </th>
                        <th className="px-5 py-3 text-right">
                          Preço
                        </th>
                        <th className="px-5 py-3 text-right">
                          Total
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      {selectedOrder.items.map(
                        (item) => (
                          <tr key={item.id}>
                            <td className="px-5 py-4">
                              <div className="font-semibold text-slate-950">
                                {item.product_name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {item.sku || "Sem SKU"}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-right">
                              {Number(item.quantity)}
                            </td>
                            <td className="px-5 py-4 text-right">
                              {money(
                                item.unit_price,
                                selectedOrder.order
                                  .currency
                              )}
                            </td>
                            <td className="px-5 py-4 text-right font-bold">
                              {money(
                                item.line_total,
                                selectedOrder.order
                                  .currency
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2 border-t border-slate-200 bg-slate-50 px-5 py-5 text-slate-950">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <strong>
                      {money(
                        selectedOrder.order.subtotal,
                        selectedOrder.order.currency
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Entrega</span>
                    <strong>
                      {money(
                        selectedOrder.order
                          .delivery_amount,
                        selectedOrder.order.currency
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between border-t border-slate-300 pt-3 text-lg font-black">
                    <span>Total</span>
                    <span>
                      {money(
                        selectedOrder.order.total_amount,
                        selectedOrder.order.currency
                      )}
                    </span>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950">
                <h3 className="font-bold text-slate-950">
                  Pagamentos
                </h3>

                {selectedOrder.payments.length ? (
                  <div className="mt-4 space-y-3">
                    {selectedOrder.payments.map(
                      (payment) => (
                        <div
                          key={payment.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-950"
                        >
                          <div>
                            <div
                              className="font-semibold"
                              style={{ color: "#0f172a" }}
                            >
                              {paymentMethodLabel(
                                payment.payment_method
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              {payment.provider}
                              {payment.provider_reference
                                ? ` · ${payment.provider_reference}`
                                : ""}
                            </div>
                          </div>

                          <div className="text-right">
                            <div
                              className="font-bold"
                              style={{ color: "#0f172a" }}
                            >
                              {money(
                                payment.amount,
                                payment.currency
                              )}
                            </div>
                            <div className="text-xs text-slate-600">
                              {paymentAttemptStatusLabel(
                                payment.status
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Ainda não existem pagamentos registados.
                  </p>
                )}
              </section>

              {selectedOrder.order.sales_order_id &&
                selectedOrder.order.payment_status !== "paid" &&
                !["cancelled", "refunded"].includes(
                  selectedOrder.order.status
                ) &&
                currentUser?.permissions?.includes(
                  "marketplace.orders"
                ) && (
                  <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-slate-950">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-950">
                          Receber pagamento
                        </h3>
                        <p className="mt-1 text-sm text-slate-700">
                          Pagamentos totais movimentam o stock da loja.
                        </p>
                      </div>

                      {!showOrderPayment && (
                        <button
                          type="button"
                          onClick={openMarketplacePayment}
                          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
                        >
                          Registar pagamento
                        </button>
                      )}
                    </div>

                    {showOrderPayment && (
                      <form
                        onSubmit={registerMarketplacePayment}
                        className="mt-5 space-y-4"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-slate-800">
                              Método
                            </span>
                            <select
                              value={orderPaymentMethod}
                              onChange={(event) =>
                                setOrderPaymentMethod(
                                  event.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-emerald-700"
                            >
                              <option value="cash">
                                Dinheiro
                              </option>
                              <option value="bank_transfer">
                                Transferência bancária
                              </option>
                              <option value="multicaixa">
                                Multicaixa
                              </option>
                              <option value="card">
                                Cartão
                              </option>
                              <option value="online">
                                Online
                              </option>
                              <option value="voucher">
                                Voucher
                              </option>
                              <option value="other">
                                Outro
                              </option>
                            </select>
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-slate-800">
                              Valor
                            </span>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                              value={orderPaymentAmount}
                              onChange={(event) =>
                                setOrderPaymentAmount(
                                  event.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none placeholder:text-slate-500 focus:border-emerald-700"
                            />
                          </label>
                        </div>

                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-slate-800">
                            Referência
                          </span>
                          <input
                            value={orderPaymentReference}
                            onChange={(event) =>
                              setOrderPaymentReference(
                                event.target.value
                              )
                            }
                            placeholder="Opcional"
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none placeholder:text-slate-500 focus:border-emerald-700"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-slate-800">
                            Notas
                          </span>
                          <textarea
                            rows={3}
                            value={orderPaymentNotes}
                            onChange={(event) =>
                              setOrderPaymentNotes(
                                event.target.value
                              )
                            }
                            placeholder="Opcional"
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none placeholder:text-slate-500 focus:border-emerald-700"
                          />
                        </label>

                        <div className="flex flex-wrap justify-end gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setShowOrderPayment(false)
                            }
                            disabled={orderActionLoading}
                            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-100 disabled:bg-slate-200 disabled:text-slate-600"
                          >
                            Cancelar
                          </button>

                          <button
                            type="submit"
                            disabled={orderActionLoading}
                            className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
                          >
                            {orderActionLoading
                              ? "A registar..."
                              : "Confirmar pagamento"}
                          </button>
                        </div>
                      </form>
                    )}
                  </section>
                )}

              <section className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-950">
                  Histórico
                </h3>

                <div className="mt-4 space-y-4">
                  {selectedOrder.history.map(
                    (entry) => (
                      <div
                        key={entry.id}
                        className="border-l-2 border-slate-300 pl-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <OrderBadge
                            status={entry.new_status}
                          />
                          <span className="text-xs text-slate-500">
                            {new Date(
                              entry.changed_at
                            ).toLocaleString("pt-PT")}
                          </span>
                        </div>

                        {entry.notes && (
                          <p className="mt-2 text-sm text-slate-700">
                            {entry.notes}
                          </p>
                        )}

                        {entry.changed_by_name && (
                          <p className="mt-1 text-xs text-slate-500">
                            Por{" "}
                            {entry.changed_by_name}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              </section>

              <div className="flex flex-wrap justify-end gap-3">
                {selectedOrder.order.status === "pending" &&
                  !selectedOrder.order.sales_order_id &&
                  currentUser?.permissions?.includes(
                    "marketplace.orders"
                  ) && (
                    <button
                      type="button"
                      onClick={confirmMarketplaceOrder}
                      disabled={orderActionLoading}
                      className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
                    >
                      {orderActionLoading
                        ? "A confirmar..."
                        : "Confirmar encomenda"}
                    </button>
                  )}

                {nextOrderAction(
                  selectedOrder.order.status,
                  selectedOrder.order.fulfilment_method
                ) &&
                  currentUser?.permissions?.includes(
                    "marketplace.orders"
                  ) && (
                    <button
                      type="button"
                      onClick={advanceMarketplaceOrder}
                      disabled={orderActionLoading}
                      className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
                    >
                      {orderActionLoading
                        ? "A atualizar..."
                        : nextOrderAction(
                            selectedOrder.order.status,
                            selectedOrder.order
                              .fulfilment_method
                          )?.label}
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() =>
                    setSelectedOrder(null)
                  }
                  disabled={orderActionLoading}
                  className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
                >
                  Fechar
                </button>
              </div>
            </div>
          </Modal>
        )}

        {listingModalOpen && (
          <Modal
            title={
              editingListing
                ? "Editar produto do catálogo"
                : "Adicionar produto ao catálogo"
            }
            onClose={() => setListingModalOpen(false)}
          >
            <form onSubmit={saveListing}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Nome público *"
                  value={listingForm.public_name}
                  onChange={(value) =>
                    setListingForm({
                      ...listingForm,
                      public_name: value,
                    })
                  }
                />

                <Field
                  label="Endereço/slug"
                  value={listingForm.slug}
                  placeholder="Gerado automaticamente"
                  onChange={(value) =>
                    setListingForm({
                      ...listingForm,
                      slug: value,
                    })
                  }
                />

                <Field
                  label="Preço público *"
                  type="number"
                  value={listingForm.public_price}
                  onChange={(value) =>
                    setListingForm({
                      ...listingForm,
                      public_price: value,
                    })
                  }
                />

                <Field
                  label="Preço anterior"
                  type="number"
                  value={listingForm.compare_at_price}
                  onChange={(value) =>
                    setListingForm({
                      ...listingForm,
                      compare_at_price: value,
                    })
                  }
                />

                <Field
                  label="Quantidade mínima"
                  type="number"
                  value={listingForm.minimum_quantity}
                  onChange={(value) =>
                    setListingForm({
                      ...listingForm,
                      minimum_quantity: value,
                    })
                  }
                />

                <Field
                  label="Quantidade máxima"
                  type="number"
                  value={listingForm.maximum_quantity}
                  onChange={(value) =>
                    setListingForm({
                      ...listingForm,
                      maximum_quantity: value,
                    })
                  }
                />

                <Field
                  label="Stock de segurança"
                  type="number"
                  value={listingForm.stock_buffer}
                  onChange={(value) =>
                    setListingForm({
                      ...listingForm,
                      stock_buffer: value,
                    })
                  }
                />

                <SelectField
                  label="Estado"
                  value={listingForm.status}
                  onChange={(value) =>
                    setListingForm({
                      ...listingForm,
                      status: value,
                    })
                  }
                  options={[
                    ["draft", "Rascunho"],
                    ["active", "Publicado"],
                    ["hidden", "Oculto"],
                    ["suspended", "Suspenso"],
                    ["archived", "Arquivado"],
                  ]}
                />

                <TextArea
                  label="Descrição curta"
                  value={listingForm.short_description}
                  onChange={(value) =>
                    setListingForm({
                      ...listingForm,
                      short_description: value,
                    })
                  }
                />

                <TextArea
                  label="Descrição completa"
                  value={listingForm.public_description}
                  onChange={(value) =>
                    setListingForm({
                      ...listingForm,
                      public_description: value,
                    })
                  }
                />

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                  <input
                    type="checkbox"
                    checked={listingForm.is_featured}
                    onChange={(event) =>
                      setListingForm({
                        ...listingForm,
                        is_featured: event.target.checked,
                      })
                    }
                    className="h-5 w-5"
                  />
                  <span className="font-medium text-slate-950" style={{ color: "#0f172a", opacity: 1 }}>Produto destacado</span>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                  <input
                    type="checkbox"
                    checked={listingForm.allow_backorder}
                    onChange={(event) =>
                      setListingForm({
                        ...listingForm,
                        allow_backorder: event.target.checked,
                      })
                    }
                    className="h-5 w-5"
                  />
                  <span
                    className="font-medium text-slate-950"
                    style={{ color: "#0f172a", opacity: 1 }}
                  >
                    Permitir encomenda sem stock
                  </span>
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setListingModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "A guardar..." : "Guardar produto"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </PermissionGate>
  );
}

function ProductImage({
  path,
  name,
  user,
}: {
  path: string | null;
  name: string;
  user: User | null;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    async function loadImage() {
      setObjectUrl(null);

      if (!path || !user) return;

      try {
        const token = await user.getIdToken();
        const adminPath = path.replace(
          "/public/marketplace/images/",
          "/api/marketplace/images/"
        );

        const response = await fetch(`${API_URL}${adminPath}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) return;

        const blob = await response.blob();
        createdUrl = URL.createObjectURL(blob);

        if (active) {
          setObjectUrl(createdUrl);
        } else {
          URL.revokeObjectURL(createdUrl);
        }
      } catch {
        setObjectUrl(null);
      }
    }

    loadImage();

    return () => {
      active = false;

      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [path, user]);

  return (
    <div className="flex h-52 items-center justify-center bg-slate-100">
      {objectUrl ? (
        <img
          src={objectUrl}
          alt={name}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="text-sm text-slate-500">
          {path ? "A carregar imagem..." : "Sem imagem"}
        </div>
      )}
    </div>
  );
}

function OrderBadge({
  status,
}: {
  status: string;
}) {
  const labels: Record<string, string> = {
    pending: "Pendente",
    confirmed: "Confirmada",
    preparing: "Em preparação",
    ready_for_collection: "Pronta para recolha",
    scheduled_for_delivery: "Entrega agendada",
    out_for_delivery: "Saiu para entrega",
    delivered: "Entregue",
    collected: "Recolhida",
    cancelled: "Cancelada",
    refunded: "Reembolsada",
  };

  const classes =
    status === "cancelled" ||
    status === "refunded"
      ? "bg-red-100 text-red-700"
      : status === "delivered" ||
          status === "collected"
        ? "bg-emerald-100 text-emerald-700"
        : status === "pending"
          ? "bg-amber-100 text-amber-800"
          : "bg-blue-100 text-blue-700";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}
    >
      {labels[status] || status}
    </span>
  );
}

function PaymentBadge({
  status,
}: {
  status: string;
}) {
  const labels: Record<string, string> = {
    unpaid: "Não pago",
    pending: "Pendente",
    paid: "Pago",
    partially_refunded: "Reembolso parcial",
    refunded: "Reembolsado",
    failed: "Falhou",
    cancelled: "Cancelado",
  };

  const classes =
    status === "paid"
      ? "bg-emerald-100 text-emerald-700"
      : status === "failed" ||
          status === "cancelled"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-800";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}
    >
      {labels[status] || status}
    </span>
  );
}

function Badge({ status }: { status: string }) {
  const classes =
    status === "active"
      ? "bg-emerald-100 text-emerald-700"
      : status === "draft"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-600";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}>
      {statusLabel(status)}
    </span>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Rascunho",
    active: "Ativo",
    hidden: "Oculto",
    suspended: "Suspenso",
    archived: "Arquivado",
    closed: "Encerrado",
  };

  return labels[status] || status;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400"
      />
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
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
          : "rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
      }
    >
      {children}
    </button>
  );
}

function ApplicationHeader({
  eyebrow,
  title,
  description,
  total,
  newCount,
  filter,
  onFilter,
}: {
  eyebrow: string;
  title: string;
  description: string;
  total: number;
  newCount: number;
  filter: "all" | ApplicationStatus;
  onFilter: (
    value: "all" | ApplicationStatus
  ) => void;
}) {
  return (
    <>
      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-[#102820] p-6 text-white shadow-sm md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#b9ff66]">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-black">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
            {description}
          </p>
        </div>

        <div className="flex gap-3">
          <div className="rounded-xl bg-white/10 px-5 py-3 text-center">
            <div className="text-2xl font-black">
              {total}
            </div>
            <div className="text-xs text-white/60">
              Total
            </div>
          </div>
          <div className="rounded-xl bg-[#b9ff66] px-5 py-3 text-center text-[#102820]">
            <div className="text-2xl font-black">
              {newCount}
            </div>
            <div className="text-xs font-bold">
              Novas
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onFilter("all")}
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            filter === "all"
              ? "bg-slate-950 text-white"
              : "bg-white text-slate-700"
          }`}
        >
          Todas
        </button>

        {APPLICATION_STATUSES.map((status) => (
          <button
            key={status.value}
            type="button"
            onClick={() =>
              onFilter(status.value)
            }
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              filter === status.value
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-700"
            }`}
          >
            {status.label}
          </button>
        ))}
      </div>
    </>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function EmptyApplications({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <h3 className="font-black text-slate-950">
        {title}
      </h3>
      <p className="mt-2 text-sm text-slate-600">
        {description}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-28 rounded-xl bg-slate-100 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-bold text-slate-950">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
      {text}
    </div>
  );
}

function DetailValue({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 break-words font-semibold text-slate-950">
        {value}
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-slate-400 hover:text-slate-950"
          >
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
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
      className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium ${
        active
          ? "bg-white text-slate-950"
          : "text-slate-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="w-5 text-center">{icon}</span>
      <span>{label}</span>
    </a>
  );
}
