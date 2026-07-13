import { formatCoins } from "@/utils/format";
import { cn } from "@/utils/cn";

interface CoinsProps {
  /** Raw stored amount; rendered as gold-coin currency (no dollar signs). */
  value: number;
  className?: string;
}

/** Gold coin glyph + formatted amount, e.g. (o) 120. Icon scales with font size. */
export const Coins = ({ value, className }: CoinsProps): JSX.Element => (
  <span className={cn("inline-flex items-center gap-1 whitespace-nowrap tabular-nums", className)}>
    <svg viewBox="0 0 16 16" className="h-[1em] w-[1em] shrink-0" aria-hidden="true">
      <circle cx="8" cy="8" r="7.5" fill="#d97706" />
      <circle cx="8" cy="8" r="6" fill="#fbbf24" stroke="#b45309" strokeWidth="0.75" />
    </svg>
    {formatCoins(value)}
  </span>
);
