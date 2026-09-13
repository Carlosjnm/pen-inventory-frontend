"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Customer = {
  id: string;
  customer_number: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
};

type Location = {
  id: string;
  location_code: string;
  name: string;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  selling_price: number | null;
  selling_currency: string;
  status: string;
};

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
};

type DraftItem = {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
};

const CHANNELS = [
  { value: "walk_in", label: "Walk-in" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "website", label: "Website" },
  { value: "marketplace", label: "Marketplace" },
  { value: "other", label: "Other" },
];

export default function NewSalePage() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);

  const [locationId, setLocationId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [salesChannel, setSalesChannel] = useState("walk_in");
  const [customerReference, setCustomerReference] = useState("");
  const [shippingAmount, setShippingAmount] = useState("0");
  const [notes, setNotes] = useState("");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [taxAmount, setTaxAmount] = useState("0");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      setFirebaseUser(user);
      await loadPageData(user);
    });

    return () => unsubscribe();
  }, []);

  async function loadPageData(user: User) {
    try {
      setLoading(true);
      setMessage("");

      const token = await user.getIdToken();

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [
        locationResponse,
        customerResponse,
        productResponse,
        balanceResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/api/locations`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/customers`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/products`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/inventory/balances`, {
          headers,
          cache: "no-store",
        }),
      ]);

      if (
        !locationResponse.ok ||
        !customerResponse.ok ||
        !productResponse.ok ||
        !balanceResponse.ok
      ) {
        throw new Error("Unable to load sale setup data.");
      }

      const [
        locationData,
        customerData,
        productData,
        balanceData,
      ] = await Promise.all([
        locationResponse.json(),
        customerResponse.json(),
        productResponse.json(),
        balanceResponse.json(),
      ]);

      const loadedLocations = locationData.locations || [];
      const loadedCustomers = customerData.customers || [];
      const loadedProducts = productData.products || [];
      const loadedBalances = balanceData.balances || [];

      setLocations(loadedLocations);
      setCustomers(loadedCustomers);
      setProducts(loadedProducts);
      setBalances(loadedBalances);

      const preselectedCustomerId =
        new URLSearchParams(window.location.search).get("customer_id") || "";

      if (
        preselectedCustomerId &&
        loadedCustomers.some(
          (customer: Customer) =>
            customer.id === preselectedCustomerId
        )
      ) {
        setCustomerId(preselectedCustomerId);
      }

      if (loadedLocations.length > 0) {
        setLocationId(loadedLocations[0].id);
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to load sale setup data.");
    } finally {
      setLoading(false);
    }
  }

  const activeProducts = useMemo(
    () => products,
    [products]
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + item.quantity * item.unit_price,
        0
      ),
    [items]
  );

  const discountTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.discount_amount,
        0
      ),
    [items]
  );

  const taxTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.tax_amount,
        0
      ),
    [items]
  );

  const grandTotal =
    subtotal -
    discountTotal +
    taxTotal +
    Math.max(0, Number(shippingAmount || 0));

  const selectedBalance = useMemo(
    () =>
      balances.find(
        (balance) =>
          balance.product_id === selectedProductId &&
          balance.location_id === locationId
      ) || null,
    [balances, selectedProductId, locationId]
  );

  const availableStock = selectedBalance
    ? Number(selectedBalance.quantity_available || 0)
    : 0;

  const quantityAlreadyAdded = useMemo(
    () =>
      items
        .filter(
          (item) => item.product_id === selectedProductId
        )
        .reduce(
          (sum, item) => sum + Number(item.quantity || 0),
          0
        ),
    [items, selectedProductId]
  );

  const remainingAvailableStock = Math.max(
    0,
    availableStock - quantityAlreadyAdded
  );

  function handleProductChange(productId: string) {
    setSelectedProductId(productId);

    const product = products.find(
      (item) => item.id === productId
    );

    if (product) {
      setUnitPrice(
        product.selling_price !== null
          ? String(product.selling_price)
          : ""
      );
    } else {
      setUnitPrice("");
    }
  }

  function addItem() {
    setMessage("");

    const product = products.find(
      (item) => item.id === selectedProductId
    );

    const qty = Number(quantity);
    const price = Number(unitPrice);
    const discount = Number(discountAmount || 0);
    const tax = Number(taxAmount || 0);

    if (!product) {
      setMessage("Select a product.");
      return;
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      setMessage("Quantity must be greater than zero.");
      return;
    }

    if (qty > remainingAvailableStock) {
      setMessage(
        `Insufficient stock. Available: ${remainingAvailableStock}, requested: ${qty}.`
      );
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setMessage("Enter a valid unit price.");
      return;
    }

    if (discount < 0 || tax < 0) {
      setMessage("Discount and tax cannot be negative.");
      return;
    }

    setItems((current) => [
      ...current,
      {
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        quantity: qty,
        unit_price: price,
        discount_amount: discount,
        tax_amount: tax,
      },
    ]);

    setSelectedProductId("");
    setQuantity("1");
    setUnitPrice("");
    setDiscountAmount("0");
    setTaxAmount("0");
  }

  function removeItem(index: number) {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  async function createSale() {
    if (!firebaseUser) return;

    setMessage("");

    if (!locationId) {
      setMessage("Select a sales location.");
      return;
    }

    if (items.length === 0) {
      setMessage("Add at least one product.");
      return;
    }

    const shipping = Number(shippingAmount || 0);

    if (!Number.isFinite(shipping) || shipping < 0) {
      setMessage("Shipping amount cannot be negative.");
      return;
    }

    try {
      setSaving(true);

      const token = await firebaseUser.getIdToken();

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const saleResponse = await fetch(
        `${API_URL}/api/sales-orders`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            customer_id: customerId || null,
            location_id: locationId,
            sales_channel: salesChannel,
            currency: "AOA",
            customer_reference:
              customerReference.trim() || null,
            shipping_amount: shipping,
            notes: notes.trim() || null,
          }),
        }
      );

      const saleData = await saleResponse.json();

      if (!saleResponse.ok) {
        throw new Error(
          saleData.detail || "Unable to create sales order."
        );
      }

      const sale = saleData.sales_order;

      for (const item of items) {
        const itemResponse = await fetch(
          `${API_URL}/api/sales-orders/${sale.id}/items`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              product_id: item.product_id,
              variant_id: null,
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount_amount: item.discount_amount,
              tax_amount: item.tax_amount,
              description: item.product_name,
            }),
          }
        );

        const itemData = await itemResponse.json();

        if (!itemResponse.ok) {
          throw new Error(
            itemData.detail ||
              `Unable to add ${item.product_name}.`
          );
        }
      }

      window.location.href = `/sales/${sale.id}`;
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create sale."
      );
    } finally {
      setSaving(false);
    }
  }

  function formatMoney(value: number) {
    return `AOA ${value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-600">
        Loading new sale...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-8">
          <div>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/sales";
              }}
              className="mb-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
            >
              ← Back to Sales
            </button>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              New Sale
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create a new sales order
            </p>
          </div>

          <button
            type="button"
            onClick={createSale}
            disabled={saving}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Sale"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-8">
        {message && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Sale Information
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Sales Location">
                  <select
                    value={locationId}
                    onChange={(event) =>
                      setLocationId(event.target.value)
                    }
                    className="input"
                  >
                    <option value="">Select location</option>

                    {locations.map((location) => (
                      <option
                        key={location.id}
                        value={location.id}
                      >
                        {location.name} ({location.location_code})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Sales Channel">
                  <select
                    value={salesChannel}
                    onChange={(event) =>
                      setSalesChannel(event.target.value)
                    }
                    className="input"
                  >
                    {CHANNELS.map((channel) => (
                      <option
                        key={channel.value}
                        value={channel.value}
                      >
                        {channel.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Customer">
                  <select
                    value={customerId}
                    onChange={(event) =>
                      setCustomerId(event.target.value)
                    }
                    className="input"
                  >
                    <option value="">Walk-in customer</option>

                    {customers.map((customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.customer_number} — {customer.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Customer Reference">
                  <input
                    value={customerReference}
                    onChange={(event) =>
                      setCustomerReference(event.target.value)
                    }
                    placeholder="Optional reference"
                    className="input"
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Notes">
                  <textarea
                    value={notes}
                    onChange={(event) =>
                      setNotes(event.target.value)
                    }
                    rows={3}
                    placeholder="Optional sales notes"
                    className="input resize-none"
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Add Products
              </h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-5">
                <div className="lg:col-span-2">
                  <Field label="Product">
                    <select
                      value={selectedProductId}
                      onChange={(event) =>
                        handleProductChange(event.target.value)
                      }
                      className="input"
                    >
                      <option value="">Select product</option>

                      {activeProducts.map((product) => (
                        <option
                          key={product.id}
                          value={product.id}
                        >
                          {product.sku} — {product.name}
                        </option>
                      ))}
                    </select>

                    {selectedProductId && (
                      <div
                        className={`mt-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                          remainingAvailableStock > 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        Available stock: {remainingAvailableStock}
                      </div>
                    )}
                  </Field>
                </div>

                <Field label="Quantity">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(event.target.value)
                    }
                    className="input"
                  />
                </Field>

                <Field label="Unit Price">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(event) =>
                      setUnitPrice(event.target.value)
                    }
                    className="input"
                  />
                </Field>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={addItem}
                    disabled={
                      !selectedProductId ||
                      remainingAvailableStock <= 0
                    }
                    className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                  >
                    {selectedProductId &&
                    remainingAvailableStock <= 0
                      ? "Out of Stock"
                      : "Add Product"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Discount">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount}
                    onChange={(event) =>
                      setDiscountAmount(event.target.value)
                    }
                    className="input"
                  />
                </Field>

                <Field label="Tax">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={taxAmount}
                    onChange={(event) =>
                      setTaxAmount(event.target.value)
                    }
                    className="input"
                  />
                </Field>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-bold text-slate-950">
                  Sale Items
                </h2>
              </div>

              {items.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-500">
                  No products added yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-6 py-4">Product</th>
                        <th className="px-6 py-4 text-right">
                          Qty
                        </th>
                        <th className="px-6 py-4 text-right">
                          Price
                        </th>
                        <th className="px-6 py-4 text-right">
                          Total
                        </th>
                        <th className="w-20 px-6 py-4" />
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, index) => {
                        const lineTotal =
                          item.quantity * item.unit_price -
                          item.discount_amount +
                          item.tax_amount;

                        return (
                          <tr key={`${item.product_id}-${index}`}>
                            <td className="px-6 py-5">
                              <div className="font-semibold text-slate-900">
                                {item.product_name}
                              </div>
                              <div className="mt-1 font-mono text-xs text-slate-400">
                                {item.sku}
                              </div>
                            </td>

                            <td className="px-6 py-5 text-right text-sm">
                              {item.quantity}
                            </td>

                            <td className="px-6 py-5 text-right text-sm text-slate-900">
                              {formatMoney(item.unit_price)}
                            </td>

                            <td className="px-6 py-5 text-right font-semibold text-slate-900">
                              {formatMoney(lineTotal)}
                            </td>

                            <td className="px-6 py-5 text-right">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="text-sm font-semibold text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <aside>
            <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Sale Summary
              </h2>

              <div className="mt-6 space-y-4">
                <SummaryRow
                  label="Subtotal"
                  value={formatMoney(subtotal)}
                />

                <SummaryRow
                  label="Discount"
                  value={formatMoney(discountTotal)}
                />

                <SummaryRow
                  label="Tax"
                  value={formatMoney(taxTotal)}
                />

                <Field label="Shipping">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingAmount}
                    onChange={(event) =>
                      setShippingAmount(event.target.value)
                    }
                    className="input"
                  />
                </Field>

                <div className="border-t border-slate-200 pt-4">
                  <SummaryRow
                    label="Total"
                    value={formatMoney(grandTotal)}
                    strong
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={createSale}
                disabled={saving}
                className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Creating Sale..." : "Create Sale"}
              </button>

              <p className="mt-3 text-center text-xs text-slate-400">
                The sale will initially be created as a draft.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          padding: 0.75rem 1rem;
          color: rgb(15 23 42);
          outline: none;
        }

        .input:focus {
          border-color: rgb(148 163 184);
          background: white;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-slate-700">
        {label}
      </div>
      {children}
    </label>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={
          strong
            ? "text-base font-bold text-slate-950"
            : "text-sm text-slate-500"
        }
      >
        {label}
      </span>

      <span
        className={
          strong
            ? "text-xl font-bold text-slate-950"
            : "text-sm font-semibold text-slate-800"
        }
      >
        {value}
      </span>
    </div>
  );
}
