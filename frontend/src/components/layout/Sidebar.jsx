import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAppData } from "@/context/AppData";
import { useAuth } from "@/context/AuthContext";
import API from "@/lib/api";
import { WMark, Logo } from "@/components/WMark";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Lightbulb, Users, Plus, ChevronLeft, ChevronRight,
  Zap, Folder, Rocket, Megaphone, Settings, ChevronsUpDown, Trophy, Tent, Activity, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/UserAvatar";
import { CURRENCIES } from "@/lib/constants";

const ICONS = { Rocket, Megaphone, Settings, Folder, Trophy, Tent };
const TEMPLATE_OPTIONS = [
  { id: "general", label: "Genel Proje" },
  { id: "event", label: "Etkinlik / Yarış" },
  { id: "camp", label: "Kamp" },
];

function ProjectIcon({ icon, color }) {
  const Ico = ICONS[icon] || Folder;
  return <Ico className="h-4 w-4 shrink-0" style={{ color }} />;
}

export function Sidebar({ collapsed, setCollapsed }) {
  const { projects, currentWorkspace, currentWorkspaceId, org, members } = useAppData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [template, setTemplate] = useState("general");
  const [currency, setCurrency] = useState("TRY");
  const [selMembers, setSelMembers] = useState([]);
  const [saving, setSaving] = useState(false);

  const [seen, setSeen] = useState(() => localStorage.getItem("fik_activity_seen") || "");
  useEffect(() => {
    const h = () => setSeen(localStorage.getItem("fik_activity_seen") || "");
    window.addEventListener("activity-seen", h);
    return () => window.removeEventListener("activity-seen", h);
  }, []);
  const { data: acts = [] } = useQuery({
    queryKey: ["activities", currentWorkspaceId],
    queryFn: async () => (await API.get(`/activities?workspace_id=${currentWorkspaceId}`)).data,
    enabled: !!currentWorkspaceId,
    refetchInterval: 20000,
  });
  const activityBadge = acts.filter((a) => a.user_id !== user?.user_id && (!seen || a.created_at > seen)).length;

  const openDialog = () => {
    setName(""); setDesc(""); setTemplate("general"); setCurrency("TRY");
    setSelMembers(members.map((m) => m.user_id));
    setOpen(true);
  };

  const toggleMember = (id) =>
    setSelMembers((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const createProject = async () => {
    if (!name.trim() || !currentWorkspace) return;
    setSaving(true);
    try {
      const { data } = await API.post("/projects", {
        workspace_id: currentWorkspace.id, name, description: desc,
        template, currency, members: selMembers,
      });
      await queryClient.refetchQueries({ queryKey: ["bootstrap"] });
      toast.success("Proje oluşturuldu");
      setOpen(false);
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
        collapsed ? "w-14" : "w-56"
      )}
      data-testid="sidebar"
    >
      <div className="flex h-16 items-center border-b border-border px-3">
        {collapsed ? <WMark size={32} /> : <Logo className="h-11" chip />}
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
        <NavLink to="/aktivite" className={linkCls} data-testid="nav-activity">
          <Activity className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span className="flex-1">Aktivite</span>}
          {activityBadge > 0 && (
            <span
              className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white"
              data-testid="activity-badge"
            >
              {activityBadge > 99 ? "99+" : activityBadge}
            </span>
          )}
        </NavLink>

        <div className="mt-4 mb-1 flex items-center justify-between px-3">
          {!collapsed && (
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projeler</span>
          )}
          {(user?.role === "owner" || user?.role === "admin") && (
            <button
              onClick={openDialog}
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
        <DialogContent className="max-h-[85vh] overflow-y-auto" data-testid="create-project-dialog">
          <DialogHeader>
            <DialogTitle>Yeni Proje</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Proje adı</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Bisiklet Festivali 2026" data-testid="project-name-input" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Kısa açıklama (opsiyonel)" data-testid="project-desc-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Proje türü / şablon</Label>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger data-testid="project-template-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_OPTIONS.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Para birimi</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger data-testid="project-currency-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CURRENCIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Erişecek üyeler</Label>
              <p className="text-xs text-muted-foreground">Owner ve Admin her projeyi görür. Seçtiğiniz üyeler bu projeye erişebilir.</p>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
                {members.map((m) => (
                  <button key={m.user_id} type="button" onClick={() => toggleMember(m.user_id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted" data-testid={`project-member-${m.user_id}`}>
                    <Checkbox checked={selMembers.includes(m.user_id)} />
                    <UserAvatar user={m} size={24} />
                    <span className="flex-1 truncate text-sm">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.role}</span>
                  </button>
                ))}
              </div>
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
