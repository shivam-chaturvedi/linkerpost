import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotificationDrawer({
  open,
  onOpenChange,
  onUnreadChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnreadChange: (count: number) => void;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getNotifications();
      setItems(result.notifications);
      onUnreadChange(result.unread_count);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
  }, [open]);

  const openItem = async (item: NotificationRecord) => {
    if (!item.read) {
      try {
        const updated = await markNotificationRead(item.id);
        setItems((prev) => prev.map((row) => (row.id === item.id ? updated : row)));
        onUnreadChange(Math.max(0, items.filter((row) => !row.read && row.id !== item.id).length));
      } catch {
        // Keep the panel usable even if the read call fails.
      }
    }
    onOpenChange(false);
    if (item.kind === "agent_run") {
      void navigate({ to: "/app/library" });
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) =>
        prev.map((item) => ({ ...item, read: true, read_at: item.read_at || new Date().toISOString() })),
      );
      onUnreadChange(0);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-md md:max-w-md"
      >
        <SheetHeader className="border-b px-5 py-4 pr-12 text-left">
          <SheetTitle className="font-display text-lg">Notifications</SheetTitle>
          <SheetDescription>Updates for your account only.</SheetDescription>
        </SheetHeader>
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-xs text-muted-foreground">
            {items.filter((item) => !item.read).length} unread
          </span>
          <button
            type="button"
            onClick={() => void markAll()}
            disabled={markingAll || items.every((item) => item.read)}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs hover:bg-muted disabled:opacity-40"
          >
            {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            Mark all read
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium">No notifications yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Agent completions will show up here when notify is on.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openItem(item)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition hover:bg-muted/60 ${
                    item.read ? "bg-card" : "border-primary/20 bg-primary/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{item.title}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
                    </div>
                    {!item.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">{formatWhen(item.created_at)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
