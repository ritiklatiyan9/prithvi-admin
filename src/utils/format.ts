const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const numberFormatter = new Intl.NumberFormat("en-US");

export const formatCurrency = (value: number): string => currencyFormatter.format(value);

export const formatNumber = (value: number): string => numberFormatter.format(value);

export const formatDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

export const formatDateTime = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

/** ISO date (yyyy-mm-dd) for <input type="date"> values. */
export const toDateInputValue = (iso: string | null): string =>
  iso ? new Date(iso).toISOString().slice(0, 10) : "";
