import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAppData } from "@/context/AppData";
import { useAuth } from "@/context/AuthContext";
import API from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Lightbulb, Users, Plus, ChevronLeft, ChevronRight,
  Zap, Folder, Rocket, Megaphone, Settings, ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ICONS = { Rocket, Megaphone, Settings, Folder };

function ProjectIcon({ icon, color }) {
  const Ico = ICONS[icon] || Folder;
  return <Ico className="h-4 w-4 shrink-0" style={{ color }} />;
}

export function Sidebar({ collapsed, setCollapsed }) {
  const { projects, currentWorkspace, org } = useAppData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const createProject = async () => {
    if (!name.trim() || !currentWorkspace) return;
    setSaving(true);
    try {
      const { data } = await API.post("/projects", {
        workspace_id: currentWorkspace.id, name, description: desc,
      });
      await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      toast.success("Proje oluşturuldu");
      setOpen(false); setName(""); setDesc("");
      navigate(`/proje/${data.id}`);
    } catch {
      toast.error("Proje oluşturulamadı");
    } finally {
      setSaving(false);
    }
  };

  const linkCls = ({ isActive }) =>
    cn(
      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
      data-testid="sidebar"
    >
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-[18px] w-[18px] text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-bold leading-tight tracking-tight">Fikirizm Cloud</p>
            <p className="truncate text-xs text-muted-foreground">{org?.name || "Organizasyon"}</p>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-3 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
              {(currentWorkspace?.name || "W")[0]}
            </div>
            <span className="flex-1 truncate text-sm font-medium">{currentWorkspace?.name || "Çalışma Alanı"}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3">
        <NavLink to="/panel" className={linkCls} data-testid="nav-dashboard">
          <LayoutDashboard className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && "Genel Bakış"}
        </NavLink>
        <NavLink to="/fikirler" className={linkCls} data-testid="nav-ideas">
          <Lightbulb className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && "Fikirler"}
        </NavLink>
        <NavLink to="/uyeler" className={linkCls} data-testid="nav-members">
          <Users className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && "Üyeler"}
        </NavLink>

        <div className="mt-4 mb-1 flex items-center justify-between px-3">
          {!collapsed && (
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projeler</span>
          )}
          {(user?.role === "owner" || user?.role === "admin") && (
            <button
              onClick={() => setOpen(true)}
              data-testid="add-project-btn"
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Proje ekle"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {projects.map((p) => (
          <NavLink key={p.id} to={`/proje/${p.id}`} className={linkCls} data-testid={`nav-project-${p.id}`} title={p.name}>
            <ProjectIcon icon={p.icon} color={p.color} />
            {!collapsed && <span className="truncate">{p.name}</span>}
          </NavLink>
        ))}
        {!collapsed && projects.length === 0 && (
          <p className="px-3 py-2 text-xs text-muted-foreground">Henüz proje yok.</p>
        )}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        data-testid="sidebar-toggle"
        className="flex h-10 items-center justify-center border-t border-border text-muted-foreground hover:bg-muted"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="create-project-dialog">
          <DialogHeader>
            <DialogTitle>Yeni Proje</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Proje adı</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Ürün Geliştirme" data-testid="project-name-input" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Kısa açıklama (opsiyonel)" data-testid="project-desc-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={createProject} disabled={saving || !name.trim()} data-testid="project-save-btn">Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
