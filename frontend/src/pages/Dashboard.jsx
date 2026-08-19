import { useEffect, useState } from "react";
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
  const [hoverIdx, setHoverIdx] = useState(null);

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
    { key: "acik", label: "Açık Görev", value: data.open_count, tone: "", bar: "bg-foreground" },
    { key: "geciken", label: "Geciken", value: data.overdue_count, tone: "text-rose-600 dark:text-rose-500", bar: "bg-rose-500" },
    { key: "hafta", label: "Bu Hafta", value: data.upcoming_count, tone: "text-amber-600 dark:text-amber-500", bar: "bg-amber-500" },
    { key: "tamamlanan", label: "Tamamlanan", value: data.done_count, tone: "", bar: "bg-emerald-500" },
  ];
  const totalDen = data.total_count || 1;
  const donePct = Math.round((data.done_count / totalDen) * 100);
  const RING_C = 2 * Math.PI * 52;
  const goTasks = () => navigate(`/proje/${data.my_tasks[0]?.project_id || allProjects[0]?.id || ""}`);

  const dist = (data.status_distribution || []).filter((s) => s.value > 0);
  const distTotal = dist.reduce((a, s) => a + s.value, 0) || 1;

  const WAFFLE = 100;
  const waffleCells = [];
  dist.forEach((s, idx) => {
    const n = Math.round((s.value / distTotal) * WAFFLE);
    for (let k = 0; k < n; k++) waffleCells.push(idx);
  });
  waffleCells.length = WAFFLE;
  for (let k = 0; k < WAFFLE; k++) if (waffleCells[k] === undefined) waffleCells[k] = null;

  const workload = Object.entries(data.workload || {})
    .map(([uid, count]) => ({ uid, name: memberMap[uid]?.name || "?", count }))
    .sort((a, b) => b.count - a.count);
  const wlMax = Math.max(1, ...workload.map((w) => w.count));

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8 sm:px-8" data-testid="overview-page">
      {/* HERO COMMAND PANEL */}
      <motion.section
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative mb-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-white"
        data-testid="overview-greeting"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)", backgroundSize: "22px 22px" }} />
        <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(245,158,11,0.22), transparent 70%)" }} />
        <div className="relative flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">{today}</p>
            <h1 className="mt-2 font-heading text-5xl font-light tracking-tighter sm:text-6xl">Merhaba, {user?.name?.split(" ")[0]}.</h1>
            <p className="mt-3 max-w-md text-sm text-zinc-400">
              <span className="text-white">{currentWorkspace?.name}</span> çalışma alanında{" "}
              <span className="font-mono text-white">{data.open_count}</span> açık görev seni bekliyor.
            </p>
            <button onClick={goTasks} data-testid="hero-go-tasks"
              className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400">
              Görevlerime git <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-5">
            <div className="relative h-[120px] w-[120px]">
              <svg width="120" height="120" className="-rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
                <motion.circle
                  cx="60" cy="60" r="52" fill="none" stroke="#F59E0B" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={RING_C}
                  initial={{ strokeDashoffset: RING_C }}
                  animate={{ strokeDashoffset: RING_C * (1 - donePct / 100) }}
                  transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-3xl font-light tabular-nums">{donePct}%</span>
              </div>
            </div>
            <div className="hidden sm:block">
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Tamamlanma</p>
              <p className="mt-1 font-mono text-sm text-zinc-300">{data.done_count}/{data.total_count} görev</p>
              <p className="mt-2 font-mono text-[11px] text-zinc-500">Geciken: <span className="text-rose-400">{data.overdue_count}</span></p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* METRIC TILES */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="metric-ticker">
        {metrics.map((m, i) => (
          <motion.div
            key={m.key}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.07, duration: 0.3 }}
            className="group relative overflow-hidden rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/25"
            data-testid={`metric-ticker-${m.key}`}
          >
            <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{m.label}</p>
            <p className={cn("mt-2 font-mono text-4xl font-light tabular-nums sm:text-5xl", m.tone)}>
              {String(m.value).padStart(2, "0")}
            </p>
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className={cn("h-full rounded-full", m.bar)}
                initial={{ width: 0 }} animate={{ width: `${Math.min(100, (m.value / totalDen) * 100)}%` }}
                transition={{ delay: 0.3 + i * 0.07, duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* STATUS — UNIT / WAFFLE */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.4 }}
        className="mt-3 rounded-lg border border-border p-5"
        data-testid="status-ribbon"
      >
        <div className="mb-5 flex items-center justify-between">
          <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Durum Dağılımı</p>
          <p className="font-mono text-[10px] text-muted-foreground">{data.total_count} görev · {donePct}% tamam</p>
        </div>
        {dist.length === 0 ? <p className="py-4 text-sm text-muted-foreground">Veri yok</p> : (
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
            {/* Unit grid */}
            <div
              className="grid w-full max-w-[440px] shrink-0 gap-[3px]"
              style={{ gridTemplateColumns: "repeat(20, minmax(0, 1fr))" }}
              data-testid="status-waffle"
            >
              {waffleCells.map((c, i) => {
                const active = hoverIdx === null || hoverIdx === c;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35 + i * 0.005, duration: 0.2 }}
                    className="aspect-square rounded-[2px]"
                    style={{
                      backgroundColor: c === null ? "hsl(var(--muted))" : "hsl(var(--foreground))",
                      opacity: c === null ? 1 : (active ? OPACITY_RAMP[c % OPACITY_RAMP.length] : 0.08),
                      transition: "opacity 0.2s ease",
                    }}
                    title={c === null ? "" : `${dist[c].name}: ${dist[c].value}`}
                  />
                );
              })}
            </div>
            {/* Ranked legend */}
            <div className="flex-1 space-y-1">
              {dist.map((s, i) => {
                const pct = Math.round((s.value / distTotal) * 100);
                const active = hoverIdx === null || hoverIdx === i;
                return (
                  <div
                    key={s.name}
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                    className="flex cursor-default items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60"
                    style={{ opacity: active ? 1 : 0.4 }}
                    data-testid={`status-legend-${i}`}
                  >
                    <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ backgroundColor: "hsl(var(--foreground))", opacity: OPACITY_RAMP[i % OPACITY_RAMP.length] }} />
                    <span className="flex-1 truncate text-sm">{s.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{s.value}</span>
                    <span className="w-12 text-right font-mono text-lg font-light tabular-nums">{pct}<span className="text-xs text-muted-foreground">%</span></span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* ASYMMETRIC SPLIT */}
      <div className="mt-3 grid grid-cols-1 overflow-hidden rounded-lg border border-border lg:grid-cols-12">
        {/* MY TASKS — left */}
        <div className="border-b border-border lg:col-span-8 lg:border-b-0 lg:border-r" data-testid="my-tasks-panel">
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
        <div className="lg:col-span-4" data-testid="right-column">
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
