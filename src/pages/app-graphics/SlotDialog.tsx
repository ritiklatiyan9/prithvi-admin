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
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ImageUrlField } from "@/pages/hot-offers/ImageUrlField";
import { appAssetsService, type AppAssetSlot } from "@/services/app-assets.service";
import { apiErrorMessage } from "@/services/api-client";

interface SlotDialogProps {
  /** null = closed */
  slot: AppAssetSlot | null;
  onClose: () => void;
}

export const SlotDialog = ({ slot, onClose }: SlotDialogProps): JSX.Element => {
  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = useState("");
  const [confirmRevert, setConfirmRevert] = useState(false);

  useEffect(() => {
    if (slot) setImageUrl(slot.imageUrl ?? "");
  }, [slot]);

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["app-assets"] });
  };

  const save = useMutation({
    mutationFn: () => appAssetsService.setSlot(slot!.key, imageUrl.trim()),
    onSuccess: () => {
      invalidate();
      toast.success("Graphic updated");
      onClose();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const revert = useMutation({
    mutationFn: () => appAssetsService.clearSlot(slot!.key),
    onSuccess: () => {
      invalidate();
      toast.success("Reverted to bundled default");
      setConfirmRevert(false);
      onClose();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <>
      <Dialog open={!!slot} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{slot?.label}</DialogTitle>
            <DialogDescription>{slot?.description}</DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!imageUrl.trim()) {
                toast.error("Upload an image or paste a URL first");
                return;
              }
              save.mutate();
            }}
          >
            <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
              {imageUrl.trim() ? (
                <img
                  src={imageUrl}
                  alt={slot?.label ?? "Preview"}
                  className="h-full w-full object-contain"
                />
              ) : (
                <p className="px-4 text-center text-xs text-muted-foreground">
                  No override set — the app shows its bundled default.
                </p>
              )}
            </div>

            <ImageUrlField label="Override image" value={imageUrl} onChange={setImageUrl} />

            {slot?.updatedAt && (
              <p className="text-xs text-muted-foreground">
                Last set {new Date(slot.updatedAt).toLocaleString()}
                {slot.updatedBy && ` by ${slot.updatedBy}`}
              </p>
            )}

            <DialogFooter>
              {slot?.imageUrl && (
                <Button
                  type="button"
                  variant="destructive"
                  className="sm:mr-auto"
                  onClick={() => setConfirmRevert(true)}
                >
                  Revert to default
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmRevert}
        onOpenChange={setConfirmRevert}
        title="Revert to bundled default?"
        description={`The app will go back to its built-in "${slot?.label ?? ""}" artwork.`}
        confirmLabel="Revert"
        destructive
        loading={revert.isPending}
        onConfirm={() => revert.mutate()}
      />
    </>
  );
};
