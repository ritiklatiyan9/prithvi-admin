import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PaperAirplaneIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ImageUrlField } from "@/pages/hot-offers/ImageUrlField";
import { notificationsService } from "@/services/notifications.service";
import { adminService } from "@/services/admin.service";
import { apiErrorMessage } from "@/services/api-client";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/utils/cn";
import type { PushAudience } from "@/types/domain";

const TITLE_MAX = 120; // mirrors backend sendNotificationSchema
const BODY_MAX = 1000;
const TOPIC_RE = /^[a-zA-Z0-9-_.~%]{1,900}$/;

const AUDIENCES: { value: PushAudience; label: string }[] = [
  { value: "all", label: "All users" },
  { value: "user", label: "Single user" },
  { value: "topic", label: "Topic" },
];

/** Deep-link targets that exist in the mobile app's router. */
const APP_ROUTES: { value: string; label: string }[] = [
  { value: "/missions", label: "Missions" },
  { value: "/missions/game", label: "Mission game" },
  { value: "/wallet", label: "Wallet" },
  { value: "/hot-offers", label: "Hot offers" },
  { value: "/games", label: "Games" },
  { value: "/redeem", label: "Redeem" },
  { value: "/notifications", label: "Notifications" },
  { value: "/share-earn", label: "Share & earn" },
];

interface PickedUser {
  id: string;
  name: string;
  email: string;
}

const Counter = ({ length, max }: { length: number; max: number }): JSX.Element => (
  <span
    className={cn(
      "text-xs tabular-nums",
      length > max * 0.9 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
    )}
  >
    {length}/{max}
  </span>
);

/** Live Android notification-shade mock, updating as the admin types. */
const AndroidPreview = ({
  title,
  body,
  imageUrl,
  route,
  audienceLine,
}: {
  title: string;
  body: string;
  imageUrl: string;
  route: string;
  audienceLine: string;
}): JSX.Element => (
  <div className="flex h-full flex-col rounded-xl bg-zinc-950 p-4 ring-1 ring-zinc-800">
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
      Android preview
    </p>
    <div className="rounded-2xl bg-zinc-900 p-3.5 shadow-lg ring-1 ring-white/10">
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
          P
        </span>
        <span className="font-medium text-zinc-300">Money Marathon</span>
        <span>· now</span>
      </div>
      <div className="mt-1.5 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-semibold",
              title ? "text-zinc-100" : "text-zinc-600",
            )}
          >
            {title || "Notification title"}
          </p>
          <p
            className={cn(
              "line-clamp-3 text-sm leading-snug",
              body ? "text-zinc-400" : "text-zinc-600",
            )}
          >
            {body || "Your message appears here as you type…"}
          </p>
        </div>
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
            onError={(event) => (event.currentTarget.style.display = "none")}
          />
        )}
      </div>
      {route && (
        <p className="mt-2.5 border-t border-white/10 pt-2 text-xs font-medium text-primary">
          Tap opens {route}
        </p>
      )}
    </div>
    <p className="mt-auto pt-3 text-xs text-zinc-500">{audienceLine}</p>
  </div>
);

