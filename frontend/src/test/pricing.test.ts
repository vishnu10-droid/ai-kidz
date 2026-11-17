import { describe, expect, it } from "vitest";
import { computeTotals, discountPercent, formatINR, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/pricing";

describe("store pricing", () => {
  it("charges ₹79 shipping below ₹999", () => {
    expect(computeTotals([{ price: 499, quantity: 1 }])).toEqual({ subtotal: 499, shipping: 79, total: 578 });
  });

  it("ships free at exactly ₹999", () => {
    expect(computeTotals([{ price: 333, quantity: 3 }])).toEqual({ subtotal: 999, shipping: 0, total: 999 });
  });

  it("charges no shipping on an empty cart", () => {
    expect(computeTotals([])).toEqual({ subtotal: 0, shipping: 0, total: 0 });
  });

  it("multiplies price by quantity across lines", () => {
    expect(computeTotals([{ price: 200, quantity: 2 }, { price: 150, quantity: 1 }]).subtotal).toBe(550);
  });

  it("keeps the threshold and fee at ₹999 / ₹79", () => {
    expect(FREE_SHIPPING_THRESHOLD).toBe(999);
    expect(SHIPPING_FEE).toBe(79);
  });

  it("rounds the discount off the MRP", () => {
    expect(discountPercent(1499, 1999)).toBe(25);
    expect(discountPercent(1999, 1999)).toBe(0);
    expect(discountPercent(500, 0)).toBe(0);
  });

  it("formats prices in rupees", () => {
    expect(formatINR(1499)).toBe("₹1,499");
  });
});
