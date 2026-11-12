import { Invoice } from "../types";
import { getSalonSettings } from "./salonSettings";

/**
 * Generate a smart URL encoded inside the QR Code
 * When scanned by customer's phone camera, opens the digital invoice & services menu
 */
export function generateCustomerInvoiceQrUrl(invoice: Partial<Invoice>, customDomain?: string): string {
  try {
    const minPayload = {
      id: invoice.id || "INV-0",
      date: invoice.date || new Date().toLocaleDateString("ar-EG"),
      time: invoice.time || new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      total: invoice.total || 0,
      subtotal: invoice.subtotal || invoice.total || 0,
      cust: invoice.customerName || "عميل الصالون",
      phone: invoice.customerPhone || "",
      method: invoice.paymentMethod || "نقداً",
      items: (invoice.items || []).map((it) => ({
        n: it.name,
        p: it.price,
        b: it.barber || "",
      })),
    };

    const jsonStr = JSON.stringify(minPayload);
    // Safe base64 encoding that handles UTF-8 Arabic characters cleanly
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));

    const salon = getSalonSettings();
    let baseUrl = "https://web-lamsat-khaleej.vercel.app";
    if (
      customDomain &&
      customDomain.startsWith("http") &&
      !customDomain.includes("darbix.me") &&
      !customDomain.includes("github.io")
    ) {
      baseUrl = customDomain.replace(/\/$/, "");
    } else if (
      salon.qrPortalUrl &&
      salon.qrPortalUrl.trim().startsWith("http") &&
      !salon.qrPortalUrl.includes("darbix.me") &&
      !salon.qrPortalUrl.includes("github.io")
    ) {
      baseUrl = salon.qrPortalUrl.trim().replace(/\/$/, "");
    }

    const cleanBase = baseUrl.replace(/\/$/, "");
    return `${cleanBase}/?view=invoice&d=${encodeURIComponent(base64)}`;
  } catch (err) {
    console.warn("Failed to generate QR URL:", err);
    return `https://web-lamsat-khaleej.vercel.app/?view=invoice&id=${invoice.id || "INV"}`;
  }
}

/**
 * Decode invoice data when opened from a scanned QR URL query param (?d=...)
 */
export function decodeInvoiceFromQrUrl(dataParam: string): Partial<Invoice> | null {
  try {
    const decodedJson = decodeURIComponent(escape(atob(decodeURIComponent(dataParam))));
    const parsed = JSON.parse(decodedJson);
    return {
      id: parsed.id,
      date: parsed.date,
      time: parsed.time,
      total: parsed.total,
      subtotal: parsed.subtotal || parsed.total,
      customerName: parsed.cust,
      customerPhone: parsed.phone,
      paymentMethod: parsed.method,
      items: (parsed.items || []).map((it: any, idx: number) => ({
        id: idx + 1,
        name: it.n,
        price: it.p,
        barber: it.b,
        category: "خدمات",
      })),
      tax: 0,
      discount: 0,
      status: "مكتملة",
      shiftId: 1,
      reprintCount: 0,
    };
  } catch (err) {
    console.warn("Failed to decode QR invoice payload:", err);
    return null;
  }
}

