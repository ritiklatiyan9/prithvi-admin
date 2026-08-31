import * as XLSX from "xlsx";

export const writeExcelFile = (
  records: Record<string, unknown>[],
  headers: string[],
  fileName: string,
): void => {
  const sheet = XLSX.utils.json_to_sheet(records, { header: headers });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Export");
  XLSX.writeFile(book, `${fileName}.xlsx`);
};
