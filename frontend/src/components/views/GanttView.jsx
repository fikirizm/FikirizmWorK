import { useMemo, useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import API from "@/lib/api";
import { useAppData } from "@/context/AppData";
import { AvatarStack } from "@/components/UserAvatar";
import { formatDate } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Plus, CalendarPlus } from "lucide-react";
import { toast } from "sonner";

const DAY = 86400000;
const colW = 34;

const midnightISO = (ms) => {
  const d = new Date(ms);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
};

export function GanttView({ tasks, project, onOpenTask, onNewTask }) {
  const { memberMap } = useAppData();
  const queryClient = useQueryClient();
  const statusMap = Object.fromEntries((project?.statuses || []).map((s) => [s.id, s]));
  const [drag, setDrag] = useState(null); // { id, mode, startX, deltaDays }
  const dragRef = useRef(null);

  const dated = tasks.filter((t) => t.due_date || t.start_date);
  const undated = tasks.filter((t) => !t.due_date && !t.start_date);

  const { start, totalDays, ticks } = useMemo(() => {
    if (!dated.length) {
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const startD = new Date(now.getTime() - 3 * DAY);
      const tk = []; for (let i = 0; i <= 30; i += 7) tk.push(i);
      return { start: startD, totalDays: 30, ticks: tk };
    }
    let min = Infinity, max = -Infinity;
    dated.forEach((t) => {
      const s = new Date(t.start_date || t.due_date).getTime();
      const e = new Date(t.due_date || t.start_date).getTime();
      min = Math.min(min, s, e); max = Math.max(max, s, e);
    });
    const startD = new Date(min - 3 * DAY); startD.setHours(0, 0, 0, 0);
    const days = Math.max(24, Math.ceil((max - startD.getTime()) / DAY) + 6);
    const tk = []; for (let i = 0; i <= days; i += 7) tk.push(i);
    return { start: startD, totalDays: days, ticks: tk };
  }, [tasks]);

  const todayOffset = Math.floor((Date.now() - start.getTime()) / DAY);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks", project.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const assignDates = async (t) => {
    const today = new Date(); today.setHours(12, 0, 0, 0);
    await API.patch(`/tasks/${t.id}`, {
      start_date: today.toISOString(),
      due_date: new Date(today.getTime() + 2 * DAY).toISOString(),
    });
    toast.success("Tarih atandı");
    invalidate();
  };

  const beginDrag = (e, t, mode, offset, span) => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { id: t.id, mode, startX: e.clientX, offset, span, origOffset: offset, origSpan: span };
    setDrag({ id: t.id, mode, deltaDays: 0 });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      const d = dragRef.current; if (!d) return;
      const delta = Math.round((e.clientX - d.startX) / colW);
      dragRef.current.deltaDays = delta;
      setDrag((prev) => (prev ? { ...prev, deltaDays: delta } : prev));
    };
    const onUp = async () => {
      const d = dragRef.current; if (!d) { setDrag(null); return; }
      const delta = d.deltaDays || 0;
      dragRef.current = null; setDrag(null);
      if (!delta) return;
      let newOffset = d.origOffset, newSpan = d.origSpan;
      if (d.mode === "move") newOffset = d.origOffset + delta;
      else if (d.mode === "resize-left") { newOffset = d.origOffset + delta; newSpan = d.origSpan - delta; }
      else if (d.mode === "resize-right") newSpan = d.origSpan + delta;
      if (newSpan < 1) newSpan = 1;
      if (newOffset < 0) newOffset = 0;
      const newStart = start.getTime() + newOffset * DAY;
      const newDue = start.getTime() + (newOffset + newSpan - 1) * DAY;
      try {
        await API.patch(`/tasks/${d.id}`, { start_date: midnightISO(newStart), due_date: midnightISO(newDue) });
        invalidate();
      } catch { toast.error("Güncellenemedi"); }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag?.id, drag?.mode]); // eslint-disable-line

  return (
    <div className="h-full overflow-auto p-6" data-testid="gantt-view">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Çubuğu sürükleyerek taşıyın; kenarlardan tutarak süreyi değiştirin.</p>
        <Button size="sm" onClick={onNewTask} data-testid="gantt-new-task-btn"><Plus className="mr-1.5 h-4 w-4" /> Görev</Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex border-b border-border bg-muted/40">
          <div className="w-56 shrink-0 border-r border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Görev</div>
          <div className="relative overflow-hidden">
            <div className="flex" style={{ width: totalDays * colW }}>
              {ticks.map((t) => (
                <div key={t} className="shrink-0 py-2 text-xs text-muted-foreground tabular-nums" style={{ width: colW * 7 }}>
                  {formatDate(new Date(start.getTime() + t * DAY).toISOString())}
                </div>
              ))}
            </div>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Henüz görev yok. Üstteki “Görev” ile ekleyin.</div>
        ) : (
          tasks.map((t) => {
            const st = statusMap[t.status];
            const assignees = (t.assignees || []).map((id) => memberMap[id]).filter(Boolean);
            const hasDates = !!(t.due_date || t.start_date);
            let offset = 0, span = 1;
            if (hasDates) {
              const s = new Date(t.start_date || t.due_date).getTime();
              const e = new Date(t.due_date || t.start_date).getTime();
              offset = Math.max(0, Math.round((Math.min(s, e) - start.getTime()) / DAY));
              span = Math.max(1, Math.round(Math.abs(e - s) / DAY) + 1);
            }
            const isDragging = drag?.id === t.id;
            if (isDragging) {
              const delta = drag.deltaDays || 0;
              if (drag.mode === "move") offset = Math.max(0, offset + delta);
              else if (drag.mode === "resize-left") { offset = Math.max(0, offset + delta); span = Math.max(1, span - delta); }
              else if (drag.mode === "resize-right") span = Math.max(1, span + delta);
            }
            return (
              <div key={t.id} className="flex items-center border-b border-border last:border-0 hover:bg-muted/40" data-testid={`gantt-row-${t.id}`}>
                <button onClick={() => onOpenTask(t.id)} className="flex w-56 shrink-0 items-center gap-2 border-r border-border px-3 py-2.5 text-left">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: st?.color }} />
                  <span className="truncate text-sm font-medium">{t.title}</span>
                </button>
                <div className="relative py-2.5" style={{ width: totalDays * colW }}>
                  <div className="relative" style={{ width: totalDays * colW, height: 28 }}>
                    {todayOffset >= 0 && todayOffset <= totalDays && (
                      <div className="absolute top-0 h-full w-px bg-primary/50" style={{ left: todayOffset * colW }} />
                    )}
                    {hasDates ? (
                      <div
                        className="group absolute flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-white shadow-sm select-none"
                        style={{ left: offset * colW, width: span * colW, backgroundColor: st?.color || "#5859a3", cursor: isDragging ? "grabbing" : "grab" }}
                        data-testid={`gantt-bar-${t.id}`}
                        onPointerDown={(e) => beginDrag(e, t, "move", offset, span)}
                        onClick={(e) => { if (!drag) onOpenTask(t.id); }}
                      >
                        <span
                          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-md opacity-0 group-hover:opacity-100 bg-black/20"
                          data-testid={`gantt-resize-left-${t.id}`}
                          onPointerDown={(e) => beginDrag(e, t, "resize-left", offset, span)}
                        />
                        {assignees.length > 0 && <AvatarStack users={assignees} size={18} max={2} />}
                        <span
                          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-md opacity-0 group-hover:opacity-100 bg-black/20"
                          data-testid={`gantt-resize-right-${t.id}`}
                          onPointerDown={(e) => beginDrag(e, t, "resize-right", offset, span)}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => assignDates(t)}
                        data-testid={`gantt-assign-date-${t.id}`}
                        className="absolute flex h-7 items-center gap-1 rounded-md border border-dashed border-border px-2 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
                        style={{ left: Math.max(0, todayOffset) * colW }}
                      >
                        <CalendarPlus className="h-3.5 w-3.5" /> Tarih ata
                      </button>
                    )}
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
