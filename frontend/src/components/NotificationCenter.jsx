import { useNavigate } from "react-router-dom";
import API from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, UserPlus, MessageSquare, ThumbsUp, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { relativeTime } from "@/lib/constants";

const ICONS = {
  assign: UserPlus, comment: MessageSquare, vote: ThumbsUp, idea: Lightbulb, default: Bell,
};

export function NotificationCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: notes = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await API.get("/notifications")).data,
    refetchInterval: 30000,
  });
  const unread = notes.filter((n) => !n.read).length;

  const markRead = async (id) => {
    await API.post(`/notifications/${id}/read`);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };
  const markAll = async () => {
    await API.post("/notifications/read-all");
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg" data-testid="notifications-btn">
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white" data-testid="notification-badge">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" data-testid="notifications-panel">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-heading text-sm font-semibold">Bildirimler</span>
          {unread > 0 && (
            <button onClick={markAll} className="flex items-center gap-1 text-xs text-primary hover:underline" data-testid="mark-all-read-btn">
              <CheckCheck className="h-3.5 w-3.5" /> Tümünü okundu işaretle
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Henüz bildirim yok</p>
            </div>
          ) : (
            notes.map((n) => {
              const Ico = ICONS[n.type] || ICONS.default;
              return (
                <button
                  key={n.id}
                  data-testid={`notification-${n.id}`}
                  onClick={() => { markRead(n.id); if (n.link) navigate(n.link); }}
                  className={`flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted ${n.read ? "" : "bg-primary/5"}`}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Ico className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{n.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{relativeTime(n.created_at)}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
