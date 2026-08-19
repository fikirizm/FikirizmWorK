import { useState } from "react";
import { useAppData } from "@/context/AppData";
import { PriorityBadge } from "@/components/Badges";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export function CalendarView({ tasks, project, onOpenTask }) {
  const [cursor, setCursor] = useState(new Date());
  const statusMap = Object.fromEntries((project?.statuses || []).map((s) => [s.id, s]));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const tasksByDay = {};
  tasks.forEach((t) => {
    if (!t.due_date) return;
    const dd = new Date(t.due_date);
    if (dd.getFullYear() === year && dd.getMonth() === month) {
      const day = dd.getDate();
      (tasksByDay[day] = tasksByDay[day] || []).push(t);
    }
  });

  const today = new Date();
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="p-6" data-testid="calendar-view">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-heading text-lg font-semibold tabular-nums">{MONTHS[month]} {year}</h3>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor(new Date(year, month - 1, 1))} data-testid="cal-prev"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setCursor(new Date())} data-testid="cal-today">Bugün</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor(new Date(year, month + 1, 1))} data-testid="cal-next"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {DAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => (
            <div key={i} className={cn("min-h-[110px] border-b border-r border-border p-1.5 last:border-r-0", !d && "bg-muted/20")}>
              {d && (
                <>
                  <div className={cn("mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                    isToday(d) ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{d}</div>
                  <div className="space-y-1">
                    {(tasksByDay[d] || []).slice(0, 3).map((t) => {
                      const st = statusMap[t.status];
                      return (
                        <button key={t.id} onClick={() => onOpenTask(t.id)}
                          data-testid={`cal-task-${t.id}`}
                          className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-[11px] font-medium transition-colors hover:opacity-80"
                          style={{ backgroundColor: st ? `${st.color}1f` : "hsl(var(--muted))", color: st?.color }}>
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: st?.color }} />
                          <span className="truncate">{t.title}</span>
                        </button>
                      );
                    })}
                    {(tasksByDay[d] || []).length > 3 && (
                      <span className="px-1.5 text-[10px] text-muted-foreground">+{tasksByDay[d].length - 3} daha</span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
