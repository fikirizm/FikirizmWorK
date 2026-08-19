import { useMemo } from "react";
import { useAppData } from "@/context/AppData";
import { AvatarStack } from "@/components/UserAvatar";
import { formatDate } from "@/lib/constants";
import { cn } from "@/lib/utils";

const DAY = 86400000;

export function GanttView({ tasks, project, onOpenTask }) {
  const { memberMap } = useAppData();
  const statusMap = Object.fromEntries((project?.statuses || []).map((s) => [s.id, s]));

  const withDates = tasks.filter((t) => t.due_date || t.start_date);

  const { start, totalDays, ticks } = useMemo(() => {
    if (!withDates.length) {
      const now = new Date();
      return { start: now, totalDays: 30, ticks: [] };
    }
    let min = Infinity, max = -Infinity;
    withDates.forEach((t) => {
      const s = new Date(t.start_date || t.due_date).getTime();
      const e = new Date(t.due_date || t.start_date).getTime();
      min = Math.min(min, s, e);
      max = Math.max(max, s, e);
    });
    const startD = new Date(min - 2 * DAY);
    startD.setHours(0, 0, 0, 0);
    const days = Math.max(20, Math.ceil((max - startD.getTime()) / DAY) + 4);
    const tk = [];
    for (let i = 0; i <= days; i += 7) tk.push(i);
    return { start: startD, totalDays: days, ticks: tk };
  }, [withDates]);

  const colW = 34;
  const todayOffset = Math.floor((Date.now() - start.getTime()) / DAY);

  return (
    <div className="p-6" data-testid="gantt-view">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex border-b border-border bg-muted/40">
          <div className="w-56 shrink-0 border-r border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Görev</div>
          <div className="relative overflow-x-auto">
            <div className="flex" style={{ width: totalDays * colW }}>
              {ticks.map((t) => (
                <div key={t} className="shrink-0 py-2 text-xs text-muted-foreground tabular-nums" style={{ width: colW * 7 }}>
                  {formatDate(new Date(start.getTime() + t * DAY).toISOString())}
                </div>
              ))}
            </div>
          </div>
        </div>

        {withDates.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Tarih atanmış görev yok. Görevlere son tarih ekleyerek zaman çizelgesini görün.</div>
        ) : (
          withDates.map((t) => {
            const s = new Date(t.start_date || t.due_date).getTime();
            const e = new Date(t.due_date || t.start_date).getTime();
            const offset = Math.max(0, Math.floor((Math.min(s, e) - start.getTime()) / DAY));
            const span = Math.max(1, Math.round(Math.abs(e - s) / DAY) + 1);
            const st = statusMap[t.status];
            const assignees = (t.assignees || []).map((id) => memberMap[id]).filter(Boolean);
            return (
              <div key={t.id} className="flex items-center border-b border-border last:border-0 hover:bg-muted/40" data-testid={`gantt-row-${t.id}`}>
                <button onClick={() => onOpenTask(t.id)} className="flex w-56 shrink-0 items-center gap-2 border-r border-border px-3 py-2.5 text-left">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: st?.color }} />
                  <span className="truncate text-sm font-medium">{t.title}</span>
                </button>
                <div className="relative overflow-x-auto py-2.5" style={{ width: "100%" }}>
                  <div className="relative" style={{ width: totalDays * colW, height: 28 }}>
                    {todayOffset >= 0 && todayOffset <= totalDays && (
                      <div className="absolute top-0 h-full w-px bg-primary/50" style={{ left: todayOffset * colW }} />
                    )}
                    <button
                      onClick={() => onOpenTask(t.id)}
                      className="absolute flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-white shadow-sm transition-transform hover:scale-[1.02]"
                      style={{ left: offset * colW, width: span * colW, backgroundColor: st?.color || "#6366F1" }}
                    >
                      {assignees.length > 0 && <AvatarStack users={assignees} size={18} max={2} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
