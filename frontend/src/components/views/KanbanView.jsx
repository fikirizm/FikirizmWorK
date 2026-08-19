import { useState } from "react";
import { motion } from "framer-motion";
import API from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useAppData } from "@/context/AppData";
import { AvatarStack } from "@/components/UserAvatar";
import { PriorityBadge } from "@/components/Badges";
import { formatDate, isOverdue, doneStatusId } from "@/lib/constants";
import { Plus, MessageSquare, ListChecks, CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function TaskCard({ task, onOpen, dragProps, dragging, doneId = "done" }) {
  const { memberMap } = useAppData();
  const assignees = (task.assignees || []).map((id) => memberMap[id]).filter(Boolean);
  const checkTotal = task.checklist?.length || 0;
  const checkDone = (task.checklist || []).filter((c) => c.done).length;
  const overdue = isOverdue(task.due_date) && task.status !== doneId;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onOpen(task.id)}
      {...dragProps}
      data-testid={`task-card-${task.id}`}
      className={cn(
        "cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-md",
        dragging && "rotate-1 scale-105 shadow-xl ring-2 ring-primary/40"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
      </div>
      {task.tags?.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.tags.map((t) => (
            <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{t}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={task.priority} showLabel={false} />
          {checkTotal > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <ListChecks className="h-3 w-3" /> {checkDone}/{checkTotal}
            </span>
          )}
          {task.due_date && (
            <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
              overdue ? "bg-destructive/10 text-destructive" : "text-muted-foreground")}>
              <CalendarClock className="h-3 w-3" /> {formatDate(task.due_date)}
            </span>
          )}
        </div>
        {assignees.length > 0 && <AvatarStack users={assignees} size={22} max={3} />}
      </div>
    </motion.div>
  );
}

export function KanbanView({ tasks, project, onOpenTask }) {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useAppData();
  const statuses = project?.statuses || [];
  const doneId = doneStatusId(statuses);
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [adding, setAdding] = useState(null);
  const [newTitle, setNewTitle] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks", project.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const drop = async (statusId) => {
    setOverCol(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === statusId) return;
    await API.patch(`/tasks/${id}`, { status: statusId });
    invalidate();
  };

  const quickAdd = async (statusId) => {
    if (!newTitle.trim()) { setAdding(null); return; }
    await API.post("/tasks", {
      workspace_id: currentWorkspaceId, project_id: project.id,
      title: newTitle.trim(), status: statusId,
    });
    setNewTitle(""); setAdding(null);
    invalidate();
  };

  return (
    <div className="flex h-full gap-4 overflow-x-auto p-6" data-testid="kanban-board">
      {statuses.map((s) => {
        const colTasks = tasks.filter((t) => t.status === s.id);
        return (
          <div
            key={s.id}
            onDragOver={(e) => { e.preventDefault(); setOverCol(s.id); }}
            onDragLeave={() => setOverCol((c) => (c === s.id ? null : c))}
            onDrop={() => drop(s.id)}
            className={cn(
              "flex w-[300px] shrink-0 flex-col rounded-xl border border-border bg-muted/30 transition-colors",
              overCol === s.id && "border-primary/50 bg-primary/5"
            )}
            data-testid={`kanban-column-${s.id}`}
          >
            <div className="flex items-center justify-between px-3 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                <span className="text-sm font-semibold">{s.name}</span>
                <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{colTasks.length}</span>
              </div>
              <button onClick={() => setAdding(s.id)} className="text-muted-foreground hover:text-foreground" data-testid={`kanban-add-${s.id}`}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
              {colTasks.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onOpen={onOpenTask}
                  doneId={doneId}
                  dragging={dragId === t.id}
                  dragProps={{
                    draggable: true,
                    onDragStart: () => setDragId(t.id),
                    onDragEnd: () => setDragId(null),
                  }}
                />
              ))}
              {adding === s.id && (
                <Input
                  autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={() => quickAdd(s.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") quickAdd(s.id); if (e.key === "Escape") setAdding(null); }}
                  placeholder="Görev başlığı..." className="h-9 bg-card" data-testid={`kanban-quickadd-input-${s.id}`}
                />
              )}
              {colTasks.length === 0 && adding !== s.id && (
                <button onClick={() => setAdding(s.id)} className="rounded-lg border border-dashed border-border py-6 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground">
                  + Görev ekle
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
