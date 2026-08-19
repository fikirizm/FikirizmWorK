import { useState, useMemo, useEffect } from "react";
import { Reorder } from "framer-motion";
import API from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useAppData } from "@/context/AppData";
import { AvatarStack } from "@/components/UserAvatar";
import { PriorityBadge, StatusDot } from "@/components/Badges";
import { formatDate, isOverdue, doneStatusId } from "@/lib/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { GripVertical, ArrowUpDown, Trash2, X, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ListView({ tasks, project, onOpenTask }) {
  const queryClient = useQueryClient();
  const { memberMap } = useAppData();
  const statuses = project?.statuses || [];
  const statusMap = Object.fromEntries(statuses.map((s) => [s.id, s]));
  const [sortKey, setSortKey] = useState("order");
  const [selected, setSelected] = useState([]);
  const [items, setItems] = useState(tasks);

  useEffect(() => { setItems(tasks); }, [tasks]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks", project.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const sorted = useMemo(() => {
    const arr = [...items];
    if (sortKey === "priority") {
      const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
      arr.sort((a, b) => rank[a.priority] - rank[b.priority]);
    } else if (sortKey === "due") {
      arr.sort((a, b) => (a.due_date || "9").localeCompare(b.due_date || "9"));
    } else if (sortKey === "status") {
      arr.sort((a, b) => a.status.localeCompare(b.status));
    }
    return arr;
  }, [items, sortKey]);

  const persistOrder = async (ordered) => {
    setItems(ordered);
    await Promise.all(ordered.map((t, i) => API.patch(`/tasks/${t.id}`, { order: i })));
  };

  const toggleSel = (id, e) => {
    e?.stopPropagation();
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const bulkStatus = async (status) => {
    await API.post("/tasks/bulk", { ids: selected, updates: { status } });
    setSelected([]); invalidate();
    toast.success("Görevler güncellendi");
  };
  const bulkDelete = async () => {
    await Promise.all(selected.map((id) => API.delete(`/tasks/${id}`)));
    setSelected([]); invalidate();
    toast.success("Görevler silindi");
  };

  const canReorder = sortKey === "order";

  const renderRow = (t) => {
    const assignees = (t.assignees || []).map((id) => memberMap[id]).filter(Boolean);
    const overdue = isOverdue(t.due_date) && t.status !== doneStatusId(statuses);
    const st = statusMap[t.status];
    return (
      <>
        <div className="flex w-8 shrink-0 items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected.includes(t.id)} onCheckedChange={() => setSelected((s) => s.includes(t.id) ? s.filter((x) => x !== t.id) : [...s, t.id])} data-testid={`list-select-${t.id}`} />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {canReorder && <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/40" />}
          <span className="truncate text-sm font-medium">{t.title}</span>
        </div>
        <div className="hidden w-32 shrink-0 sm:block">
          {st && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: st.color }}>
              <StatusDot color={st.color} /> {st.name}
            </span>
          )}
        </div>
        <div className="hidden w-24 shrink-0 md:block"><PriorityBadge priority={t.priority} /></div>
        <div className="hidden w-24 shrink-0 lg:block">
          {t.due_date && <span className={cn("text-xs", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>{formatDate(t.due_date)}</span>}
        </div>
        <div className="w-20 shrink-0">
          {assignees.length > 0 && <AvatarStack users={assignees} size={22} />}
        </div>
      </>
    );
  };

  return (
    <div className="p-6" data-testid="list-view">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={sortKey} onValueChange={setSortKey}>
            <SelectTrigger className="h-8 w-40" data-testid="list-sort-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="order">Manuel sıra</SelectItem>
              <SelectItem value="priority">Önceliğe göre</SelectItem>
              <SelectItem value="due">Son tarihe göre</SelectItem>
              <SelectItem value="status">Duruma göre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 fik-fade-up" data-testid="bulk-toolbar">
          <span className="text-sm font-medium">{selected.length} görev seçildi</span>
          <Select onValueChange={bulkStatus}>
            <SelectTrigger className="h-8 w-40" data-testid="bulk-status-select"><SelectValue placeholder="Durum değiştir" /></SelectTrigger>
            <SelectContent>
              {statuses.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="destructive" onClick={bulkDelete} data-testid="bulk-delete-btn"><Trash2 className="mr-1 h-3.5 w-3.5" /> Sil</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}><X className="h-4 w-4" /></Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <div className="w-8 shrink-0" />
          <div className="flex-1">Görev</div>
          <div className="hidden w-32 shrink-0 sm:block">Durum</div>
          <div className="hidden w-24 shrink-0 md:block">Öncelik</div>
          <div className="hidden w-24 shrink-0 lg:block">Son Tarih</div>
          <div className="w-20 shrink-0">Atanan</div>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <CheckSquare className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Bu filtreye uygun görev yok.</p>
          </div>
        ) : canReorder ? (
          <Reorder.Group axis="y" values={sorted} onReorder={persistOrder}>
            {sorted.map((t) => (
              <Reorder.Item key={t.id} value={t}
                onClick={() => onOpenTask(t.id)}
                className="flex cursor-pointer items-center gap-2 border-b border-border bg-card px-3 py-2.5 last:border-0 hover:bg-muted/50"
                data-testid={`list-row-${t.id}`}>
                {renderRow(t)}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        ) : (
          sorted.map((t) => (
            <div key={t.id} onClick={() => onOpenTask(t.id)}
              className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2.5 last:border-0 hover:bg-muted/50"
              data-testid={`list-row-${t.id}`}>
              {renderRow(t)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
