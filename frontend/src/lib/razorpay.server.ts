// Razorpay REST helpers. Keys are read per request (never at module scope).
// Uses Web Crypto only, so it runs the same on the published edge runtime as in preview.
export function razorpayKeys() {
  const keyId = process.env["RAZORPAY_KEY_ID"];
  const keySecret = process.env["RAZORPAY_KEY_SECRET"];
  return keyId && keySecret ? { keyId, keySecret } : null;
}

export async function createRazorpayOrder(amountRupees: number, receipt: string) {
  const keys = razorpayKeys();
  if (!keys) throw new Error("Online payments are not set up yet.");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${keys.keyId}:${keys.keySecret}`)}`,
    },
    body: JSON.stringify({ amount: Math.round(amountRupees * 100), currency: "INR", receipt }),
  });
  if (!res.ok) {
    console.error("Razorpay order failed", res.status, await res.text());
    throw new Error("Could not start the payment. Please try again.");
  }
  const body = (await res.json()) as { id: string; amount: number; currency: string };
  return { id: body.id, amount: body.amount, currency: body.currency, keyId: keys.keyId };
}

/** HMAC-SHA256 of `orderId|paymentId` with the key secret, compared in constant time. */
export async function signRazorpay(secret: string, orderId: string, paymentId: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${orderId}|${paymentId}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string) {
  const keys = razorpayKeys();
  if (!keys) return false;
  return safeEqual(await signRazorpay(keys.keySecret, orderId, paymentId), signature);
}
