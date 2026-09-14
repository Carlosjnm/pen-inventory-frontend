"use client";

import { use, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type SaleItem = {
  id: string;
  product_id: string;
  variant_id: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
  sku: string;
  product_name: string;
};

type SalesOrder = {
  id: string;
  sale_number: string;
  status: string;
  sales_channel: string;
  currency: string;
  sale_date: string;
  subtotal_amount?: number;
  shipping_amount?: number;
  total_amount: number;
  customer_reference: string | null;
  customer_id: string | null;
  customer_name: string | null;
  location_id: string;
  location_code: string | null;
  location_name: string | null;
  amount_paid: number;
  balance_due: number;
  notes?: string | null;
  items: SaleItem[];
};

type Payment = {
  id: string;
  payment_number: string;
  payment_method: string;
  amount: number;
  currency: string;
  status: string;
  payment_reference: string | null;
  paid_at: string | null;
  notes: string | null;
};

type ReceiptSettings = {
  business_name: string;
  business_subtitle: string;
  business_tax_number: string;
  business_phone: string;
  business_email: string;
  business_address: string;
  receipt_footer: string;
};

export default function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [sale, setSale] = useState<SalesOrder | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const [receiptLogoDataUrl, setReceiptLogoDataUrl] = useState<string | null>(null);

  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>({
    business_name: "PEN",
    business_subtitle: "Inventário e Vendas",
    business_tax_number: "",
    business_phone: "",
    business_email: "",
    business_address: "",
    receipt_footer: "Obrigado pela sua compra.",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      setFirebaseUser(user);
      await loadSale(user);
    });

    return () => unsubscribe();
  }, [id]);

  async function loadSale(user: User) {
    try {
      setLoading(true);
      setMessage("");

      const token = await user.getIdToken();

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [
        saleResponse,
        paymentsResponse,
        settingsResponse,
        logoResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/api/sales-orders/${id}`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/sales-orders/${id}/payments`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/settings`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/settings/business-logo`, {
          headers,
          cache: "no-store",
        }),
      ]);

      const saleData = await saleResponse.json().catch(() => ({}));

      if (!saleResponse.ok) {
        throw new Error(
          saleData.detail || "Não foi possível carregar a ordem de venda."
        );
      }

      setSale(saleData.sales_order);

      if (paymentsResponse.ok) {
        const paymentData = await paymentsResponse.json();
        setPayments(paymentData.payments || []);
      } else {
        setPayments([]);
      }

      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob();

        const logoDataUrl = await new Promise<string>(
          (resolve, reject) => {
            const reader = new FileReader();

            reader.onloadend = () => {
              if (typeof reader.result === "string") {
                resolve(reader.result);
              } else {
                reject(new Error("Não foi possível ler o logótipo da empresa."));
              }
            };

            reader.onerror = () => {
              reject(new Error("Não foi possível ler o logótipo da empresa."));
            };

            reader.readAsDataURL(logoBlob);
          }
        );

        setReceiptLogoDataUrl(logoDataUrl);
      } else {
        setReceiptLogoDataUrl(null);
      }

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();

        const settings = settingsData.settings || [];

        const settingMap = Object.fromEntries(
          settings.map(
            (setting: {
              setting_key: string;
              setting_value: unknown;
            }) => [setting.setting_key, setting.setting_value]
          )
        );

        if (typeof settingMap.default_payment_method === "string") {
          setPaymentMethod(settingMap.default_payment_method);
        }

        setReceiptSettings({
          business_name: String(
            settingMap.business_name ?? "PEN"
          ),
          business_subtitle: String(
            settingMap.business_subtitle ?? "Inventário e Vendas"
          ),
          business_tax_number: String(
            settingMap.business_tax_number ?? ""
          ),
          business_phone: String(
            settingMap.business_phone ?? ""
          ),
          business_email: String(
            settingMap.business_email ?? ""
          ),
          business_address: String(
            settingMap.business_address ?? ""
          ),
          receipt_footer: String(
            settingMap.receipt_footer ??
              "Obrigado pela sua compra."
          ),
        });
      }
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a ordem de venda."
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitSale() {
    if (!firebaseUser || !sale) return;

    try {
      setActionLoading(true);
      setMessage("");
      setPaymentError("");

      const token = await firebaseUser.getIdToken();

      const response = await fetch(
        `${API_URL}/api/sales-orders/${sale.id}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível submeter a ordem de venda."
        );
      }

      await loadSale(firebaseUser);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível submeter a ordem de venda."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function recordPayment() {
    if (!firebaseUser || !sale) return;

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Introduza um valor de pagamento válido.");
      return;
    }

    try {
      setActionLoading(true);
      setMessage("");
      setPaymentError("");

      const token = await firebaseUser.getIdToken();

      const response = await fetch(
        `${API_URL}/api/sales-orders/${sale.id}/payments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payment_method: paymentMethod,
            amount,
            payment_reference:
              paymentReference.trim() || null,
            notes: paymentNotes.trim() || null,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Não foi possível registar o pagamento."
        );
      }

      setShowPayment(false);
      setPaymentAmount("");
      setPaymentReference("");
      setPaymentNotes("");

      await loadSale(firebaseUser);
    } catch (error) {
      console.error(error);
      setPaymentError(
        error instanceof Error
          ? error.message
          : "Não foi possível registar o pagamento."
      );
    } finally {
      setActionLoading(false);
    }
  }

  function printReceipt() {
    if (!sale) return;

    const receiptWindow = window.open(
      "",
      "_blank",
      "width=900,height=900"
    );

    if (!receiptWindow) {
      setMessage(
        "Your browser blocked the receipt window. Please allow pop-ups and try again."
      );
      return;
    }

    function escapeHtml(
      value: string | number | null | undefined
    ) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    const itemRows = sale.items
      .map(
        (item) => `
          <tr>
            <td>
              <strong>${escapeHtml(item.product_name)}</strong>
              <div class="muted">${escapeHtml(item.sku)}</div>
            </td>
            <td class="number">${escapeHtml(Number(item.quantity))}</td>
            <td class="number">${escapeHtml(
              formatMoney(item.unit_price, sale.currency)
            )}</td>
            <td class="number">${escapeHtml(
              formatMoney(item.line_total, sale.currency)
            )}</td>
          </tr>
        `
      )
      .join("");

    const paymentRows = payments.length
      ? payments
          .map(
            (payment) => `
              <tr>
                <td>${escapeHtml(
                  payment.payment_method.toLowerCase() === "cash"
                    ? "Dinheiro"
                    : formatStatus(payment.payment_method)
                )}</td>
                <td>${escapeHtml(
                  payment.payment_reference || "—"
                )}</td>
                <td class="number">${escapeHtml(
                  formatMoney(
                    payment.amount,
                    payment.currency
                  )
                )}</td>
              </tr>
            `
          )
          .join("")
      : `
          <tr>
            <td colspan="3" class="muted">
              Nenhum pagamento registado
            </td>
          </tr>
        `;

    const businessDetails = [
      {
        label: "Morada",
        value: receiptSettings.business_address,
      },
      {
        label: "Tel",
        value: receiptSettings.business_phone,
      },
      {
        label: "Email",
        value: receiptSettings.business_email,
      },
      {
        label: "NIF",
        value: receiptSettings.business_tax_number,
      },
    ]
      .filter((detail) => detail.value.trim())
      .map(
        (detail) => `
          <div class="business-detail-row">
            <span class="business-detail-label">
              ${escapeHtml(detail.label)}:
            </span>
            <span>
              ${escapeHtml(detail.value).replace(/\n/g, "<br />")}
            </span>
          </div>
        `
      )
      .join("");

    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${escapeHtml(
            sale.sale_number
          )}</title>

          <meta charset="utf-8" />

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              background: #ffffff;
              color: #111827;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 13px;
            }

            .receipt {
              width: 100%;
              max-width: 760px;
              margin: 0 auto;
              padding: 24px 28px;
            }

            .header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              padding-bottom: 16px;
              border-bottom: 2px solid #111827;
            }

            .brand-block {
              display: flex;
              align-items: flex-start;
              gap: 14px;
            }

            .brand-logo {
              display: block;
              width: 120px;
              height: 72px;
              object-fit: contain;
              object-position: left top;
              flex: 0 0 auto;
            }

            .brand-text {
              min-width: 0;
            }

            .brand {
              font-size: 28px;
              font-weight: 800;
              letter-spacing: -0.8px;
            }

            .subtitle {
              margin-top: 3px;
              color: #64748b;
              font-size: 14px;
              font-weight: 600;
            }

            .business-details {
              margin-top: 10px;
              color: #475569;
              font-size: 11px;
              line-height: 1.45;
            }

            .business-detail-row {
              display: flex;
              align-items: flex-start;
              gap: 6px;
              margin-top: 2px;
            }

            .business-detail-label {
              flex: 0 0 auto;
              color: #334155;
              font-weight: 700;
            }

            .receipt-title {
              text-align: right;
            }

            .receipt-title h1 {
              margin: 0;
              font-size: 22px;
            }

            .receipt-number {
              margin-top: 7px;
              font-weight: 700;
            }

            .muted {
              color: #64748b;
            }

            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 18px 40px;
              margin: 24px 0;
            }

            .label {
              margin-bottom: 4px;
              color: #64748b;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: .08em;
            }

            .value {
              font-weight: 600;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 14px;
            }

            th {
              background: #f8fafc;
              padding: 10px;
              border-bottom: 1px solid #cbd5e1;
              text-align: left;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: .05em;
            }

            td {
              padding: 11px 10px;
              border-bottom: 1px solid #e2e8f0;
              vertical-align: top;
            }

            .number {
              text-align: right;
              white-space: nowrap;
            }

            .totals {
              width: 330px;
              margin: 18px 0 0 auto;
            }

            .total-row {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              padding: 6px 0;
            }

            .grand-total {
              margin-top: 7px;
              padding-top: 12px;
              border-top: 2px solid #111827;
              font-size: 16px;
              font-weight: 800;
            }

            .balance {
              margin-top: 7px;
              font-weight: 800;
            }

            .section-title {
              margin-top: 22px;
              font-size: 14px;
              font-weight: 800;
            }

            .footer {
              margin-top: 24px;
              padding-top: 14px;
              border-top: 1px solid #cbd5e1;
              text-align: center;
              color: #64748b;
              line-height: 1.5;
            }

            .no-print {
              margin-bottom: 20px;
              text-align: right;
            }

            .print-button {
              border: 0;
              border-radius: 8px;
              background: #0f172a;
              color: white;
              padding: 10px 18px;
              font-weight: 700;
              cursor: pointer;
            }

            @media print {
              .no-print {
                display: none;
              }

              .receipt {
                max-width: none;
                padding: 0;
              }

              @page {
                margin: 12mm;
              }
            }
          </style>
        </head>

        <body>
          <div class="receipt">
            <div class="no-print">
              <button
                class="print-button"
                onclick="window.print()"
              >
                Imprimir Recibo
              </button>
            </div>

            <div class="header">
              <div class="brand-block">
                ${
                  receiptLogoDataUrl
                    ? `
                      <img
                        class="brand-logo"
                        src="${escapeHtml(receiptLogoDataUrl)}"
                        alt="Business logo"
                      />
                    `
                    : ""
                }

                <div class="brand-text">
                  <div class="brand">
                    ${escapeHtml(receiptSettings.business_name)}
                  </div>
                  <div class="subtitle">
                    ${escapeHtml(receiptSettings.business_subtitle)}
                  </div>

                  <div class="business-details">
                    ${businessDetails}
                  </div>
                </div>
              </div>

              <div class="receipt-title">
                <h1>RECIBO</h1>

                <div class="receipt-number">
                  ${escapeHtml(sale.sale_number)}
                </div>

                <div class="muted">
                  ${escapeHtml(
                    formatDate(sale.sale_date)
                  )}
                </div>
              </div>
            </div>

            <div class="info-grid">
              <div>
                <div class="label">Cliente</div>
                <div class="value">
                  ${escapeHtml(
                    sale.customer_name ||
                      "Cliente balcão"
                  )}
                </div>
              </div>

              <div>
                <div class="label">Canal de Venda</div>
                <div class="value">
                  ${escapeHtml(
                    formatStatus(sale.sales_channel)
                  )}
                </div>
              </div>

              <div>
                <div class="label">Localização</div>
                <div class="value">
                  ${escapeHtml(
                    sale.location_name ||
                      sale.location_code ||
                      "—"
                  )}
                </div>
              </div>

              <div>
                <div class="label">Estado</div>
                <div class="value">
                  ${escapeHtml(
                    formatStatus(sale.status)
                  )}
                </div>
              </div>

              ${
                sale.customer_reference
                  ? `
                    <div>
                      <div class="label">
                        Referência do Cliente
                      </div>
                      <div class="value">
                        ${escapeHtml(
                          sale.customer_reference
                        )}
                      </div>
                    </div>
                  `
                  : ""
              }
            </div>

            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th class="number">Qtd.</th>
                  <th class="number">Preço Unitário</th>
                  <th class="number">Total</th>
                </tr>
              </thead>

              <tbody>
                ${itemRows}
              </tbody>
            </table>

            <div class="totals">
              ${
                sale.subtotal_amount !== undefined
                  ? `
                    <div class="total-row">
                      <span>Subtotal</span>
                      <span>
                        ${escapeHtml(
                          formatMoney(
                            sale.subtotal_amount,
                            sale.currency
                          )
                        )}
                      </span>
                    </div>
                  `
                  : ""
              }

              ${
                Number(sale.shipping_amount || 0) > 0
                  ? `
                    <div class="total-row">
                      <span>Entrega</span>
                      <span>
                        ${escapeHtml(
                          formatMoney(
                            sale.shipping_amount || 0,
                            sale.currency
                          )
                        )}
                      </span>
                    </div>
                  `
                  : ""
              }

              <div class="total-row grand-total">
                <span>Total</span>
                <span>
                  ${escapeHtml(
                    formatMoney(
                      sale.total_amount,
                      sale.currency
                    )
                  )}
                </span>
              </div>

              <div class="total-row">
                <span>Pago</span>
                <span>
                  ${escapeHtml(
                    formatMoney(
                      sale.amount_paid,
                      sale.currency
                    )
                  )}
                </span>
              </div>

              <div class="total-row balance">
                <span>Saldo a Pagar</span>
                <span>
                  ${escapeHtml(
                    formatMoney(
                      sale.balance_due,
                      sale.currency
                    )
                  )}
                </span>
              </div>
            </div>

            <div class="section-title">
              Pagamentos
            </div>

            <table>
              <thead>
                <tr>
                  <th>Método</th>
                  <th>Referência</th>
                  <th class="number">Valor</th>
                </tr>
              </thead>

              <tbody>
                ${paymentRows}
              </tbody>
            </table>

            ${
              sale.notes
                ? `
                  <div class="section-title">
                    Notas
                  </div>

                  <p>
                    ${escapeHtml(sale.notes)}
                  </p>
                `
                : ""
            }

            <div class="footer">
              ${escapeHtml(
                receiptSettings.receipt_footer
              )}
            </div>
          </div>
        </body>
      </html>
    `);

    receiptWindow.document.close();
  }

  function formatMoney(
    value: number | string | null | undefined,
    currency = "AOA"
  ) {
    const amount = Number(value || 0);

    return `${currency} ${amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatStatus(value: string) {
    const translations: Record<string, string> = {
      draft: "Rascunho",
      submitted: "Submetida",
      pending_payment: "Pagamento Pendente",
      paid: "Pago",
      cancelled: "Cancelada",
      walk_in: "Venda ao Balcão",
      whatsapp: "WhatsApp",
      instagram: "Instagram",
      facebook: "Facebook",
      website: "Website",
      marketplace: "Marketplace",
      other: "Outro",
      cash: "Dinheiro",
      card: "Cartão",
      bank_transfer: "Transferência Bancária",
      mobile_money: "Pagamento Móvel",
    };

    return (
      translations[value.toLowerCase()] ||
      value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    );
  }

  function statusClass(value: string) {
    if (value === "paid") {
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    }

    if (value === "pending_payment") {
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    }

    if (value === "draft") {
      return "bg-slate-100 text-slate-700 ring-slate-500/20";
    }

    return "bg-blue-50 text-blue-700 ring-blue-600/20";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-600">
        A carregar venda...
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-white p-8 text-red-600 shadow-sm">
          {message || "Ordem de venda não encontrada."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-6 px-4 py-5 md:px-8">
          <div>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/sales";
              }}
              className="mb-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
            >
              ← Voltar às Vendas
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                {sale.sale_number}
              </h1>

              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(
                  sale.status
                )}`}
              >
                {formatStatus(sale.status)}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {formatDate(sale.sale_date)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {sale.status !== "draft" && (
              <button
                type="button"
                onClick={printReceipt}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Print Receipt
              </button>
            )}

            {sale.status === "draft" && (
              <button
                type="button"
                onClick={submitSale}
                disabled={actionLoading}
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {actionLoading
                  ? "A submeter..."
                  : "Submeter Venda"}
              </button>
            )}

            {sale.status === "pending_payment" && (
              <button
                type="button"
                onClick={() => {
                  setPaymentAmount(
                    String(Number(sale.balance_due || 0))
                  );
                  setShowPayment(true);
                }}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Registar Pagamento
              </button>
            )}
          </div>
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
                Informação da Venda
              </h2>

              <div className="mt-5 grid gap-x-8 gap-y-5 md:grid-cols-2">
                <InfoRow
                  label="Cliente"
                  value={sale.customer_name || "Walk-in customer"}
                />

                <InfoRow
                  label="Referência do Cliente"
                  value={sale.customer_reference || "—"}
                />

                <InfoRow
                  label="Canal de Venda"
                  value={formatStatus(sale.sales_channel)}
                />

                <InfoRow
                  label="Localização"
                  value={
                    sale.location_name ||
                    sale.location_code ||
                    "—"
                  }
                />

                <InfoRow
                  label="Currency"
                  value={sale.currency}
                />

                <InfoRow
                  label="Status"
                  value={formatStatus(sale.status)}
                />
              </div>

              {sale.notes && (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Notas
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {sale.notes}
                  </p>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-bold text-slate-950">
                  Items
                </h2>
              </div>

              {sale.items.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-500">
                  No items on this sale.
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
                          Unit Price
                        </th>
                        <th className="px-6 py-4 text-right">
                          Discount
                        </th>
                        <th className="px-6 py-4 text-right">
                          Tax
                        </th>
                        <th className="px-6 py-4 text-right">
                          Total
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {sale.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-5">
                            <div className="font-semibold text-slate-900">
                              {item.product_name}
                            </div>
                            <div className="mt-1 font-mono text-xs text-slate-400">
                              {item.sku}
                            </div>
                            {item.description &&
                              item.description !==
                                item.product_name && (
                                <div className="mt-1 text-xs text-slate-500">
                                  {item.description}
                                </div>
                              )}
                          </td>

                          <td className="px-6 py-5 text-right text-sm">
                            {Number(item.quantity)}
                          </td>

                          <td className="px-6 py-5 text-right text-sm">
                            {formatMoney(
                              item.unit_price,
                              sale.currency
                            )}
                          </td>

                          <td className="px-6 py-5 text-right text-sm text-slate-500">
                            {formatMoney(
                              item.discount_amount,
                              sale.currency
                            )}
                          </td>

                          <td className="px-6 py-5 text-right text-sm text-slate-500">
                            {formatMoney(
                              item.tax_amount,
                              sale.currency
                            )}
                          </td>

                          <td className="px-6 py-5 text-right font-semibold text-slate-900">
                            {formatMoney(
                              item.line_total,
                              sale.currency
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-bold text-slate-950">
                  Pagamentos
                </h2>
              </div>

              {payments.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  No payments recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-6 py-4">Pagamento</th>
                        <th className="px-6 py-4">Method</th>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4 text-right">
                          Amount
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-5">
                            <div className="font-mono text-sm font-semibold text-slate-900">
                              {payment.payment_number}
                            </div>
                            {payment.payment_reference && (
                              <div className="mt-1 text-xs text-slate-500">
                                Ref: {payment.payment_reference}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-5 text-sm text-slate-600">
                            {formatStatus(
                              payment.payment_method
                            )}
                          </td>

                          <td className="px-6 py-5 text-sm text-slate-600">
                            {formatDate(payment.paid_at)}
                          </td>

                          <td className="px-6 py-5 text-right font-semibold text-slate-900">
                            {formatMoney(
                              payment.amount,
                              payment.currency
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <aside>
            <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Resumo de Pagamento
              </h2>

              <div className="mt-6 space-y-4">
                <SummaryRow
                  label="Total"
                  value={formatMoney(
                    sale.total_amount,
                    sale.currency
                  )}
                />

                <SummaryRow
                  label="Pago"
                  value={formatMoney(
                    sale.amount_paid,
                    sale.currency
                  )}
                />

                <div className="border-t border-slate-200 pt-4">
                  <SummaryRow
                    label="Saldo em Dívida"
                    value={formatMoney(
                      sale.balance_due,
                      sale.currency
                    )}
                    strong
                  />
                </div>
              </div>

              {sale.status === "draft" && (
                <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  Submeta esta venda quando a ordem estiver confirmada.
                  Após a submissão, os pagamentos podem ser registados.
                </div>
              )}

              {sale.status === "pending_payment" && (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentAmount(
                      String(Number(sale.balance_due || 0))
                    );
                    setShowPayment(true);
                  }}
                  className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Registar Pagamento
                </button>
              )}

              {sale.status === "paid" && (
                <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  Esta venda foi paga na totalidade.
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Registar Pagamento
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Outstanding balance:{" "}
                  {formatMoney(
                    sale.balance_due,
                    sale.currency
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPayment(false)}
                className="text-xl text-slate-400 hover:text-slate-900"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {paymentError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                  <div className="font-bold">Não Foi Possível Concluir o Pagamento</div>
                  <div className="mt-1">{paymentError}</div>
                </div>
              )}

              <Field label="Método de Pagamento">
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value)
                  }
                  className="input"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">
                    Bank Transfer
                  </option>
                  <option value="multicaixa">Multicaixa</option>
                  <option value="card">Card</option>
                  <option value="online">Online</option>
                  <option value="voucher">Voucher</option>
                  <option value="other">Other</option>
                </select>
              </Field>

              <Field label="Valor">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(event) =>
                    setPaymentAmount(event.target.value)
                  }
                  className="input"
                />
              </Field>

              <Field label="Referência">
                <input
                  value={paymentReference}
                  onChange={(event) =>
                    setPaymentReference(event.target.value)
                  }
                  placeholder="Referência de pagamento opcional"
                  className="input"
                />
              </Field>

              <Field label="Notas">
                <textarea
                  rows={3}
                  value={paymentNotes}
                  onChange={(event) =>
                    setPaymentNotes(event.target.value)
                  }
                  placeholder="Optional notes"
                  className="input resize-none"
                />
              </Field>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPayment(false)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={recordPayment}
                disabled={actionLoading}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading
                  ? "Saving..."
                  : "Registar Pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}

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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-800">
        {value}
      </div>
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
            ? "font-bold text-slate-950"
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
