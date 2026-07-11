import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeftIcon, ArrowUpRightIcon, BanknotesIcon, WalletIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { walletService } from "@/services/wallet.service";
import { adminService } from "@/services/admin.service";
import { formatCurrency, formatDateTime } from "@/utils/format";

const PAGE_SIZE = 10;

export const WalletPage = (): JSX.Element => {
  const [page, setPage] = useState(1);

  const wallet = useQuery({ queryKey: ["wallet", "me"], queryFn: walletService.myWallet });
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: adminService.stats });
  const transactions = useQuery({
    queryKey: ["wallet", "transactions", page],
    queryFn: () => walletService.transactions({ page, limit: PAGE_SIZE }),
  });

  return (
    <div>
      <PageHeader
        title="Wallet"
        description="Your wallet and the platform's total reward liability."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="My wallet balance"
          value={wallet.data ? formatCurrency(wallet.data.balance) : "—"}
          icon={WalletIcon}
          loading={wallet.isLoading}
        />
        <StatCard
          label="Platform wallet liability"
          value={stats.data ? formatCurrency(stats.data.totalWalletBalance) : "—"}
          icon={BanknotesIcon}
          hint="Sum of all user balances"
          loading={stats.isLoading}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>Credits and debits on your wallet</CardDescription>
        </CardHeader>
        {transactions.isLoading ? (
          <TableSkeleton />
        ) : !transactions.data || transactions.data.items.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            description="Wallet activity will appear here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Balance after</TableHead>
                <TableHead className="hidden text-right md:table-cell">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.data.items.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <Badge variant={tx.type === "CREDIT" ? "success" : "destructive"}>
                      {tx.type === "CREDIT" ? (
                        <ArrowDownLeftIcon className="h-3 w-3" />
                      ) : (
                        <ArrowUpRightIcon className="h-3 w-3" />
                      )}
                      {tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-64">
                    <p className="truncate">{tx.description ?? "—"}</p>
                    {tx.reference && (
                      <p className="truncate text-xs text-muted-foreground">{tx.reference}</p>
                    )}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium tabular-nums ${
                      tx.type === "CREDIT"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {tx.type === "CREDIT" ? "+" : "−"}
                    {formatCurrency(tx.amount)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                    {formatCurrency(tx.balanceAfter)}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-right text-xs text-muted-foreground md:table-cell">
                    {formatDateTime(tx.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {transactions.data && <Pagination meta={transactions.data.meta} onPageChange={setPage} />}
      </Card>
    </div>
  );
};
