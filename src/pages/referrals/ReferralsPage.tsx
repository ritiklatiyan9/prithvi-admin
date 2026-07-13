import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { FiltersBar, type DateRangeValue } from "@/components/shared/FiltersBar";
import { ExportButton, type ExportColumn } from "@/components/shared/ExportButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Coins } from "@/components/shared/Coins";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { referralsService } from "@/services/referrals.service";
import { formatDateTime } from "@/utils/format";

const PAGE_SIZE = 20;

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "referredName", label: "Referred user" },
  { key: "referredEmail", label: "Referred email" },
  { key: "referrerName", label: "Referrer" },
  { key: "referrerEmail", label: "Referrer email" },
  { key: "referralCode", label: "Referral code" },
  { key: "creditedPoints", label: "Coins credited" },
  { key: "referredAt", label: "Date", format: (v) => formatDateTime(v as string | null) },
];

export const ReferralsPage = (): JSX.Element => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<DateRangeValue>({ from: "", to: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["referrals", { page, search, range }],
    queryFn: () =>
      referralsService.list({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        from: range.from || undefined,
        to: range.to || undefined,
      }),
  });

  const rows = data?.items ?? [];

  const exportRows = useMemo(
    () =>
      rows.map((row) => ({
        referredName: row.referred.name,
        referredEmail: row.referred.email,
        referrerName: row.referrer?.name ?? "—",
        referrerEmail: row.referrer?.email ?? "—",
        referralCode: row.referrer?.referralCode ?? "—",
        creditedPoints: row.creditedPoints ?? "—",
        referredAt: row.referred.referredAt,
      })),
    [rows],
  );

  const hasFilters = Boolean(search.trim() || range.from || range.to);

  return (
    <div>
      <PageHeader
        title="Referrals"
        description="Who referred whom, and the coins credited for each signup."
      />

      <FiltersBar
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPage(1);
          },
          placeholder: "Search referred or referrer email…",
        }}
        dateRange={{
          value: range,
          onChange: (value) => {
            setRange(value);
            setPage(1);
          },
        }}
        onClearAll={() => {
          setSearch("");
          setRange({ from: "", to: "" });
          setPage(1);
        }}
      >
        <ExportButton
          rows={exportRows}
          columns={EXPORT_COLUMNS}
          fileName="referrals"
          title="Referrals"
          page={page}
          filterSummary={
            [
              search.trim() ? `Search: ${search.trim()}` : "",
              range.from || range.to ? `Date: ${range.from || "…"} – ${range.to || "…"}` : "",
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          }
        />
      </FiltersBar>

      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No referrals yet"
            description={
              hasFilters ? "Nothing matches this filter." : "Referred signups will appear here."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referred user</TableHead>
                <TableHead className="hidden md:table-cell">Referrer</TableHead>
                <TableHead className="hidden sm:table-cell">Referral code</TableHead>
                <TableHead className="text-right">Coins credited</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.referred.id}>
                  <TableCell className="max-w-56">
                    <p className="truncate font-medium">{row.referred.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.referred.email}</p>
                  </TableCell>
                  <TableCell className="hidden max-w-56 md:table-cell">
                    {row.referrer ? (
                      <>
                        <p className="truncate font-medium">{row.referrer.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.referrer.email}
                        </p>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs sm:table-cell">
                    {row.referrer?.referralCode ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {row.creditedPoints !== null ? <Coins value={row.creditedPoints} /> : "—"}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                    {formatDateTime(row.referred.referredAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </Card>
    </div>
  );
};
