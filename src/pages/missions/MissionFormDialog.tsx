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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { missionsService, type Mission, type MissionInput } from "@/services/missions.service";
import { apiErrorMessage } from "@/services/api-client";
import type { ContentStatus } from "@/types/domain";

const formSchema = z.object({
  title: z.string().min(1, "Required").max(200),
  description: z.string().min(1, "Required").max(5000),
  rewardCoins: z.coerce.number().min(0, "Must be 0 or more").max(1_000_000),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  sortOrder: z.coerce.number().int("Whole number"),
});

type FormValues = z.infer<typeof formSchema>;

interface MissionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mission: Mission | null; // null = create
}

export const MissionFormDialog = ({
  open,
  onOpenChange,
  mission,
}: MissionFormDialogProps): JSX.Element => {
  const queryClient = useQueryClient();
  const isEdit = mission !== null;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  useEffect(() => {
    if (open) {
      reset({
        title: mission?.title ?? "",
        description: mission?.description ?? "",
        rewardCoins: mission?.rewardCoins ?? undefined,
        status: mission?.status ?? "DRAFT",
        sortOrder: mission?.sortOrder ?? 0,
      });
    }
  }, [open, mission, reset]);

  const mutation = useMutation({
    mutationFn: (input: MissionInput) =>
      isEdit ? missionsService.update(mission.id, input) : missionsService.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["missions"] });
      toast.success(isEdit ? "Mission updated" : "Mission created");
      onOpenChange(false);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit mission" : "New mission"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the mission details below."
              : "Only PUBLISHED missions are visible in the app."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} placeholder="Follow us on Instagram" />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              {...register("description")}
              placeholder="What the user must do to complete the mission…"
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rewardCoins">Reward coins</Label>
              <Input
                id="rewardCoins"
                type="number"
                step="0.01"
                min="0"
                {...register("rewardCoins")}
                placeholder="50"
              />
              {errors.rewardCoins && (
                <p className="text-xs text-red-500">{errors.rewardCoins.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sortOrder">Sort order</Label>
              <Input id="sortOrder" type="number" step="1" {...register("sortOrder")} />
              {errors.sortOrder && (
                <p className="text-xs text-red-500">{errors.sortOrder.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={watch("status")}
              onValueChange={(value) => setValue("status", value as ContentStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create mission"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
