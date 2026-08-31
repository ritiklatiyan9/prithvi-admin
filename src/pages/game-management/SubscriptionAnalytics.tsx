import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  ReceiptPercentIcon,
  UserGroupIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/shared/EmptyState";
import { FiltersBar } from "@/components/shared/FiltersBar";
import { Pagination } from "@/components/shared/Pagination";
import { StatCard } from "@/components/shared/StatCard";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ludoAdminService } from "@/services/ludo-admin.service";
import { formatDateTime, formatNumber } from "@/utils/format";
import {
  DetailGrid,
  DetailItem,
  GameStatusBadge,
  PollingStatus,
  SectionError,
} from "./shared";
import { userLabel } from "./utils";

const PAGE_SIZE = 20;
type PaymentStatus = "ALL" | "PROCESSING" | "PROCESSED" | "IGNORED" | "FAILED";

const amount = (paise?: number | null, currency = "INR"): string => {
  if (paise === undefined || paise === null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
  }).format(paise / 100);
};

export const SubscriptionAnalytics = (): JSX.Element => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PaymentStatus>("ALL");

  const analytics = useQuery({
    queryKey: ["game-admin", "subscription-analytics"],
    queryFn: ({ signal }) => ludoAdminService.subscriptionAnalytics(signal),
    refetchInterval: 30_000,
  });
  const events = useQuery({
    queryKey: ["game-admin", "payment-events", { page, status }],
    queryFn: ({ signal }) =>
      ludoAdminService.paymentEvents(
        {
          page,
          limit: PAGE_SIZE,
          status: status === "ALL" ? undefined : status,
        },
        signal,
      ),
    refetchInterval: 30_000,
  });

  const data = analytics.data;
  const plusUsers = data?.plan349Users ?? data?.plusUsers ?? 0;
  const proUsers = data?.plan499Users ?? data?.proUsers ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Subscription analytics</h2>
          <p className="text-sm text-muted-foreground">
            Membership mix, lifecycle events, failed payments, and Razorpay
            webhook processing.
          </p>
        </div>
        <PollingStatus
          active={analytics.isFetching || events.isFetching}
          label="30-second polling"
        />
      </div>

      {analytics.isError && !analytics.data ? (
        <Card>
          <SectionError
            retry={() => void analytics.refetch()}
            title="Could not load subscription analytics"
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Free users"
              value={data ? formatNumber(data.freeUsers) : "—"}
              icon={UserGroupIcon}
              loading={analytics.isLoading}
            />
            <StatCard
              label="₹349 / Plus active"
              value={data ? formatNumber(plusUsers) : "—"}
              icon={ReceiptPercentIcon}
              hint="Text chat entitlement"
              loading={analytics.isLoading}
            />
            <StatCard
              label="₹499 / Pro active"
              value={data ? formatNumber(proUsers) : "—"}
              icon={CreditCardIcon}
              hint="Text and voice entitlement"
              loading={analytics.isLoading}
            />
            <StatCard
              label="New subscriptions"
              value={data ? formatNumber(data.newSubscriptions) : "—"}
              icon={CheckCircleIcon}
              loading={analytics.isLoading}
            />
            <StatCard
              label="Renewals"
              value={data ? formatNumber(data.renewals) : "—"}
              icon={ArrowPathIcon}
              loading={analytics.isLoading}
            />
            <StatCard
              label="Failed payments"
              value={data ? formatNumber(data.failedPayments) : "—"}
              icon={ExclamationTriangleIcon}
              loading={analytics.isLoading}
            />
            <StatCard
              label="Cancellations"
              value={data ? formatNumber(data.cancellations) : "—"}
              icon={XCircleIcon}
              loading={analytics.isLoading}
            />
            <StatCard
              label="Expiring soon"
              value={data ? formatNumber(data.expiringSubscriptions) : "—"}
              icon={ClockIcon}
              loading={analytics.isLoading}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Razorpay webhook health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailGrid>
                <DetailItem label="Processing status">
                  <GameStatusBadge
                    status={data?.razorpayWebhookHealth ?? "UNKNOWN"}
                  />
                </DetailItem>
                <DetailItem label="Last webhook received">
                  {formatDateTime(data?.webhookLastReceivedAt ?? null)}
                </DetailItem>
              </DetailGrid>
            </CardContent>
          </Card>
        </>
      )}

      <div>
        <h3 className="text-base font-semibold">Payment webhook events</h3>
        <p className="text-sm text-muted-foreground">
          Idempotent backend processing results; sensitive payloads are not
          exposed.
        </p>
      </div>

      <FiltersBar
        className="mb-0"
        selects={[
          {
            key: "status",
            value: status,
            onChange: (value) => {
              setStatus(value as PaymentStatus);
              setPage(1);
            },
            options: [
              { value: "ALL", label: "All statuses" },
              { value: "PROCESSING", label: "Processing" },
              { value: "PROCESSED", label: "Processed" },
              { value: "IGNORED", label: "Ignored" },
              { value: "FAILED", label: "Failed" },
            ],
          },
        ]}
        onClearAll={() => {
          setStatus("ALL");
          setPage(1);
        }}
      />

      <Card>
        {events.isLoading ? (
          <TableSkeleton rows={7} />
        ) : events.isError && !events.data ? (
          <SectionError
            retry={() => void events.refetch()}
            title="Could not load payment events"
          />
        ) : !events.data?.items.length ? (
          <EmptyState
            title="No payment events"
            description="Razorpay webhook deliveries matching this status appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>User / plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Razorpay references</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.data.items.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="max-w-48">
                      <p className="truncate text-sm font-medium">
                        {event.type}
                      </p>
                      <code className="block truncate text-[11px] text-muted-foreground">
                        {event.eventId ?? event.razorpayEventId ?? event.id}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-48">
                      <p className="truncate text-sm">
                        {userLabel(event.user)}
                      </p>
                      <Badge variant="outline">{event.plan ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {amount(event.amountPaise, event.currency ?? "INR")}
                    </TableCell>
                    <TableCell className="max-w-56 font-mono text-[11px]">
                      <p
                        className="truncate"
                        title={event.razorpayPaymentId ?? undefined}
                      >
                        {event.razorpayPaymentId ?? "—"}
                      </p>
                      <p
                        className="truncate text-muted-foreground"
                        title={event.razorpaySubscriptionId ?? undefined}
                      >
                        {event.razorpaySubscriptionId ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <GameStatusBadge status={event.status} />
                    </TableCell>
                    <TableCell
                      className="max-w-56 truncate text-xs text-muted-foreground"
                      title={event.error ?? undefined}
                    >
                      {event.error ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                      {formatDateTime(event.createdAt ?? null)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {events.data && (
          <Pagination meta={events.data.meta} onPageChange={setPage} />
        )}
      </Card>
    </div>
  );
};
