import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import API from "@/lib/api";
import { useAppData } from "@/context/AppData";
import { useBreadcrumb } from "@/components/layout/AppShell";
import { KanbanView } from "@/components/views/KanbanView";
import { ListView } from "@/components/views/ListView";
import { CalendarView } from "@/components/views/CalendarView";
import { GanttView } from "@/components/views/GanttView";
import { TaskDrawer } from "@/components/TaskDrawer";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  List, LayoutGrid, Calendar as CalIcon, GanttChartSquare, Plus, ChevronRight, Filter, X,
} from "lucide-react";
import { PRIORITIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const VIEWS = [
  { id: "list", label: "Liste", icon: List },
  { id: "kanban", label: "Pano", icon: LayoutGrid },
  { id: "calendar", label: "Takvim", icon: CalIcon },
  { id: "gantt", label: "Zaman Çizelgesi", icon: GanttChartSquare },
];

export default function ProjectPage() {
  const { projectId } = useParams();
  const { allProjects, members, currentWorkspaceId } = useAppData();
  const setBreadcrumb = useBreadcrumb();
  const project = allProjects.find((p) => p.id === projectId);
  const [view, setView] = useState("kanban");
  const [openTaskId, setOpenTaskId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [fAssignee, setFAssignee] = useState("all");
  const [fPriority, setFPriority] = useState("all");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => (await API.get(`/tasks?project_id=${projectId}`)).data,
    enabled: !!projectId,
  });

  useEffect(() => {
    if (!project) return;
    setBreadcrumb(
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">Projeler</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex items-center gap-1.5 font-medium">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: project.color }} />
          {project.name}
        </span>
      </div>
    );
    return () => setBreadcrumb(null);
  }, [project, setBreadcrumb]);

  const topLevel = tasks.filter((t) => !t.parent_id);
  const filtered = topLevel.filter((t) => {
    if (fAssignee !== "all" && !(t.assignees || []).includes(fAssignee)) return false;
    if (fPriority !== "all" && t.priority !== fPriority) return false;
    return true;
  });

  const hasFilters = fAssignee !== "all" || fPriority !== "all";

  if (!project) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Proje bulunamadı.</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">{project.name}</h1>
          {project.description && <p className="mt-0.5 text-sm text-muted-foreground">{project.description}</p>}
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="new-task-btn"><Plus className="mr-1.5 h-4 w-4" /> Görev</Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-2">
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {VIEWS.map((v) => (
            <button key={v.id} onClick={() => setView(v.id)} data-testid={`view-${v.id}`}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === v.id ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              <v.icon className="h-4 w-4" /> <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={fAssignee} onValueChange={setFAssignee}>
            <SelectTrigger className="h-8 w-36" data-testid="filter-assignee"><SelectValue placeholder="Atanan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm atananlar</SelectItem>
              {members.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fPriority} onValueChange={setFPriority}>
            <SelectTrigger className="h-8 w-32" data-testid="filter-priority"><SelectValue placeholder="Öncelik" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm öncelikler</SelectItem>
              {Object.entries(PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8" onClick={() => { setFAssignee("all"); setFPriority("all"); }} data-testid="clear-filters">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="grid gap-4 p-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : view === "kanban" ? (
          <KanbanView tasks={filtered} project={project} onOpenTask={setOpenTaskId} />
        ) : view === "list" ? (
          <ListView tasks={filtered} project={project} onOpenTask={setOpenTaskId} />
        ) : view === "calendar" ? (
          <CalendarView tasks={filtered} project={project} onOpenTask={setOpenTaskId} />
        ) : (
          <GanttView tasks={filtered} project={project} onOpenTask={setOpenTaskId} />
        )}
      </div>

      <TaskDrawer
        taskId={openTaskId}
        project={project}
        open={!!openTaskId}
        onOpenChange={(v) => !v && setOpenTaskId(null)}
        onDeleted={() => setOpenTaskId(null)}
      />

      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} project={project} workspaceId={currentWorkspaceId} />
    </div>
  );
}

function CreateTaskDialog({ open, onOpenChange, project, workspaceId }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState(project?.statuses?.[0]?.id);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => { if (open) { setTitle(""); setPriority("medium"); setStatus(project?.statuses?.[0]?.id); } }, [open, project]);

  const create = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await API.post("/tasks", { workspace_id: workspaceId, project_id: project.id, title: title.trim(), priority, status });
      queryClient.invalidateQueries({ queryKey: ["tasks", project.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="create-task-dialog">
        <DialogHeader><DialogTitle>Yeni Görev</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Görev başlığı" autoFocus data-testid="create-task-title" onKeyDown={(e) => e.key === "Enter" && create()} />
          <div className="grid grid-cols-2 gap-3">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="create-task-status"><SelectValue /></SelectTrigger>
              <SelectContent>{(project?.statuses || []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger data-testid="create-task-priority"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={create} disabled={saving || !title.trim()} data-testid="create-task-submit">Oluştur</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
