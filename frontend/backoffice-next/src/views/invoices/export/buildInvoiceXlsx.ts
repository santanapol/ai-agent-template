import * as XLSX from "xlsx";

import type { Invoice, InvoiceTransaction } from "../../../types/invoice";
import {
  formatBillingMonth,
  formatCategoryName,
  formatDate,
  formatMoneyWithCurrency,
  resolveInvoiceAmountDue,
  sortInvoiceTransactions,
} from "../utils";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function buildInvoiceXlsx(invoice: Invoice, transactions: InvoiceTransaction[]): Blob {
  const sortedTransactions = sortInvoiceTransactions(transactions);
  const amountDue = resolveInvoiceAmountDue(invoice, sortedTransactions);
  const wsData: (string | number)[][] = [
    ["INVOICE"],
    ["Invoice No:", invoice.iv_no, "", "Bill To:", invoice.branch_name ?? "-"],
    ["Billing Month:", formatBillingMonth(invoice.billing_month), "", "Issue Date:", formatDate(invoice.cr_date)],
    [
      "Due Date:",
      formatDate(invoice.due_date),
      "",
      "Amount Due:",
      formatMoneyWithCurrency(amountDue, invoice.currency),
    ],
    [""],
    ["Game Provider", "Game Category", "Bet", "Net Win", "Fee (%)", "Amount"],
  ];

  sortedTransactions.forEach((t) => {
    wsData.push([
      t.company_name || "-",
      formatCategoryName(t.main_category_name),
      t.bet || 0,
      t.net_win,
      t.fee === "N/A" ? "N/A" : t.fee,
      t.amount,
    ]);
  });

  const totalBet = sortedTransactions.reduce((sum, t) => sum + (t.bet || 0), 0);
  const totalNetWin = sortedTransactions.reduce((sum, t) => sum + t.net_win, 0);
  const totalAmount = sortedTransactions.reduce((sum, t) => sum + t.amount, 0);
  wsData.push(["Total", "", totalBet, totalNetWin, "", formatMoneyWithCurrency(totalAmount, invoice.currency)]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Invoice");
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;

  return new Blob([buffer], { type: XLSX_MIME });
}
