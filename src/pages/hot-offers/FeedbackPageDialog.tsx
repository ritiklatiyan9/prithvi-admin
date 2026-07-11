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
import type { ContentStatus, OfferCategory } from "@/types/domain";
import { ImageUrlField } from "./ImageUrlField";

interface FeedbackPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: OfferCategory | null;
}

/** Edits the in-app page a category opens (banner, benefits, CTA to the website). */
export const FeedbackPageDialog = ({
  open,
  onOpenChange,
  category,
}: FeedbackPageDialogProps): JSX.Element => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [benefits, setBenefits] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [rewardPoints, setRewardPoints] = useState(0);
  const [buttonText, setButtonText] = useState("Download");
  const [buttonVisible, setButtonVisible] = useState(true);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [status, setStatus] = useState<ContentStatus>("DRAFT");

  const existing = useQuery({
    queryKey: ["hot-offers", "feedback-page", category?.slug],
    queryFn: () => hotOffersService.getFeedbackPage(category!.slug),
    enabled: open && category !== null,
  });

  useEffect(() => {
    if (!open) return;
    const page = existing.data;
    setTitle(page?.title ?? category?.title ?? "");
    setDescription(page?.description ?? "");
    setBenefits((page?.benefits ?? []).join("\n"));
    setBannerUrl(page?.bannerUrl ?? "");
    setRewardPoints(page?.rewardPoints ?? 0);
    setButtonText(page?.buttonText ?? "Download");
    setButtonVisible(page?.buttonVisible ?? true);
    setWebsiteUrl(page?.websiteUrl ?? "");
    setStatus(page?.status ?? "DRAFT");
  }, [open, category, existing.data]);

  const save = useMutation({
    mutationFn: () =>
      hotOffersService.upsertFeedbackPage(category!.id, {
        title: title.trim(),
        description: description.trim(),
        benefits: benefits
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        bannerUrl: bannerUrl.trim() || null,
        rewardPoints,
        buttonText: buttonText.trim() || "Download",
        buttonVisible,
        websiteUrl: websiteUrl.trim(),
        status,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hot-offers"] });
      toast.success("Feedback page saved");
      onOpenChange(false);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Feedback page — {category?.title}</DialogTitle>
          <DialogDescription>
            What users see in the app when they tap this category. The button opens
            the website URL in the browser.
          </DialogDescription>
        </DialogHeader>

        {existing.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!title.trim() || !description.trim() || !websiteUrl.trim()) {
                toast.error("Title, description and website URL are required");
                return;
              }
              save.mutate();
            }}
          >
            <ImageUrlField label="Banner image" value={bannerUrl} onChange={setBannerUrl} />

            <div className="space-y-1.5">
              <Label htmlFor="fp-title">Title</Label>
              <Input id="fp-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fp-desc">Description</Label>
              <Textarea
                id="fp-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fp-benefits">Benefits (one per line)</Label>
              <Textarea
                id="fp-benefits"
                rows={3}
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                placeholder={"Fresh offers every week\nRewards credited after review"}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fp-points">Reward points</Label>
                <Input
                  id="fp-points"
                  type="number"
                  min={0}
                  value={rewardPoints}
                  onChange={(e) => setRewardPoints(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fp-button">Button text</Label>
                <Input
                  id="fp-button"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fp-url">Website URL (opened by the button)</Label>
              <Input
                id="fp-url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://offers.example.com/"
              />
            </div>

            <div className="grid grid-cols-2 items-end gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as ContentStatus)}
                >
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
              <div className="flex items-center gap-2 pb-2">
                <Switch
                  id="fp-visible"
                  checked={buttonVisible}
                  onCheckedChange={setButtonVisible}
                />
                <Label htmlFor="fp-visible" className="cursor-pointer">
                  Show button
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save page"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
