import * as XLSX from "xlsx";
import { formatDateTime } from "@/utils/format";

export interface ExportColumn {
  /** Key into the row object. */
  key: string;
  /** Column header shown in the sheet / PDF table. */
  label: string;
  /** Optional formatter; receives the raw cell value and the full row. */
  format?: (value: unknown, row: Record<string, unknown>) => string;
}

const cellValue = (row: Record<string, unknown>, column: ExportColumn): unknown =>
  column.format ? column.format(row[column.key], row) : (row[column.key] ?? "");

export const exportToExcel = (
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  fileName: string,
): void => {
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((row) => Object.fromEntries(columns.map((col) => [col.label, cellValue(row, col)]))),
    { header: columns.map((col) => col.label) },
  );
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Export");
  XLSX.writeFile(book, `${fileName}.xlsx`);
};

const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string,
  );

/**
 * Opens a new window with a styled, printable HTML report and triggers the
 * print dialog (user saves as PDF from there). Returns false if the popup
 * was blocked.
 */
export const exportToPdf = (
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  title: string,
  filterSummary?: string,
): boolean => {
  const win = window.open("", "_blank");
  if (!win) return false;

  const head = columns.map((col) => `<th>${escapeHtml(col.label)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${columns.map((col) => `<td>${escapeHtml(cellValue(row, col))}</td>`).join("")}</tr>`,
    )
    .join("");

  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 32px;
    color: #111827;
    background: #fff;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 13px;
  }
  h1 { margin: 0 0 4px; font-size: 20px; }
  .meta { margin: 0 0 4px; color: #6b7280; font-size: 12px; }
  table { width: 100%; margin-top: 16px; border-collapse: collapse; }
  th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  th {
    border-bottom: 2px solid #111827;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #374151;
  }
  tbody tr:nth-child(even) { background: #f9fafb; }
  @media print { body { margin: 0; } }
  @page { margin: 20mm 14mm; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p class="meta">Generated ${escapeHtml(formatDateTime(new Date().toISOString()))} · ${rows.length} row${rows.length === 1 ? "" : "s"}</p>
${filterSummary ? `<p class="meta">${escapeHtml(filterSummary)}</p>` : ""}
<table>
<thead><tr>${head}</tr></thead>
<tbody>${body}</tbody>
</table>
<script>window.addEventListener("load", () => window.print());</script>
</body>
</html>`);
  win.document.close();
  win.focus();
  return true;
};
