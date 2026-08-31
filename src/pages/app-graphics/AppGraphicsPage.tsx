import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BellIcon,
  BoltIcon,
  BuildingStorefrontIcon,
  CheckBadgeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PhotoIcon,
  PlayIcon,
  ReceiptPercentIcon,
  RocketLaunchIcon,
  TrophyIcon,
  UserIcon,
  UserPlusIcon,
  WalletIcon,
} from "@heroicons/react/24/solid";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { appAssetsService, type AppAssetSlot } from "@/services/app-assets.service";
import { cn } from "@/utils/cn";
import { SlotDialog } from "./SlotDialog";

// ---------------------------------------------------------------------------
// App design tokens (mirrors prithivi-app lib/theme/app_colors.dart)
// ---------------------------------------------------------------------------

const chakra = { fontFamily: "'Chakra Petch','Segoe UI',sans-serif" } as const;
const orbitron = { fontFamily: "'Orbitron',monospace" } as const;
const accentGrad = { background: "linear-gradient(135deg,#05FF08,#00C853)" } as const;
const bgGrad = { background: "linear-gradient(180deg,#10151F,#0A0E17)" } as const;

/** Glass card: surface @85%, hairline border, radius 22 — the app's GlowCard. */
const glass = "rounded-[22px] border border-[#94A3B8]/15 bg-[#151C2C]/85";

type ScreenId = "login" | "home" | "wallet" | "explore" | "rewards" | "alerts" | "profile";

interface ReplicaCtx {
  slot: (key: string) => AppAssetSlot | undefined;
  edit: (slot: AppAssetSlot) => void;
  go: (screen: ScreenId) => void;
}

const Ctx = createContext<ReplicaCtx>(null as never);

// ---------------------------------------------------------------------------
// Slot primitives — every piece of art in the replica is one of these
// ---------------------------------------------------------------------------

/**
 * Block art slot rendered in situ: the current override, or a bundled-default
 * placeholder tile. Hovering reveals the edit affordance; clicking opens the
 * upload/revert dialog.
 */
const SlotBox = ({
  slotKey,
  fit = "cover",
  className,
}: {
  slotKey: string;
  fit?: "cover" | "contain";
  className?: string;
}): JSX.Element => {
  const { slot, edit } = useContext(Ctx);
  const s = slot(slotKey);
  return (
    <button
      type="button"
      title={s ? `Edit "${s.label}"` : slotKey}
      onClick={(event) => {
        event.stopPropagation();
        if (s) edit(s);
      }}
      className={cn("group/slot relative block overflow-hidden text-left", className)}
    >
      {s?.imageUrl ? (
        <img
          src={s.imageUrl}
          alt={s.label}
          className={cn(
            "h-full w-full",
            fit === "cover" ? "object-cover object-top" : "object-contain",
          )}
        />
      ) : (
        <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-[#64748B]">
          <PhotoIcon className="h-5 w-5" />
          <span className="text-[8px] uppercase tracking-widest">Bundled default</span>
        </span>
      )}
      {s?.imageUrl && (
        <span className="absolute right-2 top-2 z-20 h-1.5 w-1.5 rounded-full bg-[#05FF08]" />
      )}
      <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 transition group-hover/slot:opacity-100">
        <span className="flex items-center gap-1.5 rounded-full border border-[#05FF08]/60 bg-[#0A0E17]/90 px-2.5 py-1 text-[10px] font-semibold text-[#05FF08]">
          <PencilIcon className="h-3 w-3" />
          {s?.label ?? slotKey}
        </span>
      </span>
    </button>
  );
};

/** Small glyph slot: override image if set, otherwise the built-in glyph. */
const SlotGlyph = ({
  slotKey,
  className = "h-5 w-5",
  round = false,
  fallback,
}: {
  slotKey: string;
  className?: string;
  round?: boolean;
  fallback: ReactNode;
}): JSX.Element => {
  const { slot } = useContext(Ctx);
  const s = slot(slotKey);
  if (s?.imageUrl) {
    return (
      <img
        src={s.imageUrl}
        alt={s.label}
        className={cn(className, round ? "rounded-full object-cover" : "object-contain")}
      />
    );
  }
  return <>{fallback}</>;
};

/**
 * Tiny hover pencil for glyph slots whose click is taken by navigation
 * (nav icons, Google badge). Parent needs the `group` class.
 */
const EditPencil = ({
  slotKey,
  className,
}: {
  slotKey: string;
  className?: string;
}): JSX.Element | null => {
  const { slot, edit } = useContext(Ctx);
  const s = slot(slotKey);
  if (!s) return null;
  return (
    <span
      role="button"
      tabIndex={0}
      title={`Edit "${s.label}"`}
      onClick={(event) => {
        event.stopPropagation();
        edit(s);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.stopPropagation();
          edit(s);
        }
      }}
      className={cn(
        "absolute z-30 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-[#05FF08]/60 bg-[#0A0E17]/95 text-[#05FF08] opacity-0 transition group-hover:opacity-100",
        className,
      )}
    >
      <PencilIcon className="h-2.5 w-2.5" />
      {s.imageUrl && (
        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#05FF08]" />
      )}
    </span>
  );
};

