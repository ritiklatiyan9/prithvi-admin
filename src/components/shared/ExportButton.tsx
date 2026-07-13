import { toast } from "sonner";
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToExcel, exportToPdf, type ExportColumn } from "@/utils/export";
import { cn } from "@/utils/cn";

export type { ExportColumn };

export interface ExportButtonProps {
  /** The currently loaded, currently filtered rows (client-side only). */
  rows: Record<string, unknown>[];
  columns: ExportColumn[];
  /** Base file name without extension, e.g. "users". */
  fileName: string;
  /** Heading of the PDF report. */
  title: string;
  /** Optional "Status: Active · Search: foo" line shown in the PDF. */
  filterSummary?: string;
  /** Current page number for paginated lists; appends "-pageN" to the file name. */
  page?: number;
  className?: string;
}

export const ExportButton = ({
  rows,
  columns,
  fileName,
  title,
  filterSummary,
  page,
  className,
}: ExportButtonProps): JSX.Element => {
  const empty = rows.length === 0;
  const name = page ? `${fileName}-page${page}` : fileName;
  const pdfTitle = page ? `${title} (page ${page})` : title;

  return (
    // ponytail: native title attr as the empty-state tooltip; span wrapper because
    // disabled buttons have pointer-events:none
    <span title={empty ? "No rows to export" : undefined} className={cn("inline-flex", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={empty}>
            <ArrowDownTrayIcon className="mr-2 h-4 w-4" /> Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => exportToExcel(rows, columns, name)}>
            <TableCellsIcon /> Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              if (!exportToPdf(rows, columns, pdfTitle, filterSummary)) {
                toast.error("Pop-up blocked — allow pop-ups to export PDF.");
              }
            }}
          >
            <DocumentTextIcon /> PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
};
