import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create */
  category: OfferCategory | null;
}

export const CategoryFormDialog = ({
  open,
  onOpenChange,
  category,
}: CategoryFormDialogProps): JSX.Element => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [priority, setPriority] = useState(0);
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<ContentStatus>("DRAFT");

  useEffect(() => {
    if (!open) return;
    setTitle(category?.title ?? "");
    setSubtitle(category?.subtitle ?? "");
    setImageUrl(category?.imageUrl ?? "");
    setPriority(category?.priority ?? 0);
    setFeatured(category?.featured ?? false);
    setStatus(category?.status ?? "DRAFT");
  }, [open, category]);

  const save = useMutation({
    mutationFn: () => {
      const input = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        imageUrl: imageUrl.trim() || null,
        priority,
        featured,
        status,
      };
      return category
        ? hotOffersService.updateCategory(category.id, input)
        : hotOffersService.createCategory(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hot-offers"] });
      toast.success(category ? "Category updated" : "Category created");
      onOpenChange(false);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>
            Categories are the tiles on the app's Hot Offers screen.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) {
              toast.error("Title is required");
              return;
            }
            save.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="cat-title">Title</Label>
            <Input
              id="cat-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Reward Zone"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat-subtitle">Subtitle</Label>
            <Input
              id="cat-subtitle"
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              placeholder="Test apps, share feedback, earn rewards"
            />
          </div>

          <ImageUrlField label="Image" value={imageUrl} onChange={setImageUrl} />

          <div className="grid grid-cols-3 items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-priority">Priority</Label>
              <Input
                id="cat-priority"
                type="number"
                min={0}
                value={priority}
                onChange={(event) => setPriority(Number(event.target.value))}
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
            <div className="flex items-center gap-2 pb-2">
              <Switch id="cat-featured" checked={featured} onCheckedChange={setFeatured} />
              <Label htmlFor="cat-featured" className="cursor-pointer">
                Featured
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
