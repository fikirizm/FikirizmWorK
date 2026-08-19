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

  const types = Array.from(new Set(acts.map((a) => a.action)));
  const filtered = filter === "all" ? acts : acts.filter((a) => a.action === filter);

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Aktivite Akışı</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Çalışma alanındaki tüm hareketler</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-9 w-52" data-testid="activity-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm hareketler</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Aktivite yok.</p>
        ) : (
          <div className="relative space-y-4 pl-4">
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
            {filtered.map((a) => (
              <div key={a.id} className="relative flex gap-3" data-testid={`activity-row-${a.id}`}>
                <div className="absolute -left-4 mt-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary" />
                <UserAvatar user={{ name: a.user_name }} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    <span className="font-medium">{a.user_name}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>{" "}
                    <span className="font-medium">{a.target}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{relativeTime(a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
