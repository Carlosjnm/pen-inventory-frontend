"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useParams } from "next/navigation";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Category = {
  id: string;
  name: string;
};

type ProductImage = {
  id: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
  url: string;
};

type ProductEditForm = {
  name: string;
  barcode: string;
  category: string;
  description: string;
  brand: string;
  status: string;
  selling_price: string;
  wholesale_price: string;
  selling_currency: string;
  reorder_level: string;
  reorder_quantity: string;
  notes: string;
};

type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  status: string;
  selling_price: number | null;
  wholesale_price: number | null;
  selling_currency: string;
  reorder_level: number;
  reorder_quantity: number;
  notes: string | null;
  is_active: boolean;
  category: string | null;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  stock_status: string;
  primary_image_id: string | null;
  primary_image_bucket: string | null;
  primary_image_object_key: string | null;
  primary_image_url: string | null;
};

type Supplier = {
  id: string;
  supplier_code: string;
  name: string;
  default_currency: string | null;
};

type SupplierOffer = {
  id: string;
  supplier_id: string;
  supplier_code: string;
  supplier_name: string;
  supplier_sku: string | null;
  supplier_product_url: string | null;
  currency: string;
  unit_cost: number;
  minimum_order_quantity: number | null;
  lead_time_days: number | null;
  is_preferred: boolean;
  is_active: boolean;
  last_quoted_at: string | null;
};