/** Top-of-page composer: form on the left, live device preview on the right. */
export const Composer = (): JSX.Element => {
  const queryClient = useQueryClient();

  const [audience, setAudience] = useState<PushAudience>("all");
  const [pickedUser, setPickedUser] = useState<PickedUser | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [route, setRoute] = useState(""); // "" = no deep link
  const [attempted, setAttempted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const debouncedSearch = useDebounce(userSearch);
  const users = useQuery({
    queryKey: ["admin", "users", "picker", debouncedSearch],
    queryFn: () =>
      adminService.listUsers({ page: 1, limit: 8, search: debouncedSearch.trim() || undefined }),
    enabled: audience === "user" && !pickedUser,
  });

  const errors = {
    title: !title.trim() ? "Title is required" : null,
    body: !body.trim() ? "Message is required" : null,
    user: audience === "user" && !pickedUser ? "Pick a recipient" : null,
    topic:
      audience === "topic" && !TOPIC_RE.test(topic)
        ? "Letters, digits and -_.~% only"
        : null,
  };
  const valid = !errors.title && !errors.body && !errors.user && !errors.topic;

  const audienceLine =
    audience === "all"
      ? "Delivers to every active user"
      : audience === "user"
        ? pickedUser
          ? `Delivers only to ${pickedUser.email}`
          : "Delivers to one user — pick a recipient"
        : topic
          ? `Delivers to devices subscribed to "${topic}"`
          : "Delivers to an FCM topic";

  const reset = (): void => {
    setAudience("all");
    setPickedUser(null);
    setUserSearch("");
    setTopic("");
    setTitle("");
    setBody("");
    setImageUrl("");
    setRoute("");
    setAttempted(false);
  };

  const send = useMutation({
    mutationFn: () =>
      notificationsService.send({
        audience,
        userId: audience === "user" ? pickedUser?.id : undefined,
        topic: audience === "topic" ? topic : undefined,
        type: "SYSTEM",
        title: title.trim(),
        body: body.trim(),
        imageUrl: imageUrl || undefined,
        route: route || undefined,
      }),
    onSuccess: () => {
      toast.success(
        audience === "all"
          ? "Broadcast queued — delivering to all users"
          : audience === "user"
            ? `Notification queued for ${pickedUser?.email}`
            : `Notification queued for topic "${topic}"`,
      );
      void queryClient.invalidateQueries({ queryKey: ["notifications", "history"] });
      setConfirmOpen(false);
      reset();
    },
    onError: (error) => {
      setConfirmOpen(false);
      toast.error(apiErrorMessage(error));
    },
  });

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <CardTitle>Compose notification</CardTitle>
        <CardDescription>
          Lands in the Android notification tray and the in-app inbox.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* ---- form ---- */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <div className="inline-flex rounded-lg border bg-muted/60 p-1">
                {AUDIENCES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAudience(option.value)}
                    className={cn(
                      "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                      audience === option.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {audience === "user" &&
              (pickedUser ? (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{pickedUser.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{pickedUser.email}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setPickedUser(null)}
                    title="Change recipient"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="user-search">Recipient</Label>
                  <Input
                    id="user-search"
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Search by email or name…"
                    autoFocus
                  />
                  <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border p-1">
                    {users.isLoading ? (
                      <p className="p-2 text-sm text-muted-foreground">Searching…</p>
                    ) : users.data && users.data.items.length > 0 ? (
                      users.data.items.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => setPickedUser(user)}
                          className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
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
                  {attempted && errors.user && (
                    <p className="text-xs text-red-500">{errors.user}</p>
                  )}
                </div>
              ))}

            {audience === "topic" && (
              <div className="space-y-1.5">
                <Label htmlFor="topic">Topic name</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="e.g. beta-testers"
                />
                <p className="text-xs text-muted-foreground">
                  Push-only — topic sends create no in-app inbox entry.
                </p>
                {attempted && errors.topic && (
                  <p className="text-xs text-red-500">{errors.topic}</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="push-title">Title</Label>
                <Counter length={title.length} max={TITLE_MAX} />
              </div>
              <Input
                id="push-title"
                value={title}
                maxLength={TITLE_MAX}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Heads up!"
              />
              {attempted && errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="push-body">Message</Label>
                <Counter length={body.length} max={BODY_MAX} />
              </div>
              <Textarea
                id="push-body"
                rows={3}
                value={body}
                maxLength={BODY_MAX}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Your message…"
              />
              {attempted && errors.body && <p className="text-xs text-red-500">{errors.body}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Backend requires a hosted https:// URL — the upload button here posts to /uploads. */}
              <ImageUrlField
                label="Image (optional)"
                value={imageUrl}
                onChange={setImageUrl}
              />
              <div className="space-y-1.5">
                <Label>Opens screen (optional)</Label>
                <Select
                  value={route || "none"}
                  onValueChange={(value) => setRoute(value === "none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">App home (default)</SelectItem>
                    {APP_ROUTES.map((appRoute) => (
                      <SelectItem key={appRoute.value} value={appRoute.value}>
                        {appRoute.label}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {appRoute.value}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Where a tap takes the user.</p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                onClick={() => {
                  setAttempted(true);
                  if (valid) setConfirmOpen(true);
                }}
                disabled={send.isPending}
              >
                <PaperAirplaneIcon className="mr-1.5 h-4 w-4" />
                {send.isPending ? "Sending…" : audience === "all" ? "Send to all users" : "Send"}
              </Button>
            </div>
          </div>

          {/* ---- live preview ---- */}
          <AndroidPreview
            title={title}
            body={body}
            imageUrl={imageUrl}
            route={route}
            audienceLine={audienceLine}
          />
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={audience === "all" ? "Broadcast to all users?" : "Send this notification?"}
        confirmLabel={audience === "all" ? "Yes, broadcast" : "Send now"}
        loading={send.isPending}
        onConfirm={() => send.mutate()}
        description={
          <span className="mt-1 block space-y-1 text-left">
            <span className="block font-medium text-foreground">{title.trim()}</span>
            <span className="line-clamp-3 block">{body.trim()}</span>
            <span className="block pt-1">
              To: <span className="font-medium text-foreground">{audienceLine}</span>
            </span>
            {imageUrl && <span className="block">Includes an image</span>}
            {route && <span className="block">Tap opens {route}</span>}
          </span>
        }
      />
    </Card>
  );
};
