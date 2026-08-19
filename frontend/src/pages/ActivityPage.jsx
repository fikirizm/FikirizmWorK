import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import API from "@/lib/api";
import { useAppData } from "@/context/AppData";
import { useBreadcrumb } from "@/components/layout/AppShell";
import { UserAvatar } from "@/components/UserAvatar";
import { relativeTime } from "@/lib/constants";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Activity as ActivityIcon } from "lucide-react";

export default function ActivityPage() {
  const { currentWorkspaceId } = useAppData();
  const setBreadcrumb = useBreadcrumb();
  const [filter, setFilter] = useState("all");
  const [time, setTime] = useState("all");

  useEffect(() => {
    setBreadcrumb(<span className="flex items-center gap-1.5 font-medium"><ActivityIcon className="h-4 w-4" /> Aktivite Akışı</span>);
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  const { data: acts = [] } = useQuery({
    queryKey: ["activities", currentWorkspaceId],
    queryFn: async () => (await API.get(`/activities?workspace_id=${currentWorkspaceId}`)).data,
    enabled: !!currentWorkspaceId,
    refetchInterval: 20000,
  });

  useEffect(() => {
    if (acts.length) {
      localStorage.setItem("fik_activity_seen", acts[0].created_at);
      window.dispatchEvent(new Event("activity-seen"));
    }
  }, [acts]);

  const types = Array.from(new Set(acts.map((a) => a.action)));
  const inTime = (a) => {
    if (time === "all") return true;
    const t = new Date(a.created_at).getTime();
    if (time === "today") { const d = new Date(); d.setHours(0, 0, 0, 0); return t >= d.getTime(); }
    if (time === "week") return t >= Date.now() - 7 * 864e5;
    if (time === "month") return t >= Date.now() - 30 * 864e5;
    return true;
  };
  const filtered = acts.filter((a) => (filter === "all" || a.action === filter) && inTime(a));

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-6 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-light tracking-tighter sm:text-4xl">Aktivite Akışı</h1>
          <p className="mt-1 text-sm text-muted-foreground">Çalışma alanındaki tüm hareketler</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={time} onValueChange={setTime}>
            <SelectTrigger className="h-9 w-36" data-testid="activity-time-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm zamanlar</SelectItem>
              <SelectItem value="today">Bugün</SelectItem>
              <SelectItem value="week">Son 7 gün</SelectItem>
              <SelectItem value="month">Son 30 gün</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-9 w-48" data-testid="activity-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm hareketler</SelectItem>
              {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="w-full rounded-xl border border-border bg-card px-5 py-2">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Aktivite yok.</p>
        ) : (
          <div>
            {filtered.map((a) => (
              <div key={a.id} className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0" data-testid={`activity-row-${a.id}`}>
                <span className="h-1.5 w-1.5 shrink-0 bg-foreground" />
                <UserAvatar user={{ name: a.user_name }} size={30} />
                <p className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-medium">{a.user_name}</span>{" "}
                  <span className="text-muted-foreground">{a.action}</span>{" "}
                  <span className="font-medium">{a.target}</span>
                </p>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{relativeTime(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
