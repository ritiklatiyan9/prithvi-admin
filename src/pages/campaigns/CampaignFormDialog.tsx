import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { campaignsService } from "@/services/campaigns.service";
import { apiErrorMessage } from "@/services/api-client";
import { toDateInputValue } from "@/utils/format";
import type { Campaign, CampaignInput } from "@/types/domain";

const formSchema = z
  .object({
    title: z.string().min(3, "At least 3 characters").max(200),
    description: z.string().min(1, "Required").max(5000),
    rewardAmount: z.coerce.number().positive("Must be positive").max(1_000_000),
    budget: z
      .union([z.coerce.number().positive("Must be positive"), z.literal("")])
      .optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
  })
  .refine(
    (values) =>
      !values.startsAt || !values.endsAt || new Date(values.endsAt) > new Date(values.startsAt),
    { message: "End date must be after start date", path: ["endsAt"] },
  );

type FormValues = z.infer<typeof formSchema>;

interface CampaignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null; // null = create
}

export const CampaignFormDialog = ({
  open,
  onOpenChange,
  campaign,
}: CampaignFormDialogProps): JSX.Element => {
  const queryClient = useQueryClient();
  const isEdit = campaign !== null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  useEffect(() => {
    if (open) {
      reset({
        title: campaign?.title ?? "",
        description: campaign?.description ?? "",
        rewardAmount: campaign?.rewardAmount ?? undefined,
        budget: campaign?.budget ?? "",
        startsAt: toDateInputValue(campaign?.startsAt ?? null),
        endsAt: toDateInputValue(campaign?.endsAt ?? null),
      });
    }
  }, [open, campaign, reset]);

  const mutation = useMutation({
    mutationFn: (input: CampaignInput) =>
      isEdit ? campaignsService.update(campaign.id, input) : campaignsService.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success(isEdit ? "Campaign updated" : "Campaign created");
      onOpenChange(false);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const onSubmit = (values: FormValues): void => {
    mutation.mutate({
      title: values.title,
      description: values.description,
      rewardAmount: values.rewardAmount,
      budget: values.budget === "" || values.budget === undefined ? undefined : values.budget,
      startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : undefined,
      endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit campaign" : "New campaign"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the campaign details below."
              : "Campaigns start as drafts — activate them when ready."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} placeholder="Summer referral bonus" />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              {...register("description")}
              placeholder="What users must do to earn the reward…"
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rewardAmount">Reward amount</Label>
              <Input
                id="rewardAmount"
                type="number"
                step="0.01"
                min="0"
                {...register("rewardAmount")}
                placeholder="10.00"
              />
              {errors.rewardAmount && (
                <p className="text-xs text-red-500">{errors.rewardAmount.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget">Budget (optional)</Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                min="0"
                {...register("budget")}
                placeholder="5000.00"
              />
              {errors.budget && <p className="text-xs text-red-500">{errors.budget.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startsAt">Starts (optional)</Label>
              <Input id="startsAt" type="date" {...register("startsAt")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endsAt">Ends (optional)</Label>
              <Input id="endsAt" type="date" {...register("endsAt")} />
              {errors.endsAt && <p className="text-xs text-red-500">{errors.endsAt.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create campaign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
