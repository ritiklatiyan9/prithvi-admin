import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiErrorMessage } from "@/services/api-client";
import { settingsService } from "@/services/settings.service";
import { useAuthStore } from "@/store/auth.store";

const KEYS = {
  enabled: "coinPurchase.enabled",
  price: "coinPurchase.packPriceRupees",
  coins: "coinPurchase.coinsPerPack",
  maxPacks: "coinPurchase.maxPacks",
  razorpayKeyId: "payment.razorpay.keyId",
  razorpayKeySecret: "payment.razorpay.keySecret",
} as const;

type Values = {
  enabled: boolean;
  price: string;
  coins: string;
  maxPacks: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
};

const defaults: Values = {
  enabled: false,
  price: "10",
  coins: "100",
  maxPacks: "10",
  razorpayKeyId: "",
  razorpayKeySecret: "",
};

export const CoinPurchaseSettings = (): JSX.Element => {
  const canEdit = useAuthStore((state) => state.user?.role === "SUPER_ADMIN");
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.list,
  });
  const [values, setValues] = useState<Values>(defaults);

  const persisted = useMemo<Values>(() => {
    const find = (key: string, fallback: string) =>
      settings?.find((setting) => setting.key === key)?.value ?? fallback;
    return {
      enabled: find(KEYS.enabled, "false") === "true",
      price: find(KEYS.price, defaults.price),
      coins: find(KEYS.coins, defaults.coins),
      maxPacks: find(KEYS.maxPacks, defaults.maxPacks),
      razorpayKeyId: find(KEYS.razorpayKeyId, ""),
      razorpayKeySecret: "",
    };
  }, [settings]);

  const razorpaySecretConfigured = useMemo(() => {
    return (
      settings?.find((setting) => setting.key === KEYS.razorpayKeySecret)
        ?.hasValue ?? false
    );
  }, [settings]);

  useEffect(() => setValues(persisted), [persisted]);

  const dirty = JSON.stringify(values) !== JSON.stringify(persisted);
  const price = Number(values.price);
  const coins = Number(values.coins);
  const maxPacks = Number(values.maxPacks);
  const valid =
    Number.isInteger(price) &&
    price >= 1 &&
    Number.isInteger(coins) &&
    coins >= 1 &&
    Number.isInteger(maxPacks) &&
    maxPacks >= 1 &&
    maxPacks <= 100;
  const examples = [1, 2, 5].filter((quantity) => quantity <= maxPacks);

  const save = useMutation({
    mutationFn: () =>
      settingsService.update({
        [KEYS.enabled]: String(values.enabled),
        [KEYS.price]: values.price,
        [KEYS.coins]: values.coins,
        [KEYS.maxPacks]: values.maxPacks,
        [KEYS.razorpayKeyId]: values.razorpayKeyId,
        [KEYS.razorpayKeySecret]: values.razorpayKeySecret,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Add Coins settings saved");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  if (isLoading) {
    return <div className="h-56 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/25">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Add Coins with Razorpay</CardTitle>
              <CardDescription className="mt-1">
                Set the exact rupee-to-coin package used by the wallet checkout.
              </CardDescription>
            </div>
            <Badge variant={values.enabled ? "success" : "secondary"}>
              {values.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Allow coin purchases</p>
              <p className="text-sm text-muted-foreground">
                The app shows Add Coins only when this is enabled and Razorpay
                credentials are set.
              </p>
            </div>
            <Switch
              checked={values.enabled}
              disabled={!canEdit}
              onCheckedChange={(enabled) =>
                setValues((current) => ({ ...current, enabled }))
              }
            />
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <div>
              <p className="text-sm font-medium">Razorpay credentials</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Used for Add Coins and membership checkout. Leave blank to use
                environment values.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="razorpay-key-id">Razorpay Key ID</Label>
                <Input
                  id="razorpay-key-id"
                  value={values.razorpayKeyId}
                  disabled={!canEdit}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      razorpayKeyId: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="razorpay-key-secret">Razorpay Key Secret</Label>
                <Input
                  id="razorpay-key-secret"
                  type="password"
                  autoComplete="new-password"
                  value={values.razorpayKeySecret}
                  disabled={!canEdit}
                  placeholder={
                    razorpaySecretConfigured
                      ? "•••••••• configured ••••••••"
                      : "Enter secret"
                  }
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      razorpayKeySecret: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to keep the existing secret on the server.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="coin-pack-price">Money per package (₹)</Label>
              <Input
                id="coin-pack-price"
                type="number"
                min={1}
                step={1}
                value={values.price}
                disabled={!canEdit}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Whole rupees charged by Razorpay.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coin-pack-coins">Coins per package</Label>
              <Input
                id="coin-pack-coins"
                type="number"
                min={1}
                step={1}
                value={values.coins}
                disabled={!canEdit}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    coins: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Credited only after server verification.
              </p>
            </div>
          </div>

          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="coin-max-packs">Maximum packages per payment</Label>
            <Input
              id="coin-max-packs"
              type="number"
              min={1}
              max={100}
              step={1}
              value={values.maxPacks}
              disabled={!canEdit}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  maxPacks: event.target.value,
                }))
              }
            />
          </div>

          {valid && (
            <div className="rounded-xl border bg-emerald-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Customer preview
              </p>
              <p className="mt-1 text-lg font-semibold">
                ₹{price.toLocaleString("en-IN")} ={" "}
                {coins.toLocaleString("en-IN")} coins
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {examples.map((quantity) => (
                  <span
                    key={quantity}
                    className="rounded-full border bg-background px-3 py-1 text-xs"
                  >
                    ₹{(price * quantity).toLocaleString("en-IN")} ·{" "}
                    {(coins * quantity).toLocaleString("en-IN")} coins
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            <p className="max-w-md text-xs text-muted-foreground">
              Secrets are stored server-side and never returned by the settings
              API.
            </p>
            {canEdit && (
              <Button
                onClick={() => save.mutate()}
                disabled={!dirty || !valid || save.isPending}
              >
                {save.isPending ? "Saving…" : "Save Add Coins"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
