import { describe, expect, it } from "vitest";
import { attendanceRate, feeStatus, isOverdue, summarizeFees, todayIST } from "@/lib/fees";
import { safeEqual, signRazorpay } from "@/lib/razorpay.server";

describe("fee invoices", () => {
  const today = "2026-11-14";

  it("treats an unpaid invoice as overdue only after its due date", () => {
    expect(isOverdue({ amount: 100, status: "pending", due_date: "2026-11-13" }, today)).toBe(true);
    expect(isOverdue({ amount: 100, status: "pending", due_date: "2026-11-14" }, today)).toBe(false);
    expect(isOverdue({ amount: 100, status: "paid", due_date: "2026-11-01" }, today)).toBe(false);
    expect(isOverdue({ amount: 100, status: "pending", due_date: null }, today)).toBe(false);
  });

  it("shows overdue invoices with an overdue status", () => {
    expect(feeStatus({ amount: 100, status: "pending", due_date: "2026-10-01" }, today)).toBe("overdue");
  });

  it("totals collected, outstanding and overdue amounts in rupees", () => {
    const sum = summarizeFees(
      [
        { amount: "4500.00", status: "paid", due_date: null },
        { amount: 3000, status: "pending", due_date: "2026-11-01" },
        { amount: 2000, status: "pending", due_date: "2026-12-01" },
        { amount: 999, status: "cancelled", due_date: null },
      ],
      today,
    );
    expect(sum).toEqual({ collected: 4500, outstanding: 5000, overdue: 3000, overdueCount: 1 });
  });
});

describe("attendance", () => {
  it("counts late as attended", () => {
    expect(attendanceRate([{ status: "present" }, { status: "late" }, { status: "absent" }, { status: "present" }])).toBe(75);
  });

  it("has no rate until a session is marked", () => {
    expect(attendanceRate([])).toBeNull();
  });

  it("uses India time for today's register", () => {
    expect(todayIST(new Date("2026-11-14T19:00:00Z"))).toBe("2026-11-15");
    expect(todayIST(new Date("2026-11-14T10:00:00Z"))).toBe("2026-11-14");
  });
});

describe("Razorpay signature", () => {
  it("matches Razorpay's HMAC-SHA256 of order|payment", async () => {
    expect(await signRazorpay("test_secret", "order_ABC", "pay_XYZ")).toBe(EXPECTED);
  });

  it("rejects a tampered signature", () => {
    expect(safeEqual("abc123", "abc124")).toBe(false);
    expect(safeEqual("abc123", "abc123")).toBe(true);
  });
});

const EXPECTED = "15656b40fea6f2159b578efa459e969de9f5e223fb8a08393e274ac578d9d005";
