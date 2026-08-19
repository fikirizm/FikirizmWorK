import { useState, useMemo, useEffect } from "react";
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
import { GripVertical, ArrowUpDown, Trash2, X, CheckSquare, CornerDownRight, ArrowUpLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ListView({ tasks, allTasks = [], project, onOpenTask }) {
  const queryClient = useQueryClient();
  const { memberMap } = useAppData();
  const statuses = project?.statuses || [];
  const statusMap = Object.fromEntries(statuses.map((s) => [s.id, s]));
  const [sortKey, setSortKey] = useState("order");
  const [selected, setSelected] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { id, mode }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks", project.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const subtasksOf = useMemo(() => {
    const map = {};
    allTasks.forEach((t) => {
      if (t.parent_id) (map[t.parent_id] = map[t.parent_id] || []).push(t);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    return map;
  }, [allTasks]);

  const sorted = useMemo(() => {
    const arr = [...tasks];
    if (sortKey === "priority") {
      const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
      arr.sort((a, b) => rank[a.priority] - rank[b.priority]);
    } else if (sortKey === "due") {
      arr.sort((a, b) => (a.due_date || "9").localeCompare(b.due_date || "9"));
    } else if (sortKey === "status") {
      arr.sort((a, b) => a.status.localeCompare(b.status));
    } else {
      arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return arr;
  }, [tasks, sortKey]);

  const canDrag = sortKey === "order";

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

  const promote = async (t, e) => {
    e?.stopPropagation();
    await API.post(`/tasks/${t.id}/promote`);
    toast.success("Ana göreve çıkarıldı");
    invalidate();
  };

  // ----- native drag & drop (nest + reorder) -----
  const onDragStart = (e, t) => {
    if (!canDrag) return;
    setDragId(t.id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e, target) => {
    if (!canDrag || !dragId || dragId === target.id) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const draggedHasSubs = (subtasksOf[dragId] || []).length > 0;
    const targetIsTop = !target.parent_id;
    let mode;
    if (y < rect.height * 0.3) mode = "before";
    else if (y > rect.height * 0.7) mode = "after";
    else mode = targetIsTop && !draggedHasSubs ? "child" : (y < rect.height / 2 ? "before" : "after");
    setDropTarget({ id: target.id, mode });
  };
  const onDragEnd = () => { setDragId(null); setDropTarget(null); };

  const onDrop = async (e, target) => {
    if (!canDrag || !dragId || !dropTarget || dragId === target.id) { onDragEnd(); return; }
    e.preventDefault();
    const dragged = allTasks.find((t) => t.id === dragId);
    const mode = dropTarget.mode;
    onDragEnd();
    if (!dragged) return;
    try {
      if (mode === "child") {
        await API.patch(`/tasks/${dragId}`, { parent_id: target.id });
        toast.success("Alt görev yapıldı");
      } else {
        // reorder into target's sibling group
        const newParent = target.parent_id || null;
        const siblings = (newParent ? subtasksOf[newParent] || [] : sorted).filter((t) => t.id !== dragId);
        const idx = siblings.findIndex((t) => t.id === target.id);
        const insertAt = mode === "after" ? idx + 1 : idx;
        siblings.splice(insertAt, 0, dragged);
        if ((dragged.parent_id || null) !== newParent) {
          if (newParent) await API.patch(`/tasks/${dragId}`, { parent_id: newParent });
          else await API.post(`/tasks/${dragId}/promote`);
        }
        await Promise.all(siblings.map((t, i) => API.patch(`/tasks/${t.id}`, { order: i })));
      }
      invalidate();
    } catch { toast.error("Taşınamadı"); }
  };

  const Row = ({ t, depth }) => {
    const assignees = (t.assignees || []).map((id) => memberMap[id]).filter(Boolean);
    const overdue = isOverdue(t.due_date) && t.status !== doneStatusId(statuses);
    const st = statusMap[t.status];
    const isDropChild = dropTarget?.id === t.id && dropTarget?.mode === "child";
    const showBefore = dropTarget?.id === t.id && dropTarget?.mode === "before";
    const showAfter = dropTarget?.id === t.id && dropTarget?.mode === "after";
    return (
      <div className="relative">
        {showBefore && <div className="absolute left-0 right-0 top-0 z-10 h-0.5 bg-primary" />}
        {showAfter && <div className="absolute bottom-0 left-0 right-0 z-10 h-0.5 bg-primary" />}
        <div
          draggable={canDrag}
          onDragStart={(e) => onDragStart(e, t)}
          onDragOver={(e) => onDragOver(e, t)}
          onDrop={(e) => onDrop(e, t)}
          onDragEnd={onDragEnd}
          onClick={() => onOpenTask(t.id)}
          className={cn(
            "flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2.5 last:border-0 hover:bg-muted/50",
            isDropChild && "bg-primary/10 ring-1 ring-inset ring-primary/40",
            dragId === t.id && "opacity-40"
          )}
          style={{ paddingLeft: depth ? 12 + depth * 24 : undefined }}
          data-testid={`list-row-${t.id}`}
        >
          <div className="flex w-8 shrink-0 items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={selected.includes(t.id)} onCheckedChange={() => setSelected((s) => s.includes(t.id) ? s.filter((x) => x !== t.id) : [...s, t.id])} data-testid={`list-select-${t.id}`} />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {canDrag && <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/40" />}
            {depth > 0 && <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />}
            <span className="truncate text-sm font-medium">{t.title}</span>
            {depth > 0 && (
              <button onClick={(e) => promote(t, e)} title="Ana göreve çıkar" data-testid={`promote-${t.id}`}
                className="ml-1 hidden shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground group-hover:inline-flex">
                <ArrowUpLeft className="h-3.5 w-3.5" />
              </button>
            )}
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
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-auto p-6" data-testid="list-view">
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
          {canDrag && <span className="text-xs text-muted-foreground">Satırı başka görevin üstüne bırakarak alt görev yapın.</span>}
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
        ) : (
          sorted.map((t) => (
            <div key={t.id} className="group">
              <Row t={t} depth={0} />
              {(subtasksOf[t.id] || []).map((s) => (
                <div key={s.id} className="group"><Row t={s} depth={1} /></div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
