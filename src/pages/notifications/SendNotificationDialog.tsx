import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { notificationsService } from "@/services/notifications.service";
import { adminService } from "@/services/admin.service";
import { apiErrorMessage } from "@/services/api-client";
import { useDebounce } from "@/hooks/useDebounce";
import type { NotificationType, PushAudience } from "@/types/domain";

// Mirrors the backend sendNotificationSchema so validation errors line up.
const formSchema = z
  .object({
    audience: z.enum(["all", "user", "topic"]),
    userId: z.string().optional(),
    topic: z
      .string()
      .regex(/^[a-zA-Z0-9-_.~%]*$/, "Letters, digits and -_.~% only")
      .optional(),
    type: z.enum(["SYSTEM", "CAMPAIGN", "CLAIM", "WALLET"]),
    title: z.string().min(1, "Required").max(120),
    body: z.string().min(1, "Required").max(1000),
    imageUrl: z
      .string()
      .url("Must be a valid URL")
      .startsWith("https://", "Must be an HTTPS URL")
      .max(2048)
      .optional()
      .or(z.literal("")),
    route: z
      .string()
      .regex(/^\/[\w\-/]*$/, "In-app path like /campaigns/123")
      .max(200)
      .optional()
      .or(z.literal("")),
    silent: z.boolean(),
    scheduledAt: z.string().optional(),
  })
  .refine((values) => values.audience !== "user" || Boolean(values.userId), {
    message: "Pick a recipient",
    path: ["userId"],
  })
  .refine((values) => values.audience !== "topic" || Boolean(values.topic), {
    message: "Topic name required",
    path: ["topic"],
  })
  .refine(
    (values) => !values.scheduledAt || new Date(values.scheduledAt).getTime() > Date.now(),
    { message: "Must be in the future", path: ["scheduledAt"] },
  );

type FormValues = z.infer<typeof formSchema>;

/** Suggested deep-link targets that exist in the mobile app's router. */
const KNOWN_ROUTES = ["/notifications", "/wallet", "/rewards", "/campaigns", "/home"];