const SUPPLIER_API_URL = API_URL;

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [storedImageUrl, setStoredImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [galleryBusy, setGalleryBusy] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [editForm, setEditForm] = useState<ProductEditForm | null>(null);
  const [supplierOffers, setSupplierOffers] = useState<SupplierOffer[]>([]);
  const [supplierOffersLoading, setSupplierOffersLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showSupplierOfferForm, setShowSupplierOfferForm] = useState(false);
  const [savingSupplierOffer, setSavingSupplierOffer] = useState(false);
  const [supplierOfferMessage, setSupplierOfferMessage] = useState("");
  const [supplierOfferForm, setSupplierOfferForm] = useState({
    supplier_id: "",
    supplier_sku: "",
    supplier_product_url: "",
    currency: "AOA",
    unit_cost: "",
    minimum_order_quantity: "",
    lead_time_days: "",
    is_preferred: false,
  });

  const [editingSupplierOfferId, setEditingSupplierOfferId] =
    useState<string | null>(null);

  const [editSupplierOfferForm, setEditSupplierOfferForm] = useState({
    supplier_sku: "",
    supplier_product_url: "",
    currency: "AOA",
    unit_cost: "",
    minimum_order_quantity: "",
    lead_time_days: "",
    is_preferred: false,
    is_active: true,
  });

  const [savingSupplierOfferEdit, setSavingSupplierOfferEdit] =
    useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      try {
        const token = await user.getIdToken();

        const response = await fetch(
          `${API_URL}/api/products/${productId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Unable to load product.");
        }

        const data = await response.json();
        setProduct(data.product);

        const categoriesResponse = await fetch(
          `${API_URL}/api/categories`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData.categories || []);
        }

        const suppliersResponse = await fetch(
          `${API_URL}/api/suppliers`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (suppliersResponse.ok) {
          const suppliersData = await suppliersResponse.json();
          setSuppliers(suppliersData.suppliers || []);
        }

        try {
          const supplierResponse = await fetch(
            `${SUPPLIER_API_URL}/api/products/${productId}/supplier-offers`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (supplierResponse.ok) {
            const supplierData = await supplierResponse.json();
            setSupplierOffers(supplierData.offers || []);
          } else {
            console.error(
              "Unable to load supplier offers:",
              supplierResponse.status
            );
          }
        } catch (supplierError) {
          console.error("Unable to load supplier offers:", supplierError);
        } finally {
          setSupplierOffersLoading(false);
        }

        if (data.product.primary_image_id) {
          const imageResponse = await fetch(
            `${API_URL}/api/products/${productId}/primary-image?v=${Date.now()}`,
            {
              cache: "no-store",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (imageResponse.ok) {
            const imageBlob = await imageResponse.blob();
            const imageObjectUrl = URL.createObjectURL(imageBlob);
            setStoredImageUrl(imageObjectUrl);
          }
        }

        const galleryResponse = await fetch(
          `${API_URL}/api/products/${productId}/images`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (galleryResponse.ok) {
          const galleryData = await galleryResponse.json();

          const galleryWithUrls = await Promise.all(
            galleryData.images.map(async (image: Omit<ProductImage, "url">) => {
              const contentResponse = await fetch(
                `${API_URL}/api/products/${productId}/images/${image.id}/content`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              let url = "";

              if (contentResponse.ok) {
                const blob = await contentResponse.blob();
                url = URL.createObjectURL(blob);
              }

              return {
                ...image,
                url,
              };
            })
          );

          setProductImages(galleryWithUrls);
        }
      } catch (error) {
        console.error(error);
        setMessage("Unable to load product.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [productId]);

  async function saveSupplierOffer() {
    if (!supplierOfferForm.supplier_id) {
      setSupplierOfferMessage("Select a supplier.");
      return;
    }

    if (!supplierOfferForm.unit_cost) {
      setSupplierOfferMessage("Unit cost is required.");
      return;
    }

    try {
      setSavingSupplierOffer(true);
      setSupplierOfferMessage("");

      const user = auth.currentUser;
      if (!user) {
        throw new Error("You are not signed in.");
      }

      const token = await user.getIdToken();

      const response = await fetch(
        `${SUPPLIER_API_URL}/api/products/${productId}/supplier-offers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplier_id: supplierOfferForm.supplier_id,
            supplier_sku: supplierOfferForm.supplier_sku || null,
            supplier_product_url:
              supplierOfferForm.supplier_product_url || null,
            currency: supplierOfferForm.currency,
            unit_cost: Number(supplierOfferForm.unit_cost),
            minimum_order_quantity:
              supplierOfferForm.minimum_order_quantity === ""
                ? null
                : Number(supplierOfferForm.minimum_order_quantity),
            lead_time_days:
              supplierOfferForm.lead_time_days === ""
                ? null
                : Number(supplierOfferForm.lead_time_days),
            is_preferred: supplierOfferForm.is_preferred,
            is_active: true,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to create supplier offer.");
      }

      setSupplierOffers((current) => [
        ...current,
        data.offer,
      ]);

      setSupplierOfferForm({
        supplier_id: "",
        supplier_sku: "",
        supplier_product_url: "",
        currency: "AOA",
        unit_cost: "",
        minimum_order_quantity: "",
        lead_time_days: "",
        is_preferred: false,
      });

      setSupplierOfferMessage("Supplier offer added successfully.");
      setShowSupplierOfferForm(false);
    } catch (error) {
      setSupplierOfferMessage(
        error instanceof Error
          ? error.message
          : "Unable to create supplier offer."
      );
    } finally {
      setSavingSupplierOffer(false);
    }
  }

  function startEditingSupplierOffer(offer: SupplierOffer) {
    setEditingSupplierOfferId(offer.id);

    setEditSupplierOfferForm({
      supplier_sku: offer.supplier_sku || "",
      supplier_product_url: offer.supplier_product_url || "",
      currency: offer.currency,
      unit_cost: String(offer.unit_cost),
      minimum_order_quantity:
        offer.minimum_order_quantity === null
          ? ""
          : String(offer.minimum_order_quantity),
      lead_time_days:
        offer.lead_time_days === null
          ? ""
          : String(offer.lead_time_days),
      is_preferred: offer.is_preferred,
      is_active: offer.is_active,
    });

    setSupplierOfferMessage("");
  }

  async function saveSupplierOfferEdit(offerId: string) {
    if (!editSupplierOfferForm.unit_cost) {
      setSupplierOfferMessage("Unit cost is required.");
      return;
    }

    try {
      setSavingSupplierOfferEdit(true);
      setSupplierOfferMessage("");

      const user = auth.currentUser;
      if (!user) {
        throw new Error("You are not signed in.");
      }

      const token = await user.getIdToken();

      const response = await fetch(
        `${SUPPLIER_API_URL}/api/products/${productId}/supplier-offers/${offerId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplier_sku: editSupplierOfferForm.supplier_sku || null,
            supplier_product_url:
              editSupplierOfferForm.supplier_product_url || null,
            currency: editSupplierOfferForm.currency,
            unit_cost: Number(editSupplierOfferForm.unit_cost),
            minimum_order_quantity:
              editSupplierOfferForm.minimum_order_quantity === ""
                ? null
                : Number(editSupplierOfferForm.minimum_order_quantity),
            lead_time_days:
              editSupplierOfferForm.lead_time_days === ""
                ? null
                : Number(editSupplierOfferForm.lead_time_days),
            is_preferred: editSupplierOfferForm.is_preferred,
            is_active: editSupplierOfferForm.is_active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to update supplier offer.");
      }

      setSupplierOffers((current) =>
        current.map((offer) =>
          offer.id === offerId ? data.offer : offer
        )
      );

      setEditingSupplierOfferId(null);
      setSupplierOfferMessage("Supplier offer updated successfully.");
    } catch (error) {
      setSupplierOfferMessage(
        error instanceof Error
          ? error.message
          : "Unable to update supplier offer."
      );
    } finally {
      setSavingSupplierOfferEdit(false);
    }
  }

  async function uploadPhoto(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setUploadMessage("Photo must be 10 MB or smaller.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      window.location.href = "/";
      return;
    }

    try {
      setUploading(true);
      setUploadMessage("Uploading photo...");

      const token = await user.getIdToken();

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/api/products/${productId}/images`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Unable to upload photo."
        );
      }

      setUploadMessage("✓ Photo saved");

      // Stop using the temporary local preview after the server
      // has successfully saved and selected the new primary photo.
      setPreviewUrl("");

      // Reload so main photo, PRIMARY badge and database
      // always show exactly the same image.
      window.location.reload();
    } catch (error) {
      console.error(error);

      setUploadMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload photo."
      );
    } finally {
      setUploading(false);
    }
  }

  async function makePrimaryImage(imageId: string) {
    const user = auth.currentUser;

    if (!user) {
      window.location.href = "/";
      return;
    }

    try {
      setGalleryBusy(imageId);
      setUploadMessage("Changing primary photo...");

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/products/${productId}/images/${imageId}/primary`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || "Unable to change primary photo."
        );
      }

      window.location.reload();
    } catch (error) {
      console.error(error);
      setUploadMessage(
        error instanceof Error
          ? error.message
          : "Unable to change primary photo."
      );
      setGalleryBusy("");
    }
  }

  async function deleteProductImage(imageId: string) {
    const image = productImages.find(
      (item) => item.id === imageId
    );

    if (!image) return;

    if (image.is_primary) {
      setUploadMessage(
        "Choose another primary photo before deleting this photo."
      );
      return;
    }

    const confirmed = window.confirm(
      "Delete this photo from this product? This cannot be undone."
    );

    if (!confirmed) return;

    const user = auth.currentUser;

    if (!user) {
      window.location.href = "/";
      return;
    }

    try {
      setGalleryBusy(imageId);
      setUploadMessage("Deleting photo...");

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/products/${productId}/images/${imageId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || "Unable to delete photo."
        );
      }

      window.location.reload();
    } catch (error) {
      console.error(error);
      setUploadMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete photo."
      );
      setGalleryBusy("");
    }
  }

  function beginEditProduct() {
    if (!product) return;

    setEditForm({
      name: product.name || "",
      barcode: product.barcode || "",
      category: product.category || "",
      description: product.description || "",
      brand: product.brand || "",
      status: product.status || "researching",
      selling_price:
        product.selling_price === null
          ? ""
          : String(product.selling_price),
      wholesale_price:
        product.wholesale_price === null
          ? ""
          : String(product.wholesale_price),
      selling_currency: product.selling_currency || "AOA",
      reorder_level: String(product.reorder_level ?? 0),
      reorder_quantity: String(product.reorder_quantity ?? 0),
      notes: product.notes || "",
    });

    setEditMessage("");
    setEditing(true);
  }

  function cancelEditProduct() {
    setEditing(false);
    setEditForm(null);
    setEditMessage("");
  }

  async function saveProduct() {
    if (!product || !editForm) return;

    const user = auth.currentUser;

    if (!user) {
      window.location.href = "/";
      return;
    }

    if (!editForm.name.trim()) {
      setEditMessage("Product name is required.");
      return;
    }

    try {
      setSavingProduct(true);
      setEditMessage("Saving product...");

      const token = await user.getIdToken();

      const payload = {
        name: editForm.name.trim(),
        barcode: editForm.barcode.trim() || null,
        category: editForm.category.trim(),
        description: editForm.description.trim() || null,
        brand: editForm.brand.trim() || null,
        status: editForm.status,
        selling_price:
          editForm.selling_price.trim() === ""
            ? null
            : Number(editForm.selling_price),
        wholesale_price:
          editForm.wholesale_price.trim() === ""
            ? null
            : Number(editForm.wholesale_price),
        selling_currency: editForm.selling_currency,
        reorder_level:
          editForm.reorder_level.trim() === ""
            ? 0
            : Number(editForm.reorder_level),
        reorder_quantity:
          editForm.reorder_quantity.trim() === ""
            ? 0
            : Number(editForm.reorder_quantity),
        notes: editForm.notes.trim() || null,
      };

      const response = await fetch(
        `${API_URL}/api/products/${productId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Unable to save product."
        );
      }

      setEditMessage("✓ Product saved successfully.");

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error(error);

      setEditMessage(
        error instanceof Error
          ? error.message
          : "Unable to save product."
      );
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  function formatStatus(value: string) {
    return value
      .split("_")
      .map(
        (part) =>
          part.charAt(0).toUpperCase() + part.slice(1)
      )
      .join(" ");
  }

  function formatPrice(
    value: number | null,
    currency: string
  ) {
    if (value === null) return "—";

    return `${currency} ${Number(value).toLocaleString()}`;
  }

  function productStatusClass(value: string) {
    if (value === "selling" || value === "in_stock") {
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    }

    if (value === "researching" || value === "testing") {
      return "bg-blue-50 text-blue-700 ring-blue-600/20";
    }

    if (value === "ordered" || value === "sample_ordered") {
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    }

    if (value === "discontinued" || value === "archived") {
      return "bg-slate-100 text-slate-600 ring-slate-500/20";
    }

    return "bg-violet-50 text-violet-700 ring-violet-600/20";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 lg:pl-64">
        <div className="p-8 text-slate-600">
          Loading product...
        </div>
      </div>
    );
  }

  if (message || !product) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-red-600">
            {message || "Product not found."}
          </p>

          <button
            onClick={() => {
              window.location.href = "/products";
            }}
            className="mt-5 rounded-xl bg-slate-950 px-4 py-2 font-semibold text-white"
          >
            Back to Products
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-slate-950 text-white lg:block">
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <div>
            <div className="text-xl font-bold tracking-tight">
              PEN
            </div>
            <div className="text-xs text-slate-400">
              Inventory
            </div>
          </div>
        </div>

        <nav className="space-y-1 px-3 py-5 text-sm">
          <NavItem label="Dashboard" icon="⌂" href="/dashboard" />
          <NavItem
            label="Products"
            icon="▦"
            active
            onClick={() => {
              window.location.href = "/products";
            }}
          />
          <NavItem label="Inventory" icon="▣" href="/inventory" />
          <NavItem label="Purchases" icon="↓" href="/purchases" />
          <NavItem label="Sales" icon="↑" href="/sales" />
          <NavItem label="Suppliers" icon="♢" href="/suppliers" />
          <NavItem label="Customers" icon="♙" href="/customers" />
          <NavItem label="Reports" icon="▤" href="/reports" />
          <NavItem label="Users" icon="♧" href="/users" />
          <NavItem label="Settings" icon="⚙" href="/settings" />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-4 md:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <button
                onClick={() => {
                  window.location.href = "/products";
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                ←
              </button>

              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {product.sku}
                </div>

                <h1 className="truncate text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                  {product.name}
                </h1>
              </div>
            </div>

            <span
              className={`hidden rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset sm:inline-flex ${productStatusClass(
                product.status
              )}`}
            >
              {formatStatus(product.status)}
            </span>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  window.location.href = "/products";
                }}
                className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
              >
                Products
              </button>

              <span className="text-slate-300">/</span>

              <span className="text-sm font-semibold text-slate-800">
                {product.sku}
              </span>

              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={beginEditProduct}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Edit Product
                </button>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset sm:hidden ${productStatusClass(
                    product.status
                  )}`}
                >
                  {formatStatus(product.status)}
                </span>
              </div>
            </div>

            {editing && editForm && (
              <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Edit Product
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      SKU {product.sku} is protected and cannot be changed.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={cancelEditProduct}
                    disabled={savingProduct}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
                  <EditField
                    label="Product Name"
                    value={editForm.name}
                    onChange={(value) =>
                      setEditForm({ ...editForm, name: value })
                    }
                  />

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Category
                    </span>

                    <select
                      value={editForm.category}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          category: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    >
                      <option value="" disabled>
                        Select category
                      </option>

                      {categories.map((category) => (
                        <option
                          key={category.id}
                          value={category.name}
                        >
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <EditField
                    label="Brand"
                    value={editForm.brand}
                    onChange={(value) =>
                      setEditForm({ ...editForm, brand: value })
                    }
                  />

                  <EditField
                    label="Barcode"
                    value={editForm.barcode}
                    onChange={(value) =>
                      setEditForm({ ...editForm, barcode: value })
                    }
                  />

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </span>

                    <select
                      value={editForm.status}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          status: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    >
                      <option value="idea">Idea</option>
                      <option value="researching">Researching</option>
                      <option value="sample_ordered">Sample Ordered</option>
                      <option value="testing">Testing</option>
                      <option value="approved">Approved</option>
                      <option value="ordered">Ordered</option>
                      <option value="in_stock">In Stock</option>
                      <option value="selling">Selling</option>
                      <option value="discontinued">Discontinued</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Currency
                    </span>

                    <select
                      value={editForm.selling_currency}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          selling_currency: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    >
                      <option value="AOA">AOA / Kz</option>
                      <option value="USD">USD</option>
                      <option value="ZAR">ZAR</option>
                      <option value="CNY">CNY</option>
                    </select>
                  </label>

                  <EditField
                    label="Selling Price"
                    value={editForm.selling_price}
                    type="number"
                    onChange={(value) =>
                      setEditForm({
                        ...editForm,
                        selling_price: value,
                      })
                    }
                  />

                  <EditField
                    label="Wholesale Price"
                    value={editForm.wholesale_price}
                    type="number"
                    onChange={(value) =>
                      setEditForm({
                        ...editForm,
                        wholesale_price: value,
                      })
                    }
                  />

                  <EditField
                    label="Reorder Level"
                    value={editForm.reorder_level}
                    type="number"
                    onChange={(value) =>
                      setEditForm({
                        ...editForm,
                        reorder_level: value,
                      })
                    }
                  />

                  <EditField
                    label="Reorder Quantity"
                    value={editForm.reorder_quantity}
                    type="number"
                    onChange={(value) =>
                      setEditForm({
                        ...editForm,
                        reorder_quantity: value,
                      })
                    }
                  />

                  <label className="block md:col-span-2 xl:col-span-3">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Description
                    </span>

                    <textarea
                      rows={4}
                      value={editForm.description}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          description: event.target.value,
                        })
                      }
                      className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </label>

                  <label className="block md:col-span-2 xl:col-span-3">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Notes
                    </span>

                    <textarea
                      rows={4}
                      value={editForm.notes}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          notes: event.target.value,
                        })
                      }
                      className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-5 py-4">
                  <div>
                    {editMessage && (
                      <p
                        className={`text-sm font-medium ${
                          editMessage.startsWith("✓")
                            ? "text-emerald-700"
                            : "text-slate-600"
                        }`}
                      >
                        {editMessage}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={saveProduct}
                    disabled={savingProduct}
                    className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-wait disabled:bg-slate-500"
                  >
                    {savingProduct ? "Saving..." : "Save Product"}
                  </button>
                </div>
              </section>
            )}

            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StockCard
                label="On Hand"
                value={product.quantity_on_hand}
              />

              <StockCard
                label="Reserved"
                value={product.quantity_reserved}
              />

              <StockCard
                label="Available"
                value={product.quantity_available}
                emphasis
              />

              <StockCard
                label="Reorder Level"
                value={product.reorder_level}
              />

              <StockCard
                label="Stock Status"
                value={formatStatus(product.stock_status)}
              />
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Product Photo
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-400">
                      JPEG, PNG or WEBP · Max 10 MB
                    </p>
                  </div>

                  {product.primary_image_id && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Primary photo
                    </span>
                  )}
                </div>

                <div className="relative flex min-h-[420px] items-center justify-center bg-slate-50 p-6">
                  {previewUrl || storedImageUrl ? (
                    <img
                      src={previewUrl || storedImageUrl}
                      alt={product.name}
                      className="max-h-[390px] w-full rounded-xl object-contain"
                    />
                  ) : (
                    <div className="px-6 py-16 text-center">
                      <div className="mb-4 text-6xl">
                        📷
                      </div>

                      <p className="font-semibold text-slate-700">
                        No product photo yet
                      </p>

                      <p className="mt-2 text-sm text-slate-500">
                        Add a photo to make this product easier
                        to identify.
                      </p>
                    </div>
                  )}

                  <label
                    className={`absolute bottom-5 right-5 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition ${
                      uploading
                        ? "cursor-wait bg-slate-500"
                        : "cursor-pointer bg-slate-950 hover:bg-slate-800"
                    }`}
                  >
                    {uploading
                      ? "Uploading..."
                      : "📷 Add Photo"}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploading}
                      onChange={async (event) => {
                        const file =
                          event.target.files?.[0];

                        if (!file) return;

                        setPreviewUrl(
                          URL.createObjectURL(file)
                        );

                        setUploadMessage("");

                        await uploadPhoto(file);

                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>

                <div className="border-t border-slate-100 p-5">
                  {productImages.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            Product Photos
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Select any previous photo to make it primary again.
                          </p>
                        </div>

                        <span className="text-xs font-medium text-slate-400">
                          {productImages.length}{" "}
                          {productImages.length === 1 ? "photo" : "photos"}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                        {productImages.map((image) => (
                          <div
                            key={image.id}
                            className={`overflow-hidden rounded-xl border bg-white ${
                              image.is_primary
                                ? "border-slate-950 ring-2 ring-slate-950/10"
                                : "border-slate-200"
                            }`}
                          >
                            <div className="relative aspect-square bg-slate-50">
                              {image.url ? (
                                <img
                                  src={image.url}
                                  alt={
                                    image.alt_text ||
                                    product.name
                                  }
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-2xl text-slate-300">
                                  📷
                                </div>
                              )}

                              {image.is_primary && (
                                <span className="absolute left-2 top-2 rounded-full bg-slate-950 px-2 py-1 text-[10px] font-bold text-white shadow">
                                  PRIMARY
                                </span>
                              )}
                            </div>

                            <div className="space-y-2 p-2">
                              {!image.is_primary && (
                                <button
                                  type="button"
                                  disabled={galleryBusy === image.id}
                                  onClick={() =>
                                    makePrimaryImage(image.id)
                                  }
                                  className="w-full rounded-lg bg-slate-950 px-2 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-50"
                                >
                                  {galleryBusy === image.id
                                    ? "Please wait..."
                                    : "Make Primary"}
                                </button>
                              )}

                              {!image.is_primary && (
                                <button
                                  type="button"
                                  disabled={galleryBusy === image.id}
                                  onClick={() =>
                                    deleteProductImage(image.id)
                                  }
                                  className="w-full rounded-lg border border-red-200 px-2 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              )}

                              {image.is_primary && (
                                <div className="rounded-lg bg-emerald-50 px-2 py-2 text-center text-xs font-semibold text-emerald-700">
                                  Current Primary
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={
                      productImages.length > 0
                        ? "mt-4 border-t border-slate-100 pt-4"
                        : ""
                    }
                  >
                    {uploadMessage ? (
                      <p
                        className={`text-sm font-medium ${
                          uploadMessage.startsWith("✓")
                            ? "text-emerald-700"
                            : "text-slate-600"
                        }`}
                      >
                        {uploadMessage}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Add as many photos as needed. Any previous photo
                        can be made primary again.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <h2 className="font-semibold text-slate-900">
                      Product Information
                    </h2>
                  </div>

                  <div className="grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2">
                    <Field
                      label="SKU"
                      value={product.sku}
                      mono
                    />

                    <Field
                      label="Category"
                      value={product.category || "—"}
                    />

                    <Field
                      label="Brand"
                      value={product.brand || "—"}
                    />

                    <Field
                      label="Barcode"
                      value={product.barcode || "—"}
                      mono
                    />

                    <Field
                      label="Status"
                      value={formatStatus(product.status)}
                    />

                    <Field
                      label="Active"
                      value={
                        product.is_active ? "Yes" : "No"
                      }
                    />

                    <Field
                      label="Reorder Quantity"
                      value={product.reorder_quantity}
                    />

                    <Field
                      label="Reorder Level"
                      value={product.reorder_level}
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <h2 className="font-semibold text-slate-900">
                      Pricing
                    </h2>
                  </div>

                  <div className="grid gap-4 p-5 sm:grid-cols-2">
                    <PriceCard
                      label="Selling Price"
                      value={formatPrice(
                        product.selling_price,
                        product.selling_currency
                      )}
                    />

                    <PriceCard
                      label="Wholesale Price"
                      value={formatPrice(
                        product.wholesale_price,
                        product.selling_currency
                      )}
                    />
                  </div>
                </section>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="font-semibold text-slate-900">
                    Description
                  </h2>
                </div>

                <div className="p-5">
                  <p className="whitespace-pre-wrap leading-7 text-slate-700">
                    {product.description ||
                      "No description has been added yet."}
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="font-semibold text-slate-900">
                    Notes
                  </h2>
                </div>

                <div className="p-5">
                  <p className="whitespace-pre-wrap leading-7 text-slate-700">
                    {product.notes ||
                      "No notes have been added yet."}
                  </p>
                </div>
              </section>
            </div>

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Supplier Offers
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Compare supplier cost, MOQ and lead time for this product.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {supplierOffers.length}{" "}
                    {supplierOffers.length === 1 ? "offer" : "offers"}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setShowSupplierOfferForm((value) => !value)
                    }
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    {showSupplierOfferForm ? "Close" : "+ Add Supplier Offer"}
                  </button>
                </div>
              </div>

              {showSupplierOfferForm && (
                <div className="border-b border-slate-100 bg-slate-50 p-5">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <label className="text-sm font-medium text-slate-700">
                      Supplier
                      <select
                        value={supplierOfferForm.supplier_id}
                        onChange={(e) => {
                          const selected = suppliers.find(
                            (supplier) => supplier.id === e.target.value
                          );

                          setSupplierOfferForm((current) => ({
                            ...current,
                            supplier_id: e.target.value,
                            currency:
                              selected?.default_currency ||
                              current.currency,
                          }));
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                      >
                        <option value="">Select supplier</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.supplier_code} · {supplier.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Supplier SKU
                      <input
                        value={supplierOfferForm.supplier_sku}
                        onChange={(e) =>
                          setSupplierOfferForm((current) => ({
                            ...current,
                            supplier_sku: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Currency
                      <select
                        value={supplierOfferForm.currency}
                        onChange={(e) =>
                          setSupplierOfferForm((current) => ({
                            ...current,
                            currency: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                      >
                        <option value="AOA">AOA</option>
                        <option value="USD">USD</option>
                        <option value="ZAR">ZAR</option>
                        <option value="CNY">CNY</option>
                      </select>
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Unit Cost
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={supplierOfferForm.unit_cost}
                        onChange={(e) =>
                          setSupplierOfferForm((current) => ({
                            ...current,
                            unit_cost: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      MOQ
                      <input
                        type="number"
                        min="0"
                        value={supplierOfferForm.minimum_order_quantity}
                        onChange={(e) =>
                          setSupplierOfferForm((current) => ({
                            ...current,
                            minimum_order_quantity: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Lead Time (days)
                      <input
                        type="number"
                        min="0"
                        value={supplierOfferForm.lead_time_days}
                        onChange={(e) =>
                          setSupplierOfferForm((current) => ({
                            ...current,
                            lead_time_days: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm font-medium text-slate-700 md:col-span-2">
                      Supplier Product URL
                      <input
                        type="url"
                        value={supplierOfferForm.supplier_product_url}
                        onChange={(e) =>
                          setSupplierOfferForm((current) => ({
                            ...current,
                            supplier_product_url: e.target.value,
                          }))
                        }
                        placeholder="https://..."
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={supplierOfferForm.is_preferred}
                        onChange={(e) =>
                          setSupplierOfferForm((current) => ({
                            ...current,
                            is_preferred: e.target.checked,
                          }))
                        }
                      />
                      Preferred supplier
                    </label>

                    <button
                      type="button"
                      onClick={saveSupplierOffer}
                      disabled={savingSupplierOffer}
                      className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingSupplierOffer
                        ? "Saving..."
                        : "Save Supplier Offer"}
                    </button>
                  </div>

                  {supplierOfferMessage && (
                    <p className="mt-3 text-sm text-slate-600">
                      {supplierOfferMessage}
                    </p>
                  )}
                </div>
              )}

              {supplierOffersLoading ? (
                <div className="p-6 text-sm text-slate-500">
                  Loading supplier offers...
                </div>
              ) : supplierOffers.length === 0 ? (
                <div className="p-6">
                  <p className="text-sm font-medium text-slate-700">
                    No supplier offers yet.
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Supplier quotations for this product will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3">Supplier</th>
                        <th className="px-5 py-3">Supplier SKU</th>
                        <th className="px-5 py-3">Cost</th>
                        <th className="px-5 py-3">MOQ</th>
                        <th className="px-5 py-3">Lead Time</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {supplierOffers.map((offer) => (
                        <>
                          <tr
                            key={offer.id}
                            className="hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-4">
                              <div className="font-medium text-slate-900">
                                {offer.supplier_name}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {offer.supplier_code}
                              </div>
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-700">
                              {offer.supplier_sku || "—"}
                            </td>

                            <td className="px-5 py-4">
                              <div className="font-semibold text-slate-900">
                                {offer.currency}{" "}
                                {Number(offer.unit_cost).toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )}
                              </div>
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-700">
                              {offer.minimum_order_quantity ?? "—"}
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-700">
                              {offer.lead_time_days !== null
                                ? `${offer.lead_time_days} days`
                                : "—"}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-2">
                                {offer.is_preferred && (
                                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                    Preferred
                                  </span>
                                )}

                                {!offer.is_active && (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                                    Inactive
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <div className="flex justify-end gap-3">
                                {offer.supplier_product_url && (
                                  <a
                                    href={offer.supplier_product_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                                  >
                                    View ↗
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    startEditingSupplierOffer(offer)
                                  }
                                  className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>

                          {editingSupplierOfferId === offer.id && (
                            <tr key={`${offer.id}-edit`}>
                              <td
                                colSpan={7}
                                className="bg-slate-50 px-5 py-5"
                              >
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                  <label className="text-sm font-medium text-slate-700">
                                    Supplier SKU
                                    <input
                                      value={editSupplierOfferForm.supplier_sku}
                                      onChange={(e) =>
                                        setEditSupplierOfferForm((current) => ({
                                          ...current,
                                          supplier_sku: e.target.value,
                                        }))
                                      }
                                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                                    />
                                  </label>

                                  <label className="text-sm font-medium text-slate-700">
                                    Currency
                                    <select
                                      value={editSupplierOfferForm.currency}
                                      onChange={(e) =>
                                        setEditSupplierOfferForm((current) => ({
                                          ...current,
                                          currency: e.target.value,
                                        }))
                                      }
                                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                                    >
                                      <option value="AOA">AOA</option>
                                      <option value="USD">USD</option>
                                      <option value="ZAR">ZAR</option>
                                      <option value="CNY">CNY</option>
                                    </select>
                                  </label>

                                  <label className="text-sm font-medium text-slate-700">
                                    Unit Cost
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={editSupplierOfferForm.unit_cost}
                                      onChange={(e) =>
                                        setEditSupplierOfferForm((current) => ({
                                          ...current,
                                          unit_cost: e.target.value,
                                        }))
                                      }
                                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                                    />
                                  </label>

                                  <label className="text-sm font-medium text-slate-700">
                                    MOQ
                                    <input
                                      type="number"
                                      min="0"
                                      value={
                                        editSupplierOfferForm.minimum_order_quantity
                                      }
                                      onChange={(e) =>
                                        setEditSupplierOfferForm((current) => ({
                                          ...current,
                                          minimum_order_quantity:
                                            e.target.value,
                                        }))
                                      }
                                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                                    />
                                  </label>

                                  <label className="text-sm font-medium text-slate-700">
                                    Lead Time (days)
                                    <input
                                      type="number"
                                      min="0"
                                      value={editSupplierOfferForm.lead_time_days}
                                      onChange={(e) =>
                                        setEditSupplierOfferForm((current) => ({
                                          ...current,
                                          lead_time_days: e.target.value,
                                        }))
                                      }
                                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                                    />
                                  </label>

                                  <label className="text-sm font-medium text-slate-700 md:col-span-2">
                                    Supplier Product URL
                                    <input
                                      type="url"
                                      value={
                                        editSupplierOfferForm.supplier_product_url
                                      }
                                      onChange={(e) =>
                                        setEditSupplierOfferForm((current) => ({
                                          ...current,
                                          supplier_product_url:
                                            e.target.value,
                                        }))
                                      }
                                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                                    />
                                  </label>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                                  <div className="flex flex-wrap gap-5">
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                      <input
                                        type="checkbox"
                                        checked={
                                          editSupplierOfferForm.is_preferred
                                        }
                                        onChange={(e) =>
                                          setEditSupplierOfferForm((current) => ({
                                            ...current,
                                            is_preferred: e.target.checked,
                                          }))
                                        }
                                      />
                                      Preferred supplier
                                    </label>

                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                      <input
                                        type="checkbox"
                                        checked={editSupplierOfferForm.is_active}
                                        onChange={(e) =>
                                          setEditSupplierOfferForm((current) => ({
                                            ...current,
                                            is_active: e.target.checked,
                                          }))
                                        }
                                      />
                                      Active
                                    </label>
                                  </div>

                                  <div className="flex gap-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingSupplierOfferId(null)
                                      }
                                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                    >
                                      Cancel
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        saveSupplierOfferEdit(offer.id)
                                      }
                                      disabled={savingSupplierOfferEdit}
                                      className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                      {savingSupplierOfferEdit
                                        ? "Saving..."
                                        : "Save Changes"}
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/50 p-6">
              <h2 className="font-semibold text-slate-800">
                More product information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Purchase history, stock movements and activity will appear
                here as we activate the next PEN Inventory modules.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <input
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "any" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
      />
    </label>
  );
}

function NavItem({
  label,
  icon,
  active = false,
  onClick,
  href,
}: {
  label: string;
  icon: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const className = `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium ${
    active
      ? "bg-white text-slate-950"
      : "text-slate-400 transition hover:bg-white/10 hover:text-white"
  }`;

  const content = (
    <>
      <span className="w-5 text-center text-base">{icon}</span>
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div
        className={`mt-1.5 font-semibold text-slate-900 ${
          mono ? "font-mono text-sm" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function StockCard({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string | number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        emphasis
          ? "border-slate-900 bg-slate-950 text-white"
          : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`text-sm font-medium ${
          emphasis ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {label}
      </div>

      <div
        className={`mt-2 text-2xl font-bold tracking-tight ${
          emphasis ? "text-white" : "text-slate-950"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function PriceCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-2 text-xl font-bold text-slate-950">
        {value}
      </div>
    </div>
  );
}
