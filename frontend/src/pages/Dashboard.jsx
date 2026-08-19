import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import API from "@/lib/api";
import { useAppData } from "@/context/AppData";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/components/layout/AppShell";
import { UserAvatar } from "@/components/UserAvatar";
import { PriorityBadge } from "@/components/Badges";
import { formatDate, relativeTime, isOverdue, avatarColor } from "@/lib/constants";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  CircleDot, AlertTriangle, CalendarClock, CheckCircle2, Activity, Inbox, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

function Metric({ icon: Icon, label, value, tone }) {
  const tones = {
    primary: "text-primary bg-primary/10",
    red: "text-destructive bg-destructive/10",
    amber: "text-amber-500 bg-amber-500/10",
    green: "text-emerald-500 bg-emerald-500/10",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid={`metric-${label}`}>
      <div className="flex items-center justify-between">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <p className="mt-3 font-heading text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const { currentWorkspaceId, currentWorkspace, memberMap, allProjects } = useAppData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumb();

  useEffect(() => {
    setBreadcrumb(<span className="font-medium">Genel Bakış</span>);
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", currentWorkspaceId],
    queryFn: async () => (await API.get(`/dashboard?workspace_id=${currentWorkspaceId}`)).data,
    enabled: !!currentWorkspaceId,
  });

  const projName = (id) => allProjects.find((p) => p.id === id)?.name || "";

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 p-6 md:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}
        <div className="col-span-full h-72 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  const statusColors = { todo: "#71717A", in_progress: "#3B82F6", review: "#F59E0B", done: "#10B981" };
  const statusLabels = { todo: "Yapılacak", in_progress: "Devam Ediyor", review: "İncelemede", done: "Tamamlandı" };
  const pieData = Object.entries(data.status_distribution || {}).map(([k, v]) => ({
    name: statusLabels[k] || k, value: v, color: statusColors[k] || "#6366F1",
  }));
  const workloadData = Object.entries(data.workload || {}).map(([uid, count]) => ({
    name: (memberMap[uid]?.name || "?").split(" ")[0], count, color: avatarColor(memberMap[uid]?.name || uid),
  }));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Merhaba, {user?.name?.split(" ")[0]} 👋</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{currentWorkspace?.name} çalışma alanının genel durumu</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={CircleDot} label="Açık Görev" value={data.open_count} tone="primary" />
        <Metric icon={AlertTriangle} label="Geciken" value={data.overdue_count} tone="red" />
        <Metric icon={CalendarClock} label="Bu Hafta" value={data.upcoming_count} tone="amber" />
        <Metric icon={CheckCircle2} label="Tamamlanan" value={data.done_count} tone="green" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Durum Dağılımı</h3>
          {pieData.length === 0 ? <Empty text="Veri yok" /> : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map((e) => (
                  <div key={e.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} /> {e.name}</span>
                    <span className="font-semibold tabular-nums">{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Kişi Bazlı İş Yükü</h3>
          {workloadData.length === 0 ? <Empty text="Atanmış açık görev yok" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {workloadData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Inbox className="h-4 w-4" /> Bana Atananlar
          </h3>
          <div className="space-y-1">
            {data.my_tasks.length === 0 ? <Empty text="Üstünde harika iş! Sana atanmış açık görev yok." /> : (
              data.my_tasks.map((t) => {
                const overdue = isOverdue(t.due_date) && t.status !== "done";
                return (
                  <button key={t.id} onClick={() => navigate(`/proje/${t.project_id}`)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted" data-testid={`my-task-${t.id}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{projName(t.project_id)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <PriorityBadge priority={t.priority} showLabel={false} />
                      {t.due_date && <span className={cn("text-xs", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>{formatDate(t.due_date)}</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Activity className="h-4 w-4" /> Son Aktiviteler
          </h3>
          <div className="space-y-3">
            {data.recent_activities.length === 0 ? <Empty text="Aktivite yok" /> : (
              data.recent_activities.slice(0, 8).map((a) => (
                <div key={a.id} className="flex gap-2.5" data-testid={`activity-${a.id}`}>
                  <UserAvatar user={{ name: a.user_name }} size={26} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">
                      <span className="font-medium">{a.user_name}</span>{" "}
                      <span className="text-muted-foreground">{a.action}</span>{" "}
                      <span className="font-medium">{a.target}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{relativeTime(a.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>;
}
