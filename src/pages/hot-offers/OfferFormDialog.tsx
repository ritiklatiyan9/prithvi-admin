import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hotOffersService } from "@/services/hot-offers.service";
import { apiErrorMessage } from "@/services/api-client";
import type {
  CompletedBehavior,
  ContentStatus,
  HotOffer,
  OfferCategory,
  OfferDifficulty,
} from "@/types/domain";
import { ImageUrlField } from "./ImageUrlField";

/** datetime-local value (local tz, minute precision) from an ISO string. */
const toLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

interface OfferFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: OfferCategory[];
  /** null = create; otherwise the card row — full details are fetched here. */
  offer: HotOffer | null;
  /** App Offers module: force isProduct=true and surface the brand logo first. */
  lockProduct?: boolean;
}

const linesToList = (value: string): string[] =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export const OfferFormDialog = ({
  open,
  onOpenChange,
  categories,
  offer,
  lockProduct = false,
}: OfferFormDialogProps): JSX.Element => {
  const queryClient = useQueryClient();

  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [appName, setAppName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");
  const [instructions, setInstructions] = useState("");
  const [requirements, setRequirements] = useState("");
  const [terms, setTerms] = useState("");
  const [warning, setWarning] = useState("");
  const [rewardAmount, setRewardAmount] = useState(0);
  const [rewardCoins, setRewardCoins] = useState(0);
  const [rewardLabel, setRewardLabel] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [difficulty, setDifficulty] = useState<OfferDifficulty>("EASY");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [rating, setRating] = useState("");
  const [playStoreUrl, setPlayStoreUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [featured, setFeatured] = useState(false);
  const [trending, setTrending] = useState(false);
  const [isProduct, setIsProduct] = useState(false);
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUsers, setMaxUsers] = useState("");
  const [maxRewards, setMaxRewards] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [priority, setPriority] = useState(0);
  const [status, setStatus] = useState<ContentStatus>("DRAFT");
  const [completedBehavior, setCompletedBehavior] = useState<CompletedBehavior>("SHOW");

  const details = useQuery({
    queryKey: ["hot-offers", "offer", offer?.id],
    queryFn: () => hotOffersService.getOffer(offer!.id),
    enabled: open && offer !== null,
  });

  useEffect(() => {
    if (!open) return;
    const d = details.data;
    setCategoryId(d?.category.id ?? offer?.category.id ?? categories[0]?.id ?? "");
    setTitle(d?.title ?? "");
    setAppName(d?.appName ?? "");
    setShortDescription(d?.shortDescription ?? "");
    setDescription(d?.description ?? "");
    setFeatures((d?.features ?? []).join("\n"));
    setInstructions((d?.instructions ?? []).join("\n"));
    setRequirements((d?.requirements ?? []).join("\n"));
    setTerms(d?.terms ?? "");
    setWarning(d?.warning ?? "");
    setRewardAmount(d?.rewardAmount ?? 0);
    setRewardCoins(d?.rewardCoins ?? 0);
    setRewardLabel(d?.rewardLabel ?? "");
    setTaskDescription(d?.taskDescription ?? "");
    setDifficulty(d?.difficulty ?? "EASY");
    setEstimatedTime(d?.estimatedTime ?? "");
    setRating(d?.rating != null ? String(d.rating) : "");
    setPlayStoreUrl(d?.playStoreUrl ?? "");
    setLogoUrl(d?.logoUrl ?? "");
    setThumbnailUrl(d?.thumbnailUrl ?? "");
    setBannerUrl(d?.bannerUrl ?? "");
    setFeatured(d?.featured ?? false);
    setTrending(d?.trending ?? false);
    setIsProduct(lockProduct || (d?.isProduct ?? false));
    setBrandLogoUrl(d?.brandLogoUrl ?? "");
    setExpiresAt(toLocalInput(d?.expiresAt ?? null));
    setMaxUsers(d?.maxUsers != null ? String(d.maxUsers) : "");
    setMaxRewards(d?.maxRewards != null ? String(d.maxRewards) : "");
    setDailyLimit(d?.dailyLimit != null ? String(d.dailyLimit) : "");
    setPriority(d?.priority ?? 0);
    setStatus(d?.status ?? "DRAFT");
    setCompletedBehavior(d?.completedBehavior ?? "SHOW");
  }, [open, offer, categories, details.data, lockProduct]);

  const numOrNull = (value: string): number | null =>
    value.trim() === "" ? null : Number(value);

  const save = useMutation({
    mutationFn: () => {
      const input = {
        categoryId,
        title: title.trim(),
        appName: appName.trim() || null,
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        features: linesToList(features),
        instructions: linesToList(instructions),
        requirements: linesToList(requirements),
        terms: terms.trim() || null,
        warning: warning.trim() || null,
        rewardAmount,
        rewardCoins,
        rewardLabel: rewardLabel.trim() || null,
        taskDescription: taskDescription.trim() || null,
        difficulty,
        estimatedTime: estimatedTime.trim() || null,
        rating: rating.trim() === "" ? null : Number(rating),
        playStoreUrl: playStoreUrl.trim(),
        logoUrl: logoUrl.trim() || null,
        thumbnailUrl: thumbnailUrl.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
        featured,
        trending,
        isProduct: lockProduct || isProduct,
        brandLogoUrl: brandLogoUrl.trim() || null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        maxUsers: numOrNull(maxUsers),
        maxRewards: numOrNull(maxRewards),
        dailyLimit: numOrNull(dailyLimit),
        completedBehavior,
        priority,
        status,
      };
      return offer
        ? hotOffersService.updateOffer(offer.id, input)
        : hotOffersService.createOffer(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hot-offers"] });
      toast.success(offer ? "Offer updated" : "Offer created");
      onOpenChange(false);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const sectionTitle = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{offer ? "Edit offer" : "New offer"}</DialogTitle>
          <DialogDescription>
            One offer powers a website card and its details page, ending at its Play
            Store URL.
          </DialogDescription>
        </DialogHeader>

        {offer && details.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!title.trim() || !shortDescription.trim() || !description.trim()) {
                toast.error("Title and descriptions are required");
                return;
              }
              if (!playStoreUrl.trim().startsWith("https://play.google.com/")) {
                toast.error("Play Store URL must start with https://play.google.com/");
                return;
              }
              save.mutate();
            }}
          >
            <p className={sectionTitle}>Basics</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="of-app">App name</Label>
                <Input id="of-app" value={appName} onChange={(e) => setAppName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="of-title">Title</Label>
              <Input id="of-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="of-short">Card description (short)</Label>
              <Input
                id="of-short"
                maxLength={200}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="of-desc">Full description</Label>
              <Textarea
                id="of-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="of-task">Task (what the user must do to earn)</Label>
              <Textarea
                id="of-task"
                rows={2}
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="e.g. Install and reach level 5 within 3 days"
              />
            </div>

            <p className={sectionTitle}>Media</p>
            {/* lockProduct: brand logo leads — it's the hero asset of app/brand offers */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {lockProduct && (
                <div className="sm:col-span-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
                  <ImageUrlField label="Brand logo" value={brandLogoUrl} onChange={setBrandLogoUrl} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Shown as the brand chip on home cards and the carousel.
                  </p>
                </div>
              )}
              <ImageUrlField label="Logo" value={logoUrl} onChange={setLogoUrl} />
              <ImageUrlField label="Thumbnail (card)" value={thumbnailUrl} onChange={setThumbnailUrl} />
              <ImageUrlField label="Banner (details)" value={bannerUrl} onChange={setBannerUrl} />
              {!lockProduct && (
                <div>
                  <ImageUrlField label="Brand logo" value={brandLogoUrl} onChange={setBrandLogoUrl} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Product offers render in the home carousel with this logo.
                  </p>
                </div>
              )}
            </div>

            <p className={sectionTitle}>Content lists (one item per line)</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="of-features">Features</Label>
                <Textarea
                  id="of-features"
                  rows={4}
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="of-instructions">Instructions</Label>
                <Textarea
                  id="of-instructions"
                  rows={4}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="of-requirements">Requirements</Label>
                <Textarea
                  id="of-requirements"
                  rows={4}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="of-terms">Terms</Label>
                <Textarea id="of-terms" rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="of-warning">Warning</Label>
                <Textarea
                  id="of-warning"
                  rows={2}
                  value={warning}
                  onChange={(e) => setWarning(e.target.value)}
                />
              </div>
            </div>

            <p className={sectionTitle}>Reward & store</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="of-reward">Reward coins (shown on card)</Label>
                <Input
                  id="of-reward"
                  type="number"
                  min={0}
                  step="0.01"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="of-coins">Reward coins (credited)</Label>
                <Input
                  id="of-coins"
                  type="number"
                  min={0}
                  value={rewardCoins}
                  onChange={(e) => setRewardCoins(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="of-reward-label">Reward label</Label>
                <Input
                  id="of-reward-label"
                  value={rewardLabel}
                  onChange={(e) => setRewardLabel(e.target.value)}
                  placeholder="50 coins"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <Select
                  value={difficulty}
                  onValueChange={(value) => setDifficulty(value as OfferDifficulty)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="of-time">Estimated time</Label>
                <Input
                  id="of-time"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  placeholder="10 min"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="of-rating">Rating (0–5)</Label>
                <Input
                  id="of-rating"
                  type="number"
                  min={0}
                  max={5}
                  step="0.1"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                />
              </div>
            </div>

            <p className={sectionTitle}>Limits & availability</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="of-expiry">Offer expiry</Label>
                <Input
                  id="of-expiry"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="of-max-users">Max users</Label>
                <Input
                  id="of-max-users"
                  type="number"
                  min={1}
                  value={maxUsers}
                  onChange={(e) => setMaxUsers(e.target.value)}
                  placeholder="∞"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="of-max-rewards">Max rewards</Label>
                <Input
                  id="of-max-rewards"
                  type="number"
                  min={1}
                  value={maxRewards}
                  onChange={(e) => setMaxRewards(e.target.value)}
                  placeholder="∞"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="of-daily">Daily limit / user</Label>
                <Input
                  id="of-daily"
                  type="number"
                  min={1}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  placeholder="∞"
                />
              </div>
            </div>
            <p className="-mt-1 text-xs text-muted-foreground">
              Caps are stored now and enforced by the fraud/submission guard (Module 4).
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="of-store">Play Store URL</Label>
              <Input
                id="of-store"
                value={playStoreUrl}
                onChange={(e) => setPlayStoreUrl(e.target.value)}
                placeholder="https://play.google.com/store/apps/details?id=com.xyz.app"
              />
            </div>

            <p className={sectionTitle}>Publishing</p>
            <div className="grid grid-cols-3 items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="of-priority">Priority</Label>
                <Input
                  id="of-priority"
                  type="number"
                  min={0}
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as ContentStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4 pb-2">
                <div className="flex items-center gap-2">
                  <Switch id="of-featured" checked={featured} onCheckedChange={setFeatured} />
                  <Label htmlFor="of-featured" className="cursor-pointer">
                    Featured
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="of-trending" checked={trending} onCheckedChange={setTrending} />
                  <Label htmlFor="of-trending" className="cursor-pointer">
                    Trending
                  </Label>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>After a user completes this offer</Label>
              <Select
                value={completedBehavior}
                onValueChange={(value) => setCompletedBehavior(value as CompletedBehavior)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHOW">Keep showing the offer normally</SelectItem>
                  <SelectItem value="HIDE">Hide the offer from them</SelectItem>
                  <SelectItem value="SHOW_COMPLETED">
                    Show with a disabled &quot;Completed&quot; button
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Applies once their proof is approved. Other users are unaffected.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="of-product"
                checked={isProduct}
                onCheckedChange={setIsProduct}
                disabled={lockProduct}
              />
              <Label htmlFor="of-product" className="cursor-pointer">
                Product offer — featured on app home
                {lockProduct && (
                  <span className="ml-1 text-muted-foreground">(always on for App Offers)</span>
                )}
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save offer"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
