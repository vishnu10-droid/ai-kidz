// Pure helpers for fee invoices and attendance, shared by school, centre, teacher and parent screens.

export type FeeRow = { amount: number | string; status: string; due_date: string | null };

/** A fee is overdue when it is still unpaid after its due date (the due date itself is not late). */
export function isOverdue(row: FeeRow, today: string) {
  return row.status === "pending" && Boolean(row.due_date) && (row.due_date as string) < today;
}

/** Display status for a fee: pending invoices past their due date read as "overdue". */
export function feeStatus(row: FeeRow, today: string) {
  return isOverdue(row, today) ? "overdue" : row.status;
}

export function summarizeFees(rows: FeeRow[], today: string) {
  let collected = 0;
  let outstanding = 0;
  let overdue = 0;
  let overdueCount = 0;
  for (const r of rows) {
    const amt = Number(r.amount) || 0;
    if (r.status === "paid") collected += amt;
    else if (r.status === "pending") {
      outstanding += amt;
      if (isOverdue(r, today)) {
        overdue += amt;
        overdueCount += 1;
      }
    }
  }
  return { collected, outstanding, overdue, overdueCount };
}

export const ATTENDANCE_STATUSES = ["present", "late", "absent"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** Share of marked sessions the learner attended; "late" counts as attended. Null when nothing is marked. */
export function attendanceRate(rows: { status: string }[]) {
  if (rows.length === 0) return null;
  const attended = rows.filter((r) => r.status === "present" || r.status === "late").length;
  return Math.round((attended / rows.length) * 100);
}

/** Today's date as YYYY-MM-DD in India time, so a register saved late evening lands on the right day. */
export function todayIST(now = new Date()) {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

export function daysAgoIST(days: number, now = new Date()) {
  return todayIST(new Date(now.getTime() - days * 86_400_000));
}

export const PAYMENT_METHODS = ["cash", "upi", "bank_transfer", "cheque", "card"] as const;
