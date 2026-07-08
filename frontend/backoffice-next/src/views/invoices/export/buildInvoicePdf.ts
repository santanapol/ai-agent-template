import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { Invoice, InvoiceTransaction } from "../../../types/invoice";
import { formatCategoryName, formatDate, formatFee, formatMoney, sortInvoiceTransactions } from "../utils";

export function buildInvoicePdf(invoice: Invoice, transactions: InvoiceTransaction[]): Blob {
  const sortedTransactions = sortInvoiceTransactions(transactions);
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text("INVOICE", 14, 22);

  doc.setFontSize(10);
  doc.text(`Invoice No: ${invoice.iv_no}`, 14, 32);
  doc.text(`Billing Month: ${invoice.billing_month || "-"}`, 14, 38);

  doc.text(`Bill To: ${invoice.branch_name || "-"}`, 120, 32);
  doc.text(`Due Date: ${formatDate(invoice.due_date)}`, 120, 38);

  const tableBody = sortedTransactions.map((t) => [
    t.company_name || "-",
    formatCategoryName(t.main_category_name),
    formatMoney(t.bet || 0),
    formatMoney(t.net_win),
    formatFee(t.fee),
    formatMoney(t.amount),
  ]);

  const totalBet = sortedTransactions.reduce((sum, t) => sum + (t.bet || 0), 0);
  const totalNetWin = sortedTransactions.reduce((sum, t) => sum + t.net_win, 0);
  const totalAmount = sortedTransactions.reduce((sum, t) => sum + t.amount, 0);

  tableBody.push(["Total", "", formatMoney(totalBet), formatMoney(totalNetWin), "-", formatMoney(totalAmount)]);

  autoTable(doc, {
    startY: 48,
    head: [["Game Provider", "Game Category", "Bet", "Net Win", "Fee (%)", "Amount"]],
    body: tableBody,
    theme: "grid",
    headStyles: { fillColor: [22, 119, 255] },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
    didParseCell: (data) => {
      if (data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });

  return doc.output("blob");
}