interface SendNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SendNotificationDialog = ({
  open,
  onOpenChange,
}: SendNotificationDialogProps): JSX.Element => {
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const debouncedSearch = useDebounce(userSearch);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      audience: "all",
      type: "SYSTEM",
      userId: "",
      topic: "",
      title: "",
      body: "",
      imageUrl: "",
      route: "",
      silent: false,
      scheduledAt: "",
    },
  });

  const audience = watch("audience");
  const selectedUserId = watch("userId");
  const selectedType = watch("type");
  const title = watch("title");
  const body = watch("body");
  const imageUrl = watch("imageUrl");
  const silent = watch("silent");
  const scheduledAt = watch("scheduledAt");

  const users = useQuery({
    queryKey: ["admin", "users", "picker", debouncedSearch],
    queryFn: () =>
      adminService.listUsers({ page: 1, limit: 20, search: debouncedSearch.trim() || undefined }),
    enabled: open && audience === "user",
  });

  const send = useMutation({
    mutationFn: (values: FormValues) =>
      notificationsService.send({
        audience: values.audience as PushAudience,
        userId: values.audience === "user" ? values.userId : undefined,
        topic: values.audience === "topic" ? values.topic : undefined,
        type: values.type as NotificationType,
        title: values.title,
        body: values.body,
        imageUrl: values.imageUrl || undefined,
        route: values.route || undefined,
        silent: values.silent || undefined,
        // datetime-local has no timezone — convert to ISO for the API.
        scheduledAt: values.scheduledAt
          ? new Date(values.scheduledAt).toISOString()
          : undefined,
      }),
    onSuccess: (_, values) => {
      toast.success(
        values.scheduledAt
          ? `Scheduled for ${new Date(values.scheduledAt).toLocaleString()}`
          : values.audience === "all"
            ? "Broadcast queued for all users"
            : "Notification sent",
      );
      void queryClient.invalidateQueries({ queryKey: ["notifications", "history"] });
      reset();
      onOpenChange(false);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send notification</DialogTitle>
          <DialogDescription>
            Delivered to the in-app inbox and as a push notification (FCM).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((values) => send.mutate(values))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select
                value={audience}
                onValueChange={(value) =>
                  setValue("audience", value as FormValues["audience"], { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users (broadcast)</SelectItem>
                  <SelectItem value="user">Specific user</SelectItem>
                  <SelectItem value="topic">FCM topic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={selectedType}
                onValueChange={(value) =>
                  setValue("type", value as FormValues["type"], { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SYSTEM">System</SelectItem>
                  <SelectItem value="CAMPAIGN">Campaign</SelectItem>
                  <SelectItem value="CLAIM">Claim</SelectItem>
                  <SelectItem value="WALLET">Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {audience === "user" && (
            <div className="space-y-1.5">
              <Label>Recipient</Label>
              <Input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search users by name or email…"
              />
              <div className="max-h-36 space-y-0.5 overflow-y-auto rounded-md border p-1">
                {users.isLoading ? (
                  <p className="p-2 text-sm text-muted-foreground">Loading…</p>
                ) : users.data && users.data.items.length > 0 ? (
                  users.data.items.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setValue("userId", user.id, { shouldValidate: true })}
                      className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                        selectedUserId === user.id ? "bg-muted font-medium" : ""
                      }`}
                    >
                      <span className="truncate">{user.name}</span>
                      <span className="ml-2 truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="p-2 text-sm text-muted-foreground">No users found</p>
                )}
              </div>
              {errors.userId && <p className="text-xs text-red-500">{errors.userId.message}</p>}
            </div>
          )}

          {audience === "topic" && (
            <div className="space-y-1.5">
              <Label htmlFor="topic">Topic name</Label>
              <Input id="topic" {...register("topic")} placeholder="e.g. beta-testers" />
              <p className="text-xs text-muted-foreground">
                Topic sends deliver push only — no in-app inbox entry is created.
              </p>
              {errors.topic && <p className="text-xs text-red-500">{errors.topic.message}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} placeholder="Heads up!" />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" rows={3} {...register("body")} placeholder="Your message…" />
            {errors.body && <p className="text-xs text-red-500">{errors.body.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="imageUrl">Image URL (optional)</Label>
              <Input id="imageUrl" {...register("imageUrl")} placeholder="https://…" />
              {errors.imageUrl && (
                <p className="text-xs text-red-500">{errors.imageUrl.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="route">Opens screen (optional)</Label>
              <Input id="route" {...register("route")} list="push-routes" placeholder="/campaigns/…" />
              <datalist id="push-routes">
                {KNOWN_ROUTES.map((route) => (
                  <option key={route} value={route} />
                ))}
              </datalist>
              {errors.route && <p className="text-xs text-red-500">{errors.route.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="scheduledAt">Schedule (optional)</Label>
              <Input id="scheduledAt" type="datetime-local" {...register("scheduledAt")} />
              {errors.scheduledAt && (
                <p className="text-xs text-red-500">{errors.scheduledAt.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pb-2">
              <Switch
                id="silent"
                checked={silent}
                onCheckedChange={(checked) => setValue("silent", checked)}
              />
              <Label htmlFor="silent" className="cursor-pointer">
                Silent (data-only)
              </Label>
            </div>
          </div>

          {/* Live device preview */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Device preview</p>
            {silent ? (
              <p className="text-sm italic text-muted-foreground">
                Silent push — nothing is shown on the device and no inbox entry is created.
              </p>
            ) : (
              <div className="rounded-lg border bg-background p-3 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    RH
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {title || "Notification title"}
                    </p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {body || "Notification message…"}
                    </p>
                  </div>
                </div>
                {imageUrl && !errors.imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Notification preview"
                    className="mt-2 max-h-36 w-full rounded-md object-cover"
                    onError={(event) => {
                      // Broken here usually means broken on the device too.
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={send.isPending}>
              {send.isPending
                ? "Sending…"
                : scheduledAt
                  ? "Schedule"
                  : audience === "all"
                    ? "Broadcast to all users"
                    : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
