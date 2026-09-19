"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import MobileNav from "@/components/MobileNav";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Organization = {
  id: string;
  name: string;
  code: string;
  base_currency: string;
  default_language: string;
  is_active: boolean;
};

type Setting = {
  setting_key: string;
  setting_value: unknown;
  description: string | null;
  is_system: boolean;
};


type Location = {
  id: string;
  location_code: string;
  name: string;
  location_type: string;
  address: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  is_active: boolean;
};

type LocationForm = {
  location_code: string;
  name: string;
  location_type: string;
  address: string;
  city: string;
  country: string;
  notes: string;
};


type InvoiceSettings = {
  location_id: string;
  location_code: string;
  location_name: string;
  invoice_prefix: string;
  next_number: number;
  padding: number;
  business_name: string;
  business_subtitle: string;
  tax_number: string;
  phone: string;
  email: string;
  address: string;
  receipt_footer: string;
};

type InvoiceSettingsForm = Omit<
  InvoiceSettings,
  "location_id" | "location_code" | "location_name"
>;

const emptyInvoiceSettingsForm: InvoiceSettingsForm = {
  invoice_prefix: "",
  next_number: 1,
  padding: 6,
  business_name: "",
  business_subtitle: "",
  tax_number: "",
  phone: "",
  email: "",
  address: "",
  receipt_footer: "Obrigado pela sua compra.",
};

