"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useParams } from "next/navigation";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

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

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

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
      } catch (error) {
        console.error(error);
        setMessage("Unable to load product.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [productId]);

  async function uploadPhoto() {
    if (!selectedFile) {
      setUploadMessage("Please choose a photo first.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
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
      setUploadMessage("");

      const token = await user.getIdToken();

      const formData = new FormData();
      formData.append("file", selectedFile);

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

      setUploadMessage("Photo uploaded successfully.");
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

  function formatStatus(value: string) {
    return value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function formatPrice(
    value: number | null,
    currency: string
  ) {
    if (value === null) return "—";

    return `${currency} ${Number(value).toLocaleString()}`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        Loading product...
      </main>
    );
  }

  if (message || !product) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-red-600">{message || "Product not found."}</p>
          <button
            onClick={() => {
              window.location.href = "/products";
            }}
            className="mt-5 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
          >
            Back to Products
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => {
            window.location.href = "/products";
          }}
          className="mb-5 rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back to Products
        </button>

        <div className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
          <div className="mb-8">
            <div className="text-sm font-semibold text-slate-500">
              {product.sku}
            </div>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              {product.name}
            </h1>

            <span className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
              {formatStatus(product.status)}
            </span>
          </div>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">
              Product Photo
            </h2>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={product.name}
                  className="mb-4 h-64 w-full rounded-xl object-contain bg-white"
                />
              ) : (
                <div className="mb-4 flex h-64 items-center justify-center rounded-xl bg-white text-slate-400">
                  No photo selected
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;

                    setSelectedFile(file);
                    setUploadMessage("");

                    if (file) {
                      setPreviewUrl(URL.createObjectURL(file));
                    } else {
                      setPreviewUrl("");
                    }
                  }}
                  className="block w-full text-sm text-slate-700"
                />

                <button
                  type="button"
                  onClick={uploadPhoto}
                  disabled={!selectedFile || uploading}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload Photo"}
                </button>
              </div>

              {uploadMessage && (
                <p className="mt-3 text-sm font-medium text-slate-700">
                  {uploadMessage}
                </p>
              )}

              <p className="mt-3 text-xs text-slate-500">
                JPEG, PNG or WEBP. Maximum size 10 MB.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">
              Stock
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
              />
              <StockCard
                label="Reorder Level"
                value={product.reorder_level}
              />
              <StockCard
                label="Status"
                value={formatStatus(product.stock_status)}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-slate-900">
              Product Information
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Category" value={product.category || "—"} />
              <Field label="Brand" value={product.brand || "—"} />
              <Field label="Barcode" value={product.barcode || "—"} />
              <Field
                label="Selling Price"
                value={formatPrice(
                  product.selling_price,
                  product.selling_currency
                )}
              />
              <Field
                label="Wholesale Price"
                value={formatPrice(
                  product.wholesale_price,
                  product.selling_currency
                )}
              />
              <Field
                label="Reorder Quantity"
                value={product.reorder_quantity}
              />
            </div>
          </section>

          <section className="mt-8">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">
              Description
            </h2>

            <div className="rounded-xl bg-slate-50 p-4 text-slate-700">
              {product.description || "—"}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">
              Notes
            </h2>

            <div className="rounded-xl bg-slate-50 p-4 text-slate-700">
              {product.notes || "—"}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <div className="text-sm font-medium text-slate-500">
        {label}
      </div>
      <div className="mt-1 font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function StockCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}
