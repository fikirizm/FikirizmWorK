import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import API from "@/lib/api";
import { useAppData } from "@/context/AppData";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/components/layout/AppShell";
import { PriorityBadge } from "@/components/Badges";
import { formatDate, relativeTime, isOverdue } from "@/lib/constants";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const OPACITY_RAMP = [1, 0.66, 0.44, 0.3, 0.2, 0.14];

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
    refetchInterval: 20000,
  });

  const projName = (id) => allProjects.find((p) => p.id === id)?.name || "";

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-6 sm:p-8">
        <div className="h-14 w-80 animate-pulse rounded-md bg-muted" />
        <div className="h-24 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-72 w-full animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  const metrics = [
    { key: "acik", label: "Açık Görev", value: data.open_count, tone: "" },
    { key: "geciken", label: "Geciken", value: data.overdue_count, tone: "text-rose-600 dark:text-rose-500" },
    { key: "hafta", label: "Bu Hafta", value: data.upcoming_count, tone: "" },
    { key: "tamamlanan", label: "Tamamlanan", value: data.done_count, tone: "text-muted-foreground" },
  ];

  const dist = (data.status_distribution || []).filter((s) => s.value > 0);
  const distTotal = dist.reduce((a, s) => a + s.value, 0) || 1;

  const workload = Object.entries(data.workload || {})
    .map(([uid, count]) => ({ uid, name: memberMap[uid]?.name || "?", count }))
    .sort((a, b) => b.count - a.count);
  const wlMax = Math.max(1, ...workload.map((w) => w.count));

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8 sm:px-8" data-testid="overview-page">
      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex flex-wrap items-end justify-between gap-3 pb-8"
        data-testid="overview-greeting"
      >
        <h1 className="font-heading text-5xl font-light tracking-tighter sm:text-6xl">
          Merhaba, {user?.name?.split(" ")[0]}.
        </h1>
        <div className="pb-1 text-right">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{today}</p>
          <p className="text-sm text-muted-foreground">{currentWorkspace?.name}</p>
        </div>
      </motion.div>

      {/* METRIC TICKER */}
      <div className="grid grid-cols-2 divide-x divide-y divide-border border border-border sm:grid-cols-4 sm:divide-y-0" data-testid="metric-ticker">
        {metrics.map((m, i) => (
          <motion.div
            key={m.key}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 + i * 0.08, duration: 0.3 }}
            className="px-5 py-5"
            data-testid={`metric-ticker-${m.key}`}
          >
            <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{m.label}</p>
            <p className={cn("mt-2 font-mono text-4xl font-light tabular-nums sm:text-5xl", m.tone)}>
              {String(m.value).padStart(2, "0")}
            </p>
          </motion.div>
        ))}
      </div>

      {/* STATUS RIBBON */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.4 }}
        className="border-x border-b border-border px-5 py-5"
        data-testid="status-ribbon"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Durum Dağılımı</p>
          <p className="font-mono text-[10px] text-muted-foreground">{data.total_count} görev</p>
        </div>
        {dist.length === 0 ? <p className="py-4 text-sm text-muted-foreground">Veri yok</p> : (
          <>
            <div className="flex h-4 w-full overflow-hidden rounded-sm bg-muted">
              {dist.map((s, i) => (
                <div
                  key={s.name}
                  className="h-full transition-[width] duration-500"
                  style={{ width: `${(s.value / distTotal) * 100}%`, backgroundColor: "hsl(var(--foreground))", opacity: OPACITY_RAMP[i % OPACITY_RAMP.length] }}
                  title={`${s.name}: ${s.value}`}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
              {dist.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: "hsl(var(--foreground))", opacity: OPACITY_RAMP[i % OPACITY_RAMP.length] }} />
                  <span>{s.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{Math.round((s.value / distTotal) * 100)}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* ASYMMETRIC SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* MY TASKS — left */}
        <div className="border-x border-b border-border lg:col-span-8" data-testid="my-tasks-panel">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Bana Atananlar</p>
            <p className="font-mono text-[10px] text-muted-foreground">{data.my_tasks.length}</p>
          </div>
          {data.my_tasks.length === 0 ? (
            <p className="px-5 py-10 text-sm text-muted-foreground">Üstünde harika iş — sana atanmış açık görev yok.</p>
          ) : (
            <div>
              {data.my_tasks.map((t, i) => {
                const overdue = isOverdue(t.due_date);
                return (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.04 }}
                    onClick={() => navigate(`/proje/${t.project_id}`)}
                    className="group flex w-full items-center gap-3 border-b border-border/60 px-5 py-3 text-left last:border-0 hover:bg-muted/50"
                    data-testid={`task-row-${t.id}`}
                  >
                    <PriorityBadge priority={t.priority} showLabel={false} />
                    <div className="min-w-0 flex-1 transition-transform duration-150 group-hover:translate-x-1">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <span className="mt-0.5 inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {projName(t.project_id)}
                      </span>
                    </div>
                    {t.due_date && (
                      <span className={cn("shrink-0 font-mono text-xs", overdue ? "font-medium text-rose-600 dark:text-rose-500" : "text-muted-foreground")}>
                        {formatDate(t.due_date)}
                      </span>
                    )}
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={1.5} />
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT column: workload + activity terminal */}
        <div className="border-x border-b border-border lg:col-span-4 lg:border-l-0">
          {/* Workload leaderboard */}
          <div className="border-b border-border" data-testid="workload-panel">
            <div className="border-b border-border px-5 py-3">
              <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">İş Yükü</p>
            </div>
            {workload.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Atanmış açık görev yok.</p>
            ) : (
              <div className="space-y-3 px-5 py-4">
                {workload.slice(0, 6).map((w) => (
                  <div key={w.uid} className="flex items-center gap-3" data-testid={`workload-${w.uid}`}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] bg-foreground/90 text-[10px] font-semibold text-background">
                      {(w.name[0] || "?").toUpperCase()}
                    </span>
                    <span className="w-20 shrink-0 truncate text-sm">{w.name.split(" ")[0]}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${(w.count / wlMax) * 100}%` }} />
                    </div>
                    <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">{w.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity terminal */}
          <div data-testid="activity-panel">
            <div className="border-b border-border px-5 py-3">
              <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Son Aktiviteler</p>
            </div>
            {data.recent_activities.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Aktivite yok.</p>
            ) : (
              <div className="relative px-5 py-4">
                <div className="absolute bottom-4 left-[22px] top-4 w-px bg-border" />
                <div className="space-y-3.5">
                  {data.recent_activities.slice(0, 8).map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
                      className="relative flex gap-3"
                      data-testid={`activity-${a.id}`}
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-relaxed">
                          <span className="font-medium">{a.user_name}</span>{" "}
                          <span className="text-muted-foreground">{a.action}</span>{" "}
                          <span className="font-medium">{a.target}</span>
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">{relativeTime(a.created_at)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