// Built-in glyph fallbacks (what the app paints when no override is set).
const CoinGlyph = ({ size = "h-4 w-4" }: { size?: string }): JSX.Element => (
  <span
    className={cn(size, "flex items-center justify-center rounded-full bg-[#EAB308] text-[8px] font-black text-[#854D0E]")}
  >
    ★
  </span>
);
const GemGlyph = ({ size = "h-3 w-3" }: { size?: string }): JSX.Element => (
  <span className={cn(size, "block rotate-45 rounded-[2px]")} style={accentGrad} />
);

// ---------------------------------------------------------------------------
// App building blocks (GlowCard / StatChip / LevelBar / HeroBanner replicas)
// ---------------------------------------------------------------------------

const Chip = ({
  icon,
  label,
  gold = false,
  onTap,
}: {
  icon: ReactNode;
  label: string;
  gold?: boolean;
  onTap?: () => void;
}): JSX.Element => (
  <button
    type="button"
    onClick={onTap}
    className={cn(
      "flex items-center gap-1.5 rounded-full border border-[#94A3B8]/15 bg-[#1C2438] px-3 py-1.5",
      gold ? "shadow-[0_0_12px_rgba(234,179,8,0.16)]" : "shadow-[0_0_12px_rgba(5,255,8,0.16)]",
      !onTap && "cursor-default",
    )}
  >
    {icon}
    <span className="text-[11px] font-bold text-[#F1F5F9]" style={orbitron}>
      {label}
    </span>
  </button>
);

const LevelBar = ({ fraction, className }: { fraction: number; className?: string }): JSX.Element => (
  <div className={cn("h-2 overflow-hidden rounded-full border border-[#94A3B8]/15 bg-[#1C2438]", className)}>
    <div className="h-full rounded-full" style={{ ...accentGrad, width: `${fraction * 100}%` }} />
  </div>
);

const SectionHeader = ({
  title,
  icon,
  action,
}: {
  title: string;
  icon: ReactNode;
  action?: string;
}): JSX.Element => (
  <div className="flex items-center gap-2">
    {icon}
    <p className="flex-1 truncate text-[13px] font-bold text-[#F1F5F9]">{title}</p>
    {action && <span className="text-[10px] font-bold text-[#05FF08]">{action}</span>}
  </div>
);