export default function SettingsPage() {
  const [organization, setOrganization] =
    useState<Organization | null>(null);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");
  const [reorderLevel, setReorderLevel] = useState("5");
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState("cash");
  const [businessName, setBusinessName] = useState("PEN");
  const [businessSubtitle, setBusinessSubtitle] = useState("Inventário e Vendas");
  const [businessTaxNumber, setBusinessTaxNumber] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("Obrigado pela sua compra.");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState<"upload" | "delete" | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationBusyId, setLocationBusyId] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState<LocationForm>({
    location_code: "",
    name: "",
    location_type: "warehouse",
    address: "",
    city: "",
    country: "",
    notes: "",
  });

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceLocation, setInvoiceLocation] = useState<Location | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [invoiceLogoUrl, setInvoiceLogoUrl] = useState<string | null>(null);
  const [invoiceLogoBusy, setInvoiceLogoBusy] = useState<
    "upload" | "delete" | null
  >(null);
  const [invoiceLogoMessage, setInvoiceLogoMessage] = useState("");
  const [invoiceForm, setInvoiceForm] = useState<InvoiceSettingsForm>(
    emptyInvoiceSettingsForm
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      try {
        setLoading(true);
        setMessage("");

        const token = await user.getIdToken();

        const response = await fetch(`${API_URL}/api/settings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Não foi possível carregar as definições.");
        }

        const data = await response.json();

        setOrganization(data.organization || null);
        setSettings(data.settings || []);

        const locationsResponse = await fetch(
          `${API_URL}/api/locations/manage`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json();
          setLocations(locationsData.locations || []);
        } else if (locationsResponse.status !== 403) {
          console.error("Não foi possível carregar as localizações.");
        }

        const reorderSetting = (data.settings || []).find(
          (setting: Setting) =>
            setting.setting_key === "default_reorder_level"
        );

        if (reorderSetting) {
          setReorderLevel(String(reorderSetting.setting_value));
        }

        const paymentSetting = (data.settings || []).find(
          (setting: Setting) =>
            setting.setting_key === "default_payment_method"
        );

        if (paymentSetting) {
          setDefaultPaymentMethod(String(paymentSetting.setting_value));
        }

        const settingMap = Object.fromEntries(
          (data.settings || []).map((setting: Setting) => [
            setting.setting_key,
            setting.setting_value,
          ])
        );

        setBusinessName(String(settingMap.business_name ?? "PEN"));
        setBusinessSubtitle(
          String(settingMap.business_subtitle ?? "Inventário e Vendas")
        );
        setBusinessTaxNumber(String(settingMap.business_tax_number ?? ""));
        setBusinessPhone(String(settingMap.business_phone ?? ""));
        setBusinessEmail(String(settingMap.business_email ?? ""));
        setBusinessAddress(String(settingMap.business_address ?? ""));
        setReceiptFooter(
          String(
            settingMap.receipt_footer ??
              "Obrigado pela sua compra."
          )
        );

        const logoResponse = await fetch(
          `${API_URL}/api/settings/business-logo`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          setBusinessLogoUrl(URL.createObjectURL(logoBlob));
        } else if (logoResponse.status === 404) {
          setBusinessLogoUrl(null);
        } else {
          console.error("Não foi possível carregar o logótipo da empresa.");
        }
      } catch (error) {
        console.error(error);
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as definições."
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function saveReorderLevel() {
    const value = Number(reorderLevel);

    if (!Number.isInteger(value) || value < 0) {
      setMessage("O nível predefinido de reposição deve ser um número inteiro igual ou superior a 0.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setMessage("Authentication required.");
      return;
    }

    try {
      setSavingKey("default_reorder_level");
      setMessage("");

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/settings/default_reorder_level`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            setting_value: value,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Não foi possível guardar a definição.");
      }

      setSettings((current) =>
        current.map((setting) =>
          setting.setting_key === "default_reorder_level"
            ? data.setting
            : setting
        )
      );

      setReorderLevel(String(data.setting.setting_value));
      setMessage("Nível predefinido de reposição guardado com sucesso.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar a definição."
      );
    } finally {
      setSavingKey(null);
    }
  }

  async function saveDefaultPaymentMethod() {
    const user = auth.currentUser;

    if (!user) {
      setMessage("Authentication required.");
      return;
    }

    try {
      setSavingKey("default_payment_method");
      setMessage("");

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/settings/default_payment_method`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            setting_value: defaultPaymentMethod,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível guardar o método de pagamento predefinido."
        );
      }

      setSettings((current) =>
        current.map((setting) =>
          setting.setting_key === "default_payment_method"
            ? data.setting
            : setting
        )
      );

      setDefaultPaymentMethod(String(data.setting.setting_value));
      setMessage("Método de pagamento predefinido guardado com sucesso.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar o método de pagamento predefinido."
      );
    } finally {
      setSavingKey(null);
    }
  }

  async function saveReceiptSetting(
    settingKey: string,
    value: string,
    successMessage: string
  ) {
    const user = auth.currentUser;

    if (!user) {
      setMessage("Authentication required.");
      return;
    }

    try {
      setSavingKey(settingKey);
      setMessage("");

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/settings/${settingKey}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            setting_value: value,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível guardar a definição do recibo."
        );
      }

      setSettings((current) =>
        current.map((setting) =>
          setting.setting_key === settingKey
            ? data.setting
            : setting
        )
      );

      setMessage(successMessage);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar a definição do recibo."
      );
    } finally {
      setSavingKey(null);
    }
  }

  async function uploadBusinessLogo(file: File) {
    const user = auth.currentUser;

    if (!user) {
      setMessage("Authentication required.");
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Please select a JPEG, PNG or WEBP image.");
      return;
    }

    if (file.size === 0) {
      setMessage("The selected logo file is empty.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("O logótipo da empresa deve ter 5 MB ou menos.");
      return;
    }

    try {
      setLogoBusy("upload");
      setMessage("");

      const token = await user.getIdToken();

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/api/settings/business-logo`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível carregar o logótipo da empresa."
        );
      }

      const logoResponse = await fetch(
        `${API_URL}/api/settings/business-logo`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (!logoResponse.ok) {
        throw new Error("O logótipo foi carregado, mas não foi possível carregar a pré-visualização.");
      }

      const logoBlob = await logoResponse.blob();
      const newLogoUrl = URL.createObjectURL(logoBlob);

      setBusinessLogoUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return newLogoUrl;
      });

      setMessage("Logótipo da empresa carregado com sucesso.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o logótipo da empresa."
      );
    } finally {
      setLogoBusy(null);
    }
  }

  async function deleteBusinessLogo() {
    const user = auth.currentUser;

    if (!user) {
      setMessage("Authentication required.");
      return;
    }

    try {
      setLogoBusy("delete");
      setMessage("");

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/settings/business-logo`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível remover o logótipo da empresa."
        );
      }

      setBusinessLogoUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return null;
      });

      setMessage("Logótipo da empresa removido com sucesso.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível remover o logótipo da empresa."
      );
    } finally {
      setLogoBusy(null);
    }
  }

  function openNewLocation() {
    setEditingLocation(null);
    setLocationForm({
      location_code: "",
      name: "",
      location_type: "warehouse",
      address: "",
      city: "",
      country: "",
      notes: "",
    });
    setMessage("");
    setLocationModalOpen(true);
  }

  function openEditLocation(location: Location) {
    setEditingLocation(location);
    setLocationForm({
      location_code: location.location_code,
      name: location.name,
      location_type: location.location_type,
      address: location.address || "",
      city: location.city || "",
      country: location.country || "",
      notes: location.notes || "",
    });
    setMessage("");
    setLocationModalOpen(true);
  }

  async function saveLocation() {
    const user = auth.currentUser;

    if (!user) {
      setMessage("Autenticação necessária.");
      return;
    }

    if (!locationForm.location_code.trim()) {
      setMessage("O código da localização é obrigatório.");
      return;
    }

    if (!locationForm.name.trim()) {
      setMessage("O nome da localização é obrigatório.");
      return;
    }

    try {
      setLocationSaving(true);
      setMessage("");

      const token = await user.getIdToken();

      const response = await fetch(
        editingLocation
          ? `${API_URL}/api/locations/${editingLocation.id}`
          : `${API_URL}/api/locations`,
        {
          method: editingLocation ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            location_code: locationForm.location_code.trim(),
            name: locationForm.name.trim(),
            location_type: locationForm.location_type,
            address: locationForm.address.trim(),
            city: locationForm.city.trim(),
            country: locationForm.country.trim(),
            notes: locationForm.notes.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const detail = data.detail;

        if (detail === "Location code already exists") {
          throw new Error("Já existe uma localização com este código.");
        }

        if (detail === "Unsupported location type") {
          throw new Error("O tipo de localização selecionado não é válido.");
        }

        throw new Error(detail || "Não foi possível guardar a localização.");
      }

      const savedLocation: Location = data.location;

      setLocations((current) => {
        const exists = current.some(
          (location) => location.id === savedLocation.id
        );

        const updated = exists
          ? current.map((location) =>
              location.id === savedLocation.id
                ? savedLocation
                : location
            )
          : [...current, savedLocation];

        return [...updated].sort((a, b) => {
          if (a.is_active !== b.is_active) {
            return a.is_active ? -1 : 1;
          }

          return a.location_code.localeCompare(b.location_code);
        });
      });

      setLocationModalOpen(false);
      setEditingLocation(null);
      setMessage(
        editingLocation
          ? "Localização atualizada com sucesso."
          : "Localização criada com sucesso."
      );
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar a localização."
      );
    } finally {
      setLocationSaving(false);
    }
  }

  async function toggleLocationStatus(location: Location) {
    const user = auth.currentUser;

    if (!user) {
      setMessage("Autenticação necessária.");
      return;
    }

    const newStatus = !location.is_active;

    try {
      setLocationBusyId(location.id);
      setMessage("");

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/locations/${location.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Não foi possível alterar o estado da localização."
        );
      }

      setLocations((current) =>
        current
          .map((item) =>
            item.id === location.id ? data.location : item
          )
          .sort((a, b) => {
            if (a.is_active !== b.is_active) {
              return a.is_active ? -1 : 1;
            }

            return a.location_code.localeCompare(b.location_code);
          })
      );

      setMessage(
        newStatus
          ? "Localização ativada com sucesso."
          : "Localização desativada com sucesso."
      );
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o estado da localização."
      );
    } finally {
      setLocationBusyId(null);
    }
  }

  async function openInvoiceSettings(location: Location) {
    const user = auth.currentUser;

    if (!user) {
      setMessage("Autenticação necessária.");
      return;
    }

    try {
      setInvoiceLocation(location);
      setInvoiceModalOpen(true);
      setInvoiceLoading(true);
      setInvoiceLogoMessage("");
      setMessage("");

      const token = await user.getIdToken();
      const response = await fetch(
        `${API_URL}/api/locations/${location.id}/invoice-settings`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível carregar a faturação desta loja."
        );
      }

      const invoiceSettings: InvoiceSettings = data.invoice_settings;
      setInvoiceForm({
        invoice_prefix: invoiceSettings.invoice_prefix,
        next_number: Number(invoiceSettings.next_number),
        padding: Number(invoiceSettings.padding),
        business_name: invoiceSettings.business_name || "",
        business_subtitle: invoiceSettings.business_subtitle || "",
        tax_number: invoiceSettings.tax_number || "",
        phone: invoiceSettings.phone || "",
        email: invoiceSettings.email || "",
        address: invoiceSettings.address || "",
        receipt_footer: invoiceSettings.receipt_footer || "",
      });

      await loadInvoiceLogo(location.id, token);
    } catch (error) {
      console.error(error);
      setInvoiceModalOpen(false);
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a faturação desta loja."
      );
    } finally {
      setInvoiceLoading(false);
    }
  }

  async function loadInvoiceLogo(
    locationId: string,
    token: string
  ) {
    const response = await fetch(
      `${API_URL}/api/locations/${locationId}/invoice-logo?v=${Date.now()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    if (response.status === 404) {
      setInvoiceLogoUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      return;
    }

    if (!response.ok) {
      throw new Error(
        "Não foi possível carregar o logótipo desta loja."
      );
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    setInvoiceLogoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return objectUrl;
    });
  }

  async function uploadInvoiceLogo(file: File) {
    const user = auth.currentUser;

    if (!user || !invoiceLocation) {
      setInvoiceLogoMessage("Autenticação necessária.");
      return;
    }

    try {
      setInvoiceLogoBusy("upload");
      setInvoiceLogoMessage("");

      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/api/locations/${invoiceLocation.id}/invoice-logo`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível guardar o logótipo."
        );
      }

      await loadInvoiceLogo(invoiceLocation.id, token);
      setInvoiceLogoMessage("Logótipo da loja guardado com sucesso.");
    } catch (error) {
      console.error(error);
      setInvoiceLogoMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar o logótipo."
      );
    } finally {
      setInvoiceLogoBusy(null);
    }
  }

  async function deleteInvoiceLogo() {
    const user = auth.currentUser;

    if (!user || !invoiceLocation) {
      setInvoiceLogoMessage("Autenticação necessária.");
      return;
    }

    try {
      setInvoiceLogoBusy("delete");
      setInvoiceLogoMessage("");

      const token = await user.getIdToken();
      const response = await fetch(
        `${API_URL}/api/locations/${invoiceLocation.id}/invoice-logo`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível remover o logótipo."
        );
      }

      await loadInvoiceLogo(invoiceLocation.id, token);
      setInvoiceLogoMessage(
        "Logótipo específico removido. Esta loja usa agora o logótipo principal."
      );
    } catch (error) {
      console.error(error);
      setInvoiceLogoMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível remover o logótipo."
      );
    } finally {
      setInvoiceLogoBusy(null);
    }
  }

  async function saveInvoiceSettings() {
    const user = auth.currentUser;

    if (!user || !invoiceLocation) {
      setMessage("Autenticação necessária.");
      return;
    }

    if (!invoiceForm.invoice_prefix.trim()) {
      setMessageType("error");
      setMessage("O prefixo da fatura é obrigatório.");
      return;
    }

    try {
      setInvoiceSaving(true);
      setMessage("");

      const token = await user.getIdToken();
      const response = await fetch(
        `${API_URL}/api/locations/${invoiceLocation.id}/invoice-settings`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            invoice_prefix: invoiceForm.invoice_prefix.trim().toUpperCase(),
            padding: Number(invoiceForm.padding),
            business_name: invoiceForm.business_name.trim(),
            business_subtitle: invoiceForm.business_subtitle.trim(),
            tax_number: invoiceForm.tax_number.trim(),
            phone: invoiceForm.phone.trim(),
            email: invoiceForm.email.trim(),
            address: invoiceForm.address.trim(),
            receipt_footer : invoiceForm.receipt_footer.trim(),
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível guardar a faturação desta loja."
        );
      }

      setInvoiceModalOpen(false);
      setMessageType("success");
      setMessage(
        `Faturação de ${invoiceLocation.name} guardada com sucesso.`
      );
    } catch (error) {
      console.error(error);
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar a faturação desta loja."
      );
    } finally {
      setInvoiceSaving(false);
    }
  }

  function locationTypeLabel(type: string) {
    const labels: Record<string, string> = {
      warehouse: "Armazém",
      shop: "Loja",
      office: "Escritório",
      locker: "Cacifo",
      transit: "Trânsito",
      other: "Outro",
    };

    return labels[type] || type;
  }

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  function formatValue(value: unknown) {
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (Array.isArray(value)) {
      return value.join(", ");
    }

    if (value === null || value === undefined) {
      return "—";
    }

    return String(value);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-700">
        A carregar definições...
      </main>
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
          <NavItem label="Painel" icon="⌂" href="/dashboard" />
          <NavItem label="Produtos" icon="▦" href="/products" />
          <NavItem label="Inventário" icon="▣" href="/inventory" />
          <NavItem label="Compras" icon="↓" href="/purchases" />
          <NavItem label="Vendas" icon="↑" href="/sales" />
          <NavItem label="Fornecedores" icon="♢" href="/suppliers" />
          <NavItem label="Clientes" icon="♙" href="/customers" />
          <NavItem label="Relatórios" icon="▤" href="/reports" />
          <NavItem label="Utilizadores" icon="♧" href="/users" />
          <NavItem label="Definições" icon="⚙" active href="/settings" />
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
          <div className="flex h-20 items-center justify-between px-4 md:px-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                Definições
              </h1>
              <p className="text-sm text-slate-500">
                Configuração da organização e do sistema
              </p>
            </div>

            <MobileNav onLogout={handleLogout} />
          </div>
        </header>

        <main className="p-4 md:p-8">
          <div className="mx-auto max-w-6xl">

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

        {organization && (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Organização
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Nome
                </div>
                <div className="mt-1 font-medium text-slate-950">
                  {organization.name}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Code
                </div>
                <div className="mt-1 font-medium text-slate-950">
                  {organization.code}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Moeda Base
                </div>
                <div className="mt-1 font-medium text-slate-950">
                  {organization.base_currency}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Idioma Predefinido
                </div>
                <div className="mt-1 font-medium text-slate-950">
                  {organization.default_language.toUpperCase()}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Localizações
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Gerir armazéns, lojas, filiais e outros locais de stock.
              </p>
            </div>

            <button
              type="button"
              onClick={openNewLocation}
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              + Nova Localização
            </button>
          </div>

          {locations.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Localização
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Cidade / País
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {locations.map((location) => (
                    <tr key={location.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-950">
                        {location.location_code}
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-950">
                          {location.name}
                        </div>
                        {location.address && (
                          <div className="mt-1 text-xs text-slate-500">
                            {location.address}
                          </div>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                        {locationTypeLabel(location.location_type)}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {[location.city, location.country]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            location.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {location.is_active ? "Ativa" : "Inativa"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditLocation(location)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => void openInvoiceSettings(location)}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            Faturaçã
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void toggleLocationStatus(location)
                            }
                            disabled={locationBusyId === location.id}
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                              location.is_active
                                ? "border-red-200 text-red-700 hover:bg-red-50"
                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {locationBusyId === location.id
                              ? "A guardar..."
                              : location.is_active
                                ? "Desativar"
                                : "Ativar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <div className="text-sm font-medium text-slate-700">
                Nenhuma localização encontrada.
              </div>
              <div className="mt-1 text-sm text-slate-400">
                Crie o primeiro armazém, loja ou filial.
              </div>
            </div>
          )}
        </section>

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Logótipo da Empresa
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Logótipo utilizado em recibos e documentos da empresa.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-32 w-48 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4">
              {businessLogoUrl ? (
                <img
                  src={businessLogoUrl}
                  alt="Logótipo da empresa"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-sm text-slate-400">
                  Nenhum logótipo carregado
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap gap-3">
                <label
                  className={`inline-flex cursor-pointer items-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white ${
                    logoBusy ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  {logoBusy === "upload"
                    ? "A carregar..."
                    : businessLogoUrl
                      ? "Substituir Logótipo"
                      : "Carregar Logótipo"}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={logoBusy !== null}
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (file) {
                        void uploadBusinessLogo(file);
                      }

                      event.currentTarget.value = "";
                    }}
                  />
                </label>

                {businessLogoUrl && (
                  <button
                    type="button"
                    onClick={() => void deleteBusinessLogo()}
                    disabled={logoBusy !== null}
                    className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {logoBusy === "delete"
                      ? "A remover..."
                      : "Remover Logótipo"}
                  </button>
                )}
              </div>

              <p className="mt-3 text-xs text-slate-500">
                JPEG, PNG or WEBP. Maximum file size: 5 MB.
              </p>

              <p className="mt-1 text-xs text-slate-400">
                For best receipt quality, use a logo with a transparent or white background.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-950">
              Definições do Sistema
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Valores atuais de configuração desta organização
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {settings
              .filter(
                (setting) =>
                  ![
                    "business_logo_bucket",
                    "business_logo_object_key",
                  ].includes(setting.setting_key)
              )
              .map((setting) => (
              <div
                key={setting.setting_key}
                className="grid gap-3 px-6 py-5 md:grid-cols-[1.4fr_1fr_auto]"
              >
                <div>
                  <div className="font-medium text-slate-950">
                    {setting.setting_key
                      .split("_")
                      .map(
                        (part) =>
                          part.charAt(0).toUpperCase() +
                          part.slice(1)
                      )
                      .join(" ")}
                  </div>

                  {setting.description && (
                    <div className="mt-1 text-sm text-slate-500">
                      {setting.description}
                    </div>
                  )}
                </div>

                <div className="font-medium text-slate-700">
                  {setting.setting_key === "default_reorder_level" ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={reorderLevel}
                        onChange={(event) =>
                          setReorderLevel(event.target.value)
                        }
                        className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-500"
                      />

                      <button
                        type="button"
                        onClick={saveReorderLevel}
                        disabled={savingKey === "default_reorder_level"}
                        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {savingKey === "default_reorder_level"
                          ? "A guardar..."
                          : "Guardar"}
                      </button>
                    </div>
                  ) : setting.setting_key === "default_payment_method" ? (
                    <div className="flex items-center gap-3">
                      <select
                        value={defaultPaymentMethod}
                        onChange={(event) =>
                          setDefaultPaymentMethod(event.target.value)
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-500"
                      >
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="multicaixa">Multicaixa</option>
                        <option value="card">Card</option>
                        <option value="online">Online</option>
                        <option value="voucher">Voucher</option>
                        <option value="other">Other</option>
                      </select>

                      <button
                        type="button"
                        onClick={saveDefaultPaymentMethod}
                        disabled={savingKey === "default_payment_method"}
                        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {savingKey === "default_payment_method"
                          ? "A guardar..."
                          : "Guardar"}
                      </button>
                    </div>
                  ) : setting.setting_key === "business_name" ? (
                    <SettingTextEditor
                      value={businessName}
                      onChange={setBusinessName}
                      onSave={() =>
                        saveReceiptSetting(
                          "business_name",
                          businessName,
                          "Nome da empresa guardado com sucesso."
                        )
                      }
                      saving={savingKey === "business_name"}
                    />
                  ) : setting.setting_key === "business_subtitle" ? (
                    <SettingTextEditor
                      value={businessSubtitle}
                      onChange={setBusinessSubtitle}
                      onSave={() =>
                        saveReceiptSetting(
                          "business_subtitle",
                          businessSubtitle,
                          "Subtítulo da empresa guardado com sucesso."
                        )
                      }
                      saving={savingKey === "business_subtitle"}
                    />
                  ) : setting.setting_key === "business_tax_number" ? (
                    <SettingTextEditor
                      value={businessTaxNumber}
                      onChange={setBusinessTaxNumber}
                      onSave={() =>
                        saveReceiptSetting(
                          "business_tax_number",
                          businessTaxNumber,
                          "Número fiscal da empresa guardado com sucesso."
                        )
                      }
                      saving={savingKey === "business_tax_number"}
                    />
                  ) : setting.setting_key === "business_phone" ? (
                    <SettingTextEditor
                      value={businessPhone}
                      onChange={setBusinessPhone}
                      onSave={() =>
                        saveReceiptSetting(
                          "business_phone",
                          businessPhone,
                          "Telefone da empresa guardado com sucesso."
                        )
                      }
                      saving={savingKey === "business_phone"}
                    />
                  ) : setting.setting_key === "business_email" ? (
                    <SettingTextEditor
                      value={businessEmail}
                      onChange={setBusinessEmail}
                      onSave={() =>
                        saveReceiptSetting(
                          "business_email",
                          businessEmail,
                          "Email da empresa guardado com sucesso."
                        )
                      }
                      saving={savingKey === "business_email"}
                    />
                  ) : setting.setting_key === "business_address" ? (
                    <SettingTextEditor
                      value={businessAddress}
                      onChange={setBusinessAddress}
                      onSave={() =>
                        saveReceiptSetting(
                          "business_address",
                          businessAddress,
                          "Endereço da empresa guardado com sucesso."
                        )
                      }
                      saving={savingKey === "business_address"}
                      multiline
                    />
                  ) : setting.setting_key === "receipt_footer" ? (
                    <SettingTextEditor
                      value={receiptFooter}
                      onChange={setReceiptFooter}
                      onSave={() =>
                        saveReceiptSetting(
                          "receipt_footer",
                          receiptFooter,
                          "Rodapé do recibo guardado com sucesso."
                        )
                      }
                      saving={savingKey === "receipt_footer"}
                      multiline
                    />
                  ) : (
                    formatValue(setting.setting_value)
                  )}
                </div>

                <div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      setting.is_system
                        ? "bg-slate-100 text-slate-600"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {setting.is_system ? "Sistema" : "Editável"}
                  </span>
                </div>
              </div>
            ))}

            {!settings.length && (
              <div className="px-6 py-10 text-center text-sm text-slate-400">
                Nenhuma definição encontrada.
              </div>
            )}
          </div>
            </section>

            {invoiceModalOpen && invoiceLocation && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                  <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">
                        Faturação por Loja
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {invoiceLocation.name} · {invoiceLocation.location_code}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInvoiceModalOpen(false)}
                      className="text-2xl text-slate-400 hover:text-slate-700"
                    >
                      ×
                    </button>
                  </div>

                  {invoiceLoading ? (
                    <div className="p-10 text-center text-sm text-slate-500">
                      A carregar definições de faturação...
                    </div>
                  ) : (
                    <div className="space-y-6 p-6">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-3">
                            {invoiceLogoUrl ? (
                              <img
                                src={invoiceLogoUrl}
                                alt={`Logótipo de ${invoiceLocation.name}`}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-center text-xs text-slate-400">
                                Sem logótipo disponível
                              </span>
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="text-sm font-semibold text-slate-900">
                              Logótipo da loja
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              Se não carregar um logótipo específico, será usado o logótipo principal da empresa.
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <label
                                className={`cursor-pointer rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white ${
                                  invoiceLogoBusy
                                    ? "pointer-events-none opacity-50"
                                    : ""
                                }`}
                              >
                                {invoiceLogoBusy === "upload"
                                  ? "A carregar..."
                                  : "Carregar ou substituir"}
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  className="hidden"
                                  disabled={invoiceLogoBusy !== null}
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];

                                    if (file) {
                                      void uploadInvoiceLogo(file);
                                    }

                                    event.target.value = "";
                                  }}
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() => void deleteInvoiceLogo()}
                                disabled={invoiceLogoBusy !== null}
                                className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
                              >
                                {invoiceLogoBusy === "delete"
                                  ? "A remover..."
                                  : "Usar logótipo principal"}
                              </button>
                            </div>

                            <p className="mt-2 text-xs text-slate-500">
                              JPEG, PNG ou WEBP · máximo 5 MB
                            </p>

                            {invoiceLogoMessage && (
                              <p className="mt-2 text-xs font-medium text-slate-700">
                                {invoiceLogoMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                        <div className="text-sm font-semibold text-blue-950">
                          Próxima fatura
                        </div>
                        <div className="mt-1 text-xl font-bold text-blue-900">
                          {invoiceForm.invoice_prefix}
                          {String(invoiceForm.next_number).padStart(
                            invoiceForm.padding,
                            "0"
                          )}
                        </div>
                        <p className="mt-1 text-xs text-blue-700">
                          Cada loja mantém a sua própria sequência. O número não pode ser reiniciado aqui.
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <InvoiceField
                          label="Prefixo da fatura *"
                          value={invoiceForm.invoice_prefix}
                          onChange={(value) =>
                            setInvoiceForm((current) => ({
                              ...current,
                              invoice_prefix: value.toUpperCase(),
                            }))
                          }
                          placeholder="STORE01-SO-"
                        />
                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            Dígitos do número
                          </label>
                          <select
                            value={invoiceForm.padding}
                            onChange={(event) =>
                              setInvoiceForm((current) => ({
                                ...current,
                                padding: Number(event.target.value),
                              }))
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"
                          >
                            {[4, 5, 6, 7, 8].map((value) => (
                              <option key={value} value={value}>
                                {value} dígitos
                              </option>
                            ))}
                          </select>
                        </div>
                        <InvoiceField
                          label="Nome comercial"
                          value={invoiceForm.business_name}
                          onChange={(value) =>
                            setInvoiceForm((current) => ({
                              ...current,
                              business_name: value,
                            }))
                          }
                          placeholder="Nome apresentado na fatura"
                        />
                        <InvoiceField
                          label="Subtítulo"
                          value={invoiceForm.business_subtitle}
                          onChange={(value) =>
                            setInvoiceForm((current) => ({
                              ...current,
                              business_subtitle: value,
                            }))
                          }
                          placeholder="Inventário e Vendas"
                        />
                        <InvoiceField
                          label="NIF / Número fiscal"
                          value={invoiceForm.tax_number}
                          onChange={(value) =>
                            setInvoiceForm((current) => ({
                              ...current,
                              tax_number: value,
                            }))
                          }
                        />
                        <InvoiceField
                          label="Telefone"
                          value={invoiceForm.phone}
                          onChange={(value) =>
                            setInvoiceForm((current) => ({
                              ...current,
                              phone: value,
                            }))
                          }
                        />
                        <InvoiceField
                          label="Email"
                          value={invoiceForm.email}
                          type="email"
                          onChange={(value) =>
                            setInvoiceForm((current) => ({
                              ...current,
                              email: value,
                            }))
                          }
                        />
                        <div className="md:col-span-2">
                          <InvoiceField
                            label="Endereço da loja"
                            value={invoiceForm.address}
                            onChange={(value) =>
                              setInvoiceForm((current) => ({
                                ...current,
                                address: value,
                              }))
                            }
                            multiline
                          />
                        </div>
                        <div className="md:col-span-2">
                          <InvoiceField
                            label="Mensagem no rodapé"
                            value={invoiceForm.receipt_footer}
                            onChange={(value) =>
                              setInvoiceForm((current) => ({
                                ...current,
                                receipt_footer: value,
                              }))
                            }
                            multiline
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setInvoiceModalOpen(false)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveInvoiceSettings()}
                      disabled={invoiceLoading || invoiceSaving}
                      className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {invoiceSaving ? "A guardar..." : "Guardar Faturação"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {locationModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">
                        {editingLocation
                          ? "Editar Localização"
                          : "Nova Localização"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {editingLocation
                          ? "Atualize os dados desta localização."
                          : "Adicione um novo local para gerir e transferir stock."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLocationModalOpen(false)}
                      disabled={locationSaving}
                      className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      ×
                    </button>
                  </div>

                  <div className="grid gap-5 p-6 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">
                        Código *
                      </span>
                      <input
                        value={locationForm.location_code}
                        onChange={(event) =>
                          setLocationForm((current) => ({
                            ...current,
                            location_code: event.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="EX.: LOJA01"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none focus:border-slate-500"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">
                        Nome *
                      </span>
                      <input
                        value={locationForm.name}
                        onChange={(event) =>
                          setLocationForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Ex.: Loja Talatona"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none focus:border-slate-500"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">
                        Tipo
                      </span>
                      <select
                        value={locationForm.location_type}
                        onChange={(event) =>
                          setLocationForm((current) => ({
                            ...current,
                            location_type: event.target.value,
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none focus:border-slate-500"
                      >
                        <option value="warehouse">Armazém</option>
                        <option value="shop">Loja</option>
                        <option value="office">Escritório</option>
                        <option value="locker">Cacifo</option>
                        <option value="transit">Trânsito</option>
                        <option value="other">Outro</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">
                        Cidade
                      </span>
                      <input
                        value={locationForm.city}
                        onChange={(event) =>
                          setLocationForm((current) => ({
                            ...current,
                            city: event.target.value,
                          }))
                        }
                        placeholder="Ex.: Luanda"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none focus:border-slate-500"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">
                        País
                      </span>
                      <input
                        value={locationForm.country}
                        onChange={(event) =>
                          setLocationForm((current) => ({
                            ...current,
                            country: event.target.value,
                          }))
                        }
                        placeholder="Ex.: Angola"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none focus:border-slate-500"
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="text-sm font-medium text-slate-700">
                        Endereço
                      </span>
                      <input
                        value={locationForm.address}
                        onChange={(event) =>
                          setLocationForm((current) => ({
                            ...current,
                            address: event.target.value,
                          }))
                        }
                        placeholder="Endereço da localização"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none focus:border-slate-500"
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="text-sm font-medium text-slate-700">
                        Notas
                      </span>
                      <textarea
                        value={locationForm.notes}
                        onChange={(event) =>
                          setLocationForm((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Informação adicional sobre esta localização"
                        className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none focus:border-slate-500"
                      />
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
                    <button
                      type="button"
                      onClick={() => setLocationModalOpen(false)}
                      disabled={locationSaving}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={() => void saveLocation()}
                      disabled={locationSaving}
                      className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {locationSaving
                        ? "A guardar..."
                        : editingLocation
                          ? "Guardar Alterações"
                          : "Criar Localização"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({
  label,
  icon,
  active = false,
  href,
}: {
  label: string;
  icon: string;
  active?: boolean;
  href?: string;
}) {
  return (
    <div
      onClick={() => {
        if (href) window.location.href = href;
      }}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium ${
        active
          ? "bg-white text-slate-950"
          : href
          ? "cursor-pointer text-slate-400 transition hover:bg-white/10 hover:text-white"
          : "cursor-default text-slate-400"
      }`}
    >
      <span className="w-5 text-center text-base">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function InvoiceField({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 placeholder:text-slate-400"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 placeholder:text-slate-400"
        />
      )}
    </div>
  );
}

function SettingTextEditor({
  value,
  onChange,
  onSave,
  saving,
  multiline = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-500"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-500"
        />
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="shrink-0 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "A guardar..." : "Guardar"}
      </button>
    </div>
  );
}
