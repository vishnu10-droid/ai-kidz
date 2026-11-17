// Browser-only PDF downloads (certificates and fee receipts). jsPDF is loaded on demand.
import { formatINR } from "./pricing";

async function newDoc(orientation: "landscape" | "portrait") {
  const { jsPDF } = await import("jspdf");
  return new jsPDF({ orientation, unit: "mm", format: "a4" });
}

// jsPDF draws with RGB values; these mirror the brand tokens (blue, purple, amber, navy, slate).
const BLUE: [number, number, number] = [37, 99, 235];
const PURPLE: [number, number, number] = [124, 58, 237];
const AMBER: [number, number, number] = [245, 158, 11];
const NAVY: [number, number, number] = [16, 24, 40];
const SLATE: [number, number, number] = [100, 116, 139];

const longDate = (v: string | Date) => new Date(v).toLocaleDateString("en-IN", { dateStyle: "long" });

export async function downloadCertificatePdf(c: { studentName: string; courseTitle: string; code: string; issuedAt: string; verifyUrl: string }) {
  const doc = await newDoc("landscape");
  const W = 297;
  const H = 210;
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, W, H, "F");
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(2);
  doc.rect(10, 10, W - 20, H - 20);
  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(0.6);
  doc.rect(15, 15, W - 30, H - 30);
  doc.setFillColor(...AMBER);
  doc.rect(W / 2 - 25, 15, 50, 3, "F");

  doc.setTextColor(...BLUE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AIKIDZ", W / 2, 40, { align: "center" });
  doc.setTextColor(...SLATE);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("CERTIFICATE OF COMPLETION", W / 2, 50, { align: "center" });

  doc.setFontSize(12);
  doc.text("This certifies that", W / 2, 72, { align: "center" });
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text(c.studentName, W / 2, 92, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE);
  doc.setFontSize(12);
  doc.text("has successfully completed the course", W / 2, 106, { align: "center" });
  doc.setTextColor(...PURPLE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(doc.splitTextToSize(c.courseTitle, 220) as string[], W / 2, 122, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE);
  doc.setFontSize(10);
  doc.text(`Issued ${longDate(c.issuedAt)}`, 40, 172);
  doc.text(`Certificate ID: ${c.code}`, 40, 179);
  doc.text("Verify at", W - 40, 172, { align: "right" });
  doc.setTextColor(...BLUE);
  doc.text(c.verifyUrl, W - 40, 179, { align: "right" });
  doc.save(`AIKIDZ-certificate-${c.code}.pdf`);
}

export async function downloadReceiptPdf(r: {
  receiptNumber: string;
  orgName: string;
  studentName: string;
  studentCode?: string | null | undefined;
  description: string;
  amount: number | string;
  status: string;
  method?: string | null;
  paidAt?: string | null;
  dueDate?: string | null;
  createdAt: string;
}) {
  const doc = await newDoc("portrait");
  const W = 210;
  const paid = r.status === "paid";
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("AIKIDZ", 20, 20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(paid ? "FEE RECEIPT" : "FEE INVOICE", W - 20, 20, { align: "right" });

  doc.setTextColor(...NAVY);
  doc.setFontSize(10);
  const rows: [string, string][] = [
    [paid ? "Receipt no." : "Invoice no.", r.receiptNumber],
    ["Issued by", r.orgName],
    ["Student", r.studentCode ? `${r.studentName} (${r.studentCode})` : r.studentName],
    ["Invoice date", longDate(r.createdAt)],
    ...(r.dueDate ? ([["Due date", longDate(r.dueDate)]] as [string, string][]) : []),
    ["Status", paid ? "Paid" : r.status === "pending" ? "Unpaid" : r.status],
    ...(paid && r.paidAt ? ([["Paid on", longDate(r.paidAt)]] as [string, string][]) : []),
    ...(paid && r.method ? ([["Payment method", r.method.replace(/_/g, " ").toUpperCase()]] as [string, string][]) : []),
  ];
  let y = 52;
  for (const [k, v] of rows) {
    doc.setTextColor(...SLATE);
    doc.text(k, 20, y);
    doc.setTextColor(...NAVY);
    doc.text(v, 70, y);
    y += 8;
  }

  y += 6;
  doc.setDrawColor(226, 232, 240);
  doc.line(20, y, W - 20, y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Description", 20, y);
  doc.text("Amount", W - 20, y, { align: "right" });
  y += 9;
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(r.description, 120) as string[], 20, y);
  // jsPDF's built-in fonts have no ₹ glyph, so the PDF spells the currency as "Rs.".
  const amount = formatINR(r.amount).replace("₹", "Rs. ");
  doc.text(amount, W - 20, y, { align: "right" });
  y += 14;
  doc.line(20, y, W - 20, y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(paid ? "Total paid" : "Total due", 20, y);
  doc.text(amount, W - 20, y, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text("This is a computer-generated document and does not need a signature.", W / 2, 280, { align: "center" });
  doc.save(`AIKIDZ-${paid ? "receipt" : "invoice"}-${r.receiptNumber}.pdf`);
}