/** HeroBanner replica: art slot clipped in a rounded card + bottom fade + text. */
const HeroCard = ({
  slotKey,
  fit = "cover",
  ratio = "aspect-video",
  title,
  subtitle,
  trailing,
}: {
  slotKey: string;
  fit?: "cover" | "contain";
  ratio?: string;
  title?: string;
  subtitle?: string;
  trailing?: ReactNode;
}): JSX.Element => (
  <div
    className={cn(
      "relative overflow-hidden rounded-[22px] border border-[#94A3B8]/15 bg-[#1C2438] shadow-[0_0_24px_rgba(5,255,8,0.12)]",
      ratio,
    )}
  >
    <SlotBox slotKey={slotKey} fit={fit} className="absolute inset-0 h-full w-full" />
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/3 bg-gradient-to-b from-transparent to-[#0A0E17]/90" />
    {(title ?? subtitle) && (
      <div className="pointer-events-none absolute inset-x-4 bottom-3 z-10">
        {title && (
          <p className="truncate text-[15px] font-bold italic text-[#F1F5F9]">{title}</p>
        )}
        {subtitle && <p className="truncate text-[10px] text-[#94A3B8]">{subtitle}</p>}
      </div>
    )}
    {trailing && <div className="absolute right-2.5 top-2.5 z-20 flex gap-1.5">{trailing}</div>}
  </div>
);

const AppBar = ({ title, onBack }: { title: string; onBack: () => void }): JSX.Element => (
  <div className="mb-3 flex items-center gap-2">
    <button
      type="button"
      onClick={onBack}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#94A3B8]/15 bg-[#1C2438] text-[#F1F5F9]"
    >
      <ChevronLeftIcon className="h-4 w-4" />
    </button>
    <p className="text-[16px] font-bold text-[#F1F5F9]">{title}</p>
  </div>
);

const SkeletonLine = ({ className }: { className: string }): JSX.Element => (
  <div className={cn("rounded bg-[#1C2438]", className)} />
);

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

const LoginScreen = (): JSX.Element => {
  const { go } = useContext(Ctx);
  return (
    <div className="flex h-full flex-col px-4 pb-4 pt-12">
      {/* Full-bleed hero card with baked WELCOME text, fading into the bg */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[28px] border border-[#94A3B8]/15">
        <SlotBox slotKey="loginHero" fit="cover" className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/2 bg-gradient-to-b from-transparent to-[#0A0E17]" />
      </div>
      {/* Glass sign-in panel */}
      <div className="mt-3 rounded-[28px] border border-[#05FF08]/45 bg-[#151C2C]/85 px-5 py-5">
        <button
          type="button"
          onClick={() => go("home")}
          className="group relative flex h-12 w-full items-center justify-center rounded-full text-[12px] font-extrabold tracking-wider text-[#041A06] shadow-[0_0_22px_rgba(5,255,8,0.35)]"
          style={accentGrad}
        >
          <span className="absolute left-3 flex h-7 w-7 items-center justify-center rounded-full bg-white">
            <SlotGlyph
              slotKey="googleG"
              className="h-4 w-4"
              fallback={<span className="text-[13px] font-black text-[#4285F4]">G</span>}
            />
          </span>
          <EditPencil slotKey="googleG" className="-top-1.5 left-9" />
          CONTINUE WITH GOOGLE
        </button>
        <p className="mt-3 text-center text-[9px] leading-snug text-[#94A3B8]">
          By continuing you agree to our Terms of Service &amp; Privacy Policy.
        </p>
      </div>
    </div>
  );
};

const HomeScreen = (): JSX.Element => {
  const { go } = useContext(Ctx);
  return (
    <div className="space-y-4 px-4 pb-28 pt-12">
      {/* Greeting header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full p-[2.5px]" style={accentGrad}>
          <span className="flex h-full w-full items-center justify-center rounded-full bg-[#1C2438]">
            <UserIcon className="h-5 w-5 text-[#05FF08]" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] tracking-wider text-[#94A3B8]">Welcome back</p>
          <p className="flex items-center gap-1 truncate text-[16px] font-bold text-[#F1F5F9]">
            Player <CheckBadgeIcon className="h-4 w-4 text-[#05FF08]" />
          </p>
        </div>
        <button
          type="button"
          onClick={() => go("alerts")}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#94A3B8]/15 bg-[#1C2438] shadow-[0_0_14px_rgba(5,255,8,0.16)]"
        >
          <BellIcon className="h-5 w-5 text-[#05FF08]" />
        </button>
      </div>

      {/* Currency HUD: coin + gem chips (shared glyph slots, in situ) */}
      <div className="flex items-center gap-2.5">
        <div className="group relative">
          <Chip
            gold
            icon={<SlotGlyph slotKey="coin" className="h-4 w-4" round fallback={<CoinGlyph />} />}
            label="12.5K"
            onTap={() => go("wallet")}
          />
          <EditPencil slotKey="coin" className="-right-1.5 -top-1.5" />
        </div>
        <div className="group relative">
          <Chip
            icon={<SlotGlyph slotKey="gem" className="h-3.5 w-3.5" round fallback={<GemGlyph />} />}
            label="1.2M"
            onTap={() => go("rewards")}
          />
          <EditPencil slotKey="gem" className="-right-1.5 -top-1.5" />
        </div>
        <span className="ml-auto text-[11px] font-extrabold text-[#05FF08]">Level 3</span>
      </div>
      <div className="flex items-center gap-2">
        <LevelBar fraction={0.64} className="flex-1" />
        <span className="text-[9px] text-[#94A3B8]" style={orbitron}>
          320 / 500 coins
        </span>
      </div>

      {/* Home banner — admin-uploaded, hidden in the real app until set */}
      <HeroCard slotKey="homeBanner" fit="cover" ratio="h-[92px]" />

      {/* Reward Zone hero — leads the page, art contained */}
      <HeroCard
        slotKey="feedbackPromo"
        fit="contain"
        title="Reward Zone promo"
        subtitle="Help us improve and get rewarded."
        trailing={
          <>
            <Chip gold icon={<CoinGlyph size="h-3 w-3" />} label="+100" />
            <Chip icon={<PlayIcon className="h-3 w-3 text-[#05FF08]" />} label="Feedback" />
          </>
        }
      />

      {/* Earn Rewards promo — transparent chest art, contained */}
      <HeroCard
        slotKey="homeHero"
        fit="contain"
        title="Earn rewards — play & win!"
        subtitle="Complete missions, play games and open the treasure chest."
        trailing={<Chip icon={<PlayIcon className="h-3 w-3 text-[#05FF08]" />} label="Play now" />}
      />

      {/* Hero carousel slide: treasure vault (emoji fallback art, no slot) */}
      <div className={cn(glass, "flex items-center gap-3 p-4")}>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-tight text-[#F1F5F9]">Your treasure vault</p>
          <p className="mt-1 text-[10px] leading-snug text-[#94A3B8]">
            Track every coin you earn and cash out your rewards.
          </p>
          <button
            type="button"
            onClick={() => go("wallet")}
            className="mt-2.5 flex items-center gap-1 rounded-full px-4 py-2 text-[10px] font-extrabold text-[#041A06]"
            style={accentGrad}
          >
            <PlayIcon className="h-3 w-3" /> Open vault
          </button>
        </div>
        <span className="text-[52px] leading-none">🏆</span>
      </div>
      <div className="flex justify-center gap-1.5">
        <span className="h-1.5 w-5 rounded-full bg-[#05FF08]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#94A3B8]/25" />
      </div>

      {/* Quiet links: Tasks / Trophies (iconTrophy slot, in situ) */}
      <div className="flex gap-2.5">
        <QuietTile icon={<GlyphBox icon={RocketLaunchIcon} />} label="Tasks" sub="Earn more" />
        <QuietTile
          icon={
            <GlyphBox
              slot="iconTrophy"
              icon={TrophyIcon}
            />
          }
          label="Trophies"
          sub="My wins"
          onTap={() => go("rewards")}
        />
      </div>
      <QuietTile
        icon={<GlyphBox icon={UserPlusIcon} />}
        label="Share & Earn"
        sub="Invite friends, get bonus points"
      />

      {/* Continue your journey (iconSpark slot as the section glyph) */}
      <SectionHeader
        title="Continue your journey"
        action="View all"
        icon={
          <span className="group relative flex h-5 w-5 items-center justify-center">
            <SlotGlyph
              slotKey="iconSpark"
              className="h-4 w-4"
              fallback={<BoltIcon className="h-4 w-4 text-[#05FF08]" />}
            />
            <EditPencil slotKey="iconSpark" className="-right-2 -top-2" />
          </span>
        }
      />
      <div className="flex gap-3 overflow-hidden">
        {[0, 1].map((index) => (
          <div key={index} className={cn(glass, "w-[150px] shrink-0 p-3")}>
            <GlyphBox icon={RocketLaunchIcon} />
            <SkeletonLine className="mt-2.5 h-2.5 w-24" />
            <SkeletonLine className="mt-1.5 h-2.5 w-16" />
            <div className="mt-3 flex items-center gap-1">
              <CoinGlyph size="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold text-[#F1F5F9]" style={orbitron}>
                +120
              </span>
              <ChevronRightIcon className="ml-auto h-4 w-4 text-[#05FF08]" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <SectionHeader title="Quick actions" icon={<BoltIcon className="h-4 w-4 text-[#05FF08]" />} />
      <div className="flex gap-2">
        {(
          [
            [PlayIcon, "Watch", "+ Coins", undefined],
            [RocketLaunchIcon, "Games", "Play & Earn", "explore"],
            [UserPlusIcon, "Invite", "+ Rewards", undefined],
            [BuildingStorefrontIcon, "Redeem", "Cash Out", "wallet"],
          ] as const
        ).map(([Icon, label, sub, target]) => (
          <button
            key={label}
            type="button"
            onClick={target ? () => go(target) : undefined}
            className={cn(glass, "flex flex-1 flex-col items-center gap-1 px-1 py-3")}
          >
            <GlyphBox icon={Icon} />
            <span className="text-[10px] font-extrabold text-[#F1F5F9]">{label}</span>
            <span className="text-[8px] text-[#94A3B8]">{sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/** 42dp surfaceAlt squircle with an accent glyph — optionally a glyph slot. */
const GlyphBox = ({
  icon: Icon,
  slot,
}: {
  icon: ComponentType<{ className?: string }>;
  slot?: string;
}): JSX.Element => (
  <span className="group relative flex h-9 w-9 items-center justify-center rounded-[12px] border border-[#94A3B8]/15 bg-[#1C2438] shadow-[0_0_14px_rgba(5,255,8,0.14)]">
    {slot ? (
      <>
        <SlotGlyph slotKey={slot} className="h-5 w-5" fallback={<Icon className="h-[18px] w-[18px] text-[#05FF08]" />} />
        <EditPencil slotKey={slot} className="-right-1.5 -top-1.5" />
      </>
    ) : (
      <Icon className="h-[18px] w-[18px] text-[#05FF08]" />
    )}
  </span>
);

const QuietTile = ({
  icon,
  label,
  sub,
  onTap,
}: {
  icon: ReactNode;
  label: string;
  sub: string;
  onTap?: () => void;
}): JSX.Element => (
  <button
    type="button"
    onClick={onTap}
    className={cn(glass, "flex min-w-0 flex-1 items-center gap-2.5 p-3 text-left", !onTap && "cursor-default")}
  >
    {icon}
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[11px] font-extrabold text-[#F1F5F9]">{label}</span>
      <span className="block truncate text-[9px] text-[#94A3B8]">{sub}</span>
    </span>
    <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
  </button>
);

const WalletScreen = (): JSX.Element => {
  const { go } = useContext(Ctx);
  return (
    <div className="space-y-3.5 px-4 pb-28 pt-12">
      <AppBar title="Treasure Vault" onBack={() => go("home")} />

      {/* Balance hero: Orbitron balance + chest art contained on the right */}
      <div className={cn(glass, "p-4 shadow-[0_0_24px_rgba(5,255,8,0.18)]")}>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-[#94A3B8]">Available balance</p>
            <p
              className="mt-1 text-[26px] font-bold text-[#F1F5F9] [text-shadow:0_0_18px_rgba(5,255,8,0.35)]"
              style={orbitron}
            >
              ₹12,480
            </p>
            <span className="mt-2 inline-block rounded-full border border-[#94A3B8]/15 bg-[#1C2438] px-2.5 py-1 text-[9px] font-bold text-[#05FF08]">
              LV 3 · Treasure Hunter
            </span>
          </div>
          <SlotBox slotKey="walletChest" fit="contain" className="h-24 w-24 shrink-0 rounded-xl" />
        </div>
        <LevelBar fraction={0.64} className="mt-3" />
        <p className="mt-2 text-[9px] text-[#94A3B8]">Updated just now</p>
      </div>

      {/* Redeem entry */}
      <div className={cn(glass, "p-4")}>
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-bold text-[#F1F5F9]">Redeem coins</p>
          <span className="text-[9px] text-[#94A3B8]" style={orbitron}>
            12,480 / 5,000
          </span>
        </div>
        <LevelBar fraction={1} className="mt-2.5" />
        <button
          type="button"
          className="mt-3 w-full rounded-full py-2.5 text-[11px] font-extrabold text-[#041A06]"
          style={accentGrad}
        >
          Redeem now
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2.5">
        {(
          [
            ["Earned", "15.2K", "#05FF08"],
            ["Spent", "2.7K", "#F87171"],
          ] as const
        ).map(([label, value, color]) => (
          <div key={label} className={cn(glass, "flex flex-1 items-center justify-between px-3.5 py-2.5")}>
            <span className="text-[10px] text-[#94A3B8]">{label}</span>
            <span className="text-[12px] font-bold" style={{ ...orbitron, color }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <SectionHeader
        title="Reward history"
        icon={<ReceiptPercentIcon className="h-4 w-4 text-[#05FF08]" />}
      />
      {(
        [
          ["Daily mission bonus", "+250", true],
          ["Gift card redemption", "-2,000", false],
          ["Treasure Run reward", "+500", true],
        ] as const
      ).map(([title, amount, credit]) => (
        <div key={title} className={cn(glass, "flex items-center gap-3 p-3")}>
          <span className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#94A3B8]/15 bg-[#1C2438]">
            <CoinGlyph size="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold text-[#F1F5F9]">{title}</p>
            <p className="text-[9px] text-[#94A3B8]">Jul 12 · 10:05 AM</p>
          </div>
          <span
            className="text-[12px] font-bold"
            style={{ ...orbitron, color: credit ? "#00C853" : "#F87171" }}
          >
            {amount}
          </span>
        </div>
      ))}
    </div>
  );
};

const ExploreScreen = (): JSX.Element => {
  const { go } = useContext(Ctx);
  return (
    <div className="space-y-3.5 px-4 pb-28 pt-12">
      <AppBar title="Games" onBack={() => go("home")} />

      {/* Treasure Run poster — contained, baked title never cropped */}
      <HeroCard
        slotKey="gamesBanner"
        fit="contain"
        subtitle="Play games, upload proof, earn real rewards"
      />

      {/* Search + sort row */}
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-[14px] border border-[#94A3B8]/15 bg-[#151C2C]/85 px-3 py-2.5">
          <MagnifyingGlassIcon className="h-4 w-4 text-[#64748B]" />
          <span className="text-[11px] text-[#64748B]">Search games…</span>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[#94A3B8]/15 bg-[#151C2C]/85">
          <BoltIcon className="h-4 w-4 text-[#05FF08]" />
        </span>
      </div>

      {/* 2-col offer card skeletons */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className={cn(glass, "overflow-hidden rounded-[18px]")}>
            <div className="flex h-20 items-center justify-center bg-[#1C2438]">
              <PhotoIcon className="h-6 w-6 text-[#64748B]/50" />
            </div>
            <div className="space-y-1.5 p-2.5">
              <SkeletonLine className="h-2.5 w-20" />
              <SkeletonLine className="h-2 w-14" />
              <div className="flex items-center gap-1 pt-1">
                <CoinGlyph size="h-3 w-3" />
                <span className="text-[9px] font-bold text-[#F1F5F9]" style={orbitron}>
                  +{(index + 1) * 150}
                </span>
                <ChevronRightIcon className="ml-auto h-3.5 w-3.5 text-[#05FF08]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RewardsScreen = (): JSX.Element => {
  const { go } = useContext(Ctx);
  return (
    <div className="space-y-3.5 px-4 pb-28 pt-12">
      <AppBar title="Reward history" onBack={() => go("home")} />

      <HeroCard
        slotKey="rewardChest"
        ratio="aspect-[21/9]"
        title="Claim vault"
        subtitle="Every treasure you chased — won, in review, or missed"
      />

      {/* Filter chips */}
      <div className="flex gap-2 overflow-hidden">
        {["All", "Won", "In review", "Missed"].map((label, index) => (
          <span
            key={label}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[10px] font-bold",
              index === 0
                ? "border-transparent text-[#041A06]"
                : "border-[#94A3B8]/15 bg-[#1C2438] text-[#94A3B8]",
            )}
            style={index === 0 ? accentGrad : undefined}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Claim rows */}
      {(
        [
          ["Treasure Run — Level 5", "Won", "#00C853"],
          ["Survey sprint", "In review", "#EAB308"],
          ["Daily streak chest", "Won", "#00C853"],
        ] as const
      ).map(([title, status, color]) => (
        <div key={title} className={cn(glass, "flex items-center gap-3 p-3")}>
          <span className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#94A3B8]/15 bg-[#1C2438]">
            <SlotGlyph
              slotKey="iconTrophy"
              className="h-5 w-5"
              fallback={<TrophyIcon className="h-4 w-4 text-[#05FF08]" />}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold text-[#F1F5F9]">{title}</p>
            <p className="text-[9px] text-[#94A3B8]">Jul 11 · +500 coins</p>
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase"
            style={{ color, border: `1px solid ${color}40` }}
          >
            {status}
          </span>
        </div>
      ))}
    </div>
  );
};

const AlertsScreen = (): JSX.Element => {
  const { go } = useContext(Ctx);
  return (
    <div className="space-y-3.5 px-4 pb-28 pt-12">
      <AppBar title="Alerts" onBack={() => go("home")} />
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className={cn(glass, "flex items-center gap-3 p-3")}>
          <span className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#94A3B8]/15 bg-[#1C2438]">
            <BellIcon className="h-4 w-4 text-[#05FF08]" />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <SkeletonLine className="h-2.5 w-36" />
            <SkeletonLine className="h-2 w-24" />
          </div>
          <span className="text-[9px] text-[#64748B]">2h</span>
        </div>
      ))}
    </div>
  );
};

const ProfileScreen = (): JSX.Element => {
  const { go } = useContext(Ctx);
  return (
    <div className="space-y-3.5 px-4 pb-28 pt-12">
      <AppBar title="Profile" onBack={() => go("home")} />
      <div className={cn(glass, "flex flex-col items-center gap-2 p-5")}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full p-[3px]" style={accentGrad}>
          <span className="flex h-full w-full items-center justify-center rounded-full bg-[#1C2438]">
            <UserIcon className="h-7 w-7 text-[#05FF08]" />
          </span>
        </div>
        <p className="text-[15px] font-bold text-[#F1F5F9]">Player</p>
        <p className="text-[10px] text-[#94A3B8]">player@example.com</p>
      </div>
      {(
        [
          [Cog6ToothIcon, "Settings"],
          [UserPlusIcon, "Share & Earn"],
        ] as const
      ).map(([Icon, label]) => (
        <div key={label} className={cn(glass, "flex items-center gap-3 p-3.5")}>
          <Icon className="h-4 w-4 text-[#05FF08]" />
          <span className="flex-1 text-[11px] font-bold text-[#F1F5F9]">{label}</span>
          <ChevronRightIcon className="h-3.5 w-3.5 text-[#94A3B8]" />
        </div>
      ))}
      <button
        type="button"
        onClick={() => go("login")}
        className={cn(glass, "flex w-full items-center gap-3 p-3.5 text-left")}
      >
        <ChevronLeftIcon className="h-4 w-4 text-[#F87171]" />
        <span className="flex-1 text-[11px] font-bold text-[#F87171]">Sign out</span>
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Bottom dock (AppShell replica) — nav icons are editable glyph slots
// ---------------------------------------------------------------------------

const NavSlot = ({
  slotKey,
  label,
  icon: Icon,
  selected,
  target,
}: {
  slotKey: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  selected: boolean;
  target: ScreenId;
}): JSX.Element => {
  const { go } = useContext(Ctx);
  return (
    <button
      type="button"
      onClick={() => go(target)}
      className="group relative flex flex-1 flex-col items-center justify-center gap-0.5"
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full px-3 py-1.5",
          selected && "shadow-[0_0_16px_rgba(5,255,8,0.4)]",
        )}
        style={selected ? accentGrad : undefined}
      >
        <SlotGlyph
          slotKey={slotKey}
          className="h-[22px] w-[22px]"
          fallback={
            <Icon className={cn("h-[22px] w-[22px]", selected ? "text-[#041A06]" : "text-[#64748B]")} />
          }
        />
      </span>
      <span
        className={cn(
          "h-3 text-[9px] font-extrabold text-[#F1F5F9] transition-opacity",
          selected ? "opacity-100" : "opacity-0",
        )}
      >
        {label}
      </span>
      <EditPencil slotKey={slotKey} className="right-1 top-0" />
    </button>
  );
};

const Dock = ({ screen }: { screen: ScreenId }): JSX.Element => {
  const { go } = useContext(Ctx);
  return (
    <div className="absolute inset-x-3.5 bottom-3 z-20 h-[66px] rounded-[28px] border border-[#94A3B8]/15 bg-[#151C2C]/95 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
      <div className="flex h-full">
        <NavSlot slotKey="navWallet" label="Wallet" icon={WalletIcon} selected={screen === "wallet"} target="wallet" />
        {/* Explore pushes /games — never shows as selected, exactly like the app */}
        <NavSlot slotKey="navExplore" label="Explore" icon={BuildingStorefrontIcon} selected={false} target="explore" />
        {/* Big raised accent Home button */}
        <div className="relative flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={() => go("home")}
            className={cn(
              "group relative -translate-y-4 rounded-full border-[3px] border-[#151C2C] p-0",
              screen === "home"
                ? "shadow-[0_0_26px_rgba(5,255,8,0.55)]"
                : "shadow-[0_0_18px_rgba(5,255,8,0.3)]",
            )}
            style={accentGrad}
          >
            <span className="flex h-[58px] w-[58px] items-center justify-center">
              <SlotGlyph
                slotKey="navHome"
                className="h-[30px] w-[30px]"
                fallback={<HomeIcon className="h-[30px] w-[30px] text-[#041A06]" />}
              />
            </span>
            <EditPencil slotKey="navHome" className="-right-1 -top-1" />
          </button>
        </div>
        <NavSlot slotKey="navAlerts" label="Alerts" icon={BellIcon} selected={screen === "alerts"} target="alerts" />
        <NavSlot slotKey="navProfile" label="Profile" icon={UserIcon} selected={screen === "profile"} target="profile" />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Shared glyph tray (under the frame)
// ---------------------------------------------------------------------------

const SHARED_TRAY: readonly { key: string; fallback: ReactNode }[] = [
  { key: "coin", fallback: <CoinGlyph size="h-7 w-7" /> },
  { key: "gem", fallback: <GemGlyph size="h-5 w-5" /> },
  { key: "iconTrophy", fallback: <TrophyIcon className="h-6 w-6 text-[#05FF08]" /> },
  { key: "iconSpark", fallback: <BoltIcon className="h-6 w-6 text-[#05FF08]" /> },
];

const SharedTray = (): JSX.Element => {
  const { slot, edit } = useContext(Ctx);
  return (
    <div className="mt-5 w-[402px]">
      <p className="mb-2 text-[11px] uppercase tracking-widest text-[#64748B]">
        Shared glyphs — used across screens
      </p>
      <div className="flex gap-3">
        {SHARED_TRAY.map(({ key, fallback }) => {
          const s = slot(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => s && edit(s)}
              className={cn(glass, "group relative flex h-[76px] flex-1 flex-col items-center justify-center gap-1.5")}
              title={s ? `Edit "${s.label}"` : key}
            >
              {s?.imageUrl ? (
                <img src={s.imageUrl} alt={s.label} className="h-7 w-7 object-contain" />
              ) : (
                fallback
              )}
              <span className="max-w-full truncate px-1 text-[9px] font-semibold text-[#94A3B8]">
                {s?.label ?? key}
              </span>
              {s?.imageUrl && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#05FF08]" />
              )}
              <span className="absolute inset-0 flex items-center justify-center rounded-[22px] bg-black/40 opacity-0 transition group-hover:opacity-100">
                <PencilIcon className="h-4 w-4 text-[#05FF08]" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const SCREENS: Record<ScreenId, ComponentType> = {
  login: LoginScreen,
  home: HomeScreen,
  wallet: WalletScreen,
  explore: ExploreScreen,
  rewards: RewardsScreen,
  alerts: AlertsScreen,
  profile: ProfileScreen,
};

export const AppGraphicsPage = (): JSX.Element => {
  const [screen, setScreen] = useState<ScreenId>("login");
  const [selected, setSelected] = useState<AppAssetSlot | null>(null);

  // The app renders Chakra Petch + Orbitron; load them once for the replica.
  useEffect(() => {
    if (document.getElementById("app-gfx-fonts")) return;
    const link = document.createElement("link");
    link.id = "app-gfx-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,400;0,500;0,600;0,700;1,700&family=Orbitron:wght@500;700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  const slots = useQuery({
    queryKey: ["app-assets"],
    queryFn: appAssetsService.listAdmin,
  });

  const ctx = useMemo<ReplicaCtx>(() => {
    const byKey = new Map((slots.data ?? []).map((slot) => [slot.key, slot]));
    return { slot: (key) => byKey.get(key), edit: setSelected, go: setScreen };
  }, [slots.data]);

  const overridden = (slots.data ?? []).filter((slot) => slot.imageUrl);
  const lastChange = overridden
    .map((slot) => slot.updatedAt)
    .filter((value): value is string => !!value)
    .sort()
    .pop();

  const Screen = SCREENS[screen];

  return (
    <div>
      <PageHeader
        title="App Graphics"
        description="A live replica of the app — navigate it like a user, hover any artwork and click to override it. Reverting a slot restores the built-in default."
      />

      {slots.isLoading && (
        <div className="flex justify-center">
          <Skeleton className="h-[844px] w-[402px] rounded-[2.5rem]" />
        </div>
      )}

      {slots.isError && (
        <p className="text-sm text-muted-foreground">Failed to load graphic slots. Try again.</p>
      )}

      {slots.data && (
        <Ctx.Provider value={ctx}>
          <div className="flex flex-col items-center">
            {/* Phone frame */}
            <div className="h-[844px] w-[402px] shrink-0 rounded-[2.5rem] border-[6px] border-zinc-800 bg-black shadow-2xl">
              <div
                className="relative h-full w-full overflow-hidden rounded-[2.1rem]"
                style={{ ...bgGrad, ...chakra }}
              >
                {/* notch */}
                <div className="absolute left-1/2 top-2.5 z-30 h-[24px] w-[110px] -translate-x-1/2 rounded-full bg-black" />
                <div className="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <Screen />
                </div>
                {screen !== "login" && <Dock screen={screen} />}
              </div>
            </div>

            <SharedTray />

            <p className="mt-3 text-xs text-muted-foreground">
              {overridden.length} of {slots.data.length} slots overridden
              {lastChange && ` · last change ${new Date(lastChange).toLocaleString()}`}
            </p>
          </div>
        </Ctx.Provider>
      )}

      <SlotDialog slot={selected} onClose={() => setSelected(null)} />
    </div>
  );
};
