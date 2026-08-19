import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import API, { formatApiError } from "@/lib/api";
import { useAppData } from "@/context/AppData";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/UserAvatar";
import {
  Settings, User, Bell, Mail, Server, Send, CheckCircle2, Building2, BellOff,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const setBreadcrumb = useBreadcrumb();
  const { user } = useAuth();
  const isPriv = user?.role === "owner" || user?.role === "admin";

  useEffect(() => {
    setBreadcrumb(<span className="flex items-center gap-1.5 font-medium"><Settings className="h-4 w-4" /> Ayarlar</span>);
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-6 py-8 sm:px-8">
      <div>
        <h1 className="font-heading text-3xl font-light tracking-tighter sm:text-4xl">Ayarlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Profil, bildirim ve çalışma alanı ayarlarınızı yönetin.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-5">
        <TabsList data-testid="settings-tabs">
          <TabsTrigger value="profile" data-testid="tab-profile"><User className="mr-1.5 h-4 w-4" /> Profil</TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications"><Bell className="mr-1.5 h-4 w-4" /> Bildirimler</TabsTrigger>
          {isPriv && <TabsTrigger value="mail" data-testid="tab-mail"><Mail className="mr-1.5 h-4 w-4" /> Mail</TabsTrigger>}
          {isPriv && <TabsTrigger value="workspace" data-testid="tab-workspace"><Building2 className="mr-1.5 h-4 w-4" /> Çalışma Alanı</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        {isPriv && <TabsContent value="mail"><MailTab /></TabsContent>}
        {isPriv && <TabsContent value="workspace"><WorkspaceTab /></TabsContent>}
      </Tabs>
    </div>
  );
}

const ROLE_LABELS = { owner: "Sahip", admin: "Yönetici", member: "Üye" };

function Card({ children }) {
  return <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">{children}</div>;
}

function ProfileTab() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setName(user?.name || ""); }, [user]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data } = await API.patch("/profile", { name: name.trim() });
      setUser(data);
      toast.success("Profil güncellendi");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <div className="flex items-center gap-4">
        <UserAvatar user={user} size={56} />
        <div>
          <p className="font-medium">{user?.name}</p>
          <span className="mt-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            {ROLE_LABELS[user?.role] || "Üye"}
          </span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Ad Soyad</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="profile-name-input" />
        </div>
        <div className="space-y-1.5">
          <Label>E-posta</Label>
          <Input value={user?.email || ""} disabled data-testid="profile-email-input" />
        </div>
      </div>
      <Button onClick={save} disabled={saving || !name.trim() || name.trim() === user?.name} data-testid="profile-save-btn">
        {saving ? "Kaydediliyor..." : "Kaydet"}
      </Button>
    </Card>
  );
}

function NotificationsTab() {
  const { allProjects } = useAppData();
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({ queryKey: ["notif-prefs"], queryFn: async () => (await API.get("/settings/notifications")).data });
  useEffect(() => { if (data) setPrefs(data); }, [data]);

  if (!prefs) return <p className="p-4 text-sm text-muted-foreground">Yükleniyor...</p>;

  const setType = (k, v) => setPrefs((p) => ({ ...p, [k]: v }));
  const toggleMute = (pid) => setPrefs((p) => {
    const muted = p.muted_projects || [];
    return { ...p, muted_projects: muted.includes(pid) ? muted.filter((x) => x !== pid) : [...muted, pid] };
  });

  const save = async () => {
    setSaving(true);
    try {
      await API.put("/settings/notifications", prefs);
      toast.success("Bildirim tercihleri kaydedildi");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const rows = [
    { k: "assign", title: "Görev atamaları", desc: "Bir göreve atandığınızda e-posta alın" },
    { k: "budget", title: "Bütçe uyarıları", desc: "Bütçe eşiği aşıldığında e-posta alın" },
    { k: "reminder", title: "Hatırlatmalar", desc: "Günlük ve haftalık görev hatırlatma e-postaları" },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <div className="text-sm font-semibold">E-posta bildirimleri</div>
        {rows.map((r) => (
          <div key={r.k} className="flex items-center justify-between gap-4 border-t border-border pt-3 first:border-0 first:pt-0">
            <div>
              <p className="text-sm font-medium">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </div>
            <Switch checked={!!prefs[r.k]} onCheckedChange={(v) => setType(r.k, v)} data-testid={`notif-${r.k}-switch`} />
          </div>
        ))}
      </Card>

      <Card>
        <div className="flex items-center gap-1.5 text-sm font-semibold"><BellOff className="h-4 w-4" /> Proje bazlı sessize alma</div>
        <p className="text-xs text-muted-foreground">Sessize alınan projelerden atama, bütçe ve hatırlatma e-postası gönderilmez.</p>
        <div className="space-y-1">
          {allProjects.length === 0 && <p className="text-sm text-muted-foreground">Proje yok.</p>}
          {allProjects.map((p) => {
            const muted = (prefs.muted_projects || []).includes(p.id);
            return (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2" data-testid={`notif-project-${p.id}`}>
                <span className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} /> {p.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{muted ? "Sessiz" : "Açık"}</span>
                  <Switch checked={!muted} onCheckedChange={() => toggleMute(p.id)} data-testid={`notif-mute-${p.id}`} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Button onClick={save} disabled={saving} data-testid="notif-save-btn">{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
    </div>
  );
}

function MailTab() {
  const [cfg, setCfg] = useState(null);
  const [testTo, setTestTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const { data } = useQuery({ queryKey: ["email-settings"], queryFn: async () => (await API.get("/settings/email")).data });
  useEffect(() => { if (data) setCfg({ ...data, provider: "smtp", smtp_password: "" }); }, [data]);

  if (!cfg) return <p className="p-4 text-sm text-muted-foreground">Yükleniyor...</p>;
  const up = (k, v) => setCfg((c) => ({ ...c, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...cfg, provider: "smtp" };
      if (!payload.smtp_password) delete payload.smtp_password;
      await API.put("/settings/email", payload);
      toast.success("Mail ayarları kaydedildi");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  const test = async () => {
    if (!testTo) { toast.error("Test için e-posta girin"); return; }
    setTesting(true);
    try { await API.post("/settings/email/test", { to: testTo }); toast.success("Test e-postası gönderildi ✅"); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setTesting(false); }
  };

  return (
    <div className="space-y-5">
      <Card>
        <div>
          <div className="text-sm font-semibold">SMTP / Amazon SES</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Amazon SES için SES SMTP uç noktası, kullanıcı adı ve şifresini kullanın.
          </p>
        </div>
        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm font-medium"><Server className="h-4 w-4" /> SMTP Bilgileri</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5"><Label>SMTP Sunucu</Label>
              <Input value={cfg.smtp_host} onChange={(e) => up("smtp_host", e.target.value)} placeholder="email-smtp.eu-west-1.amazonaws.com" data-testid="smtp-host-input" /></div>
            <div className="space-y-1.5"><Label>Port</Label>
              <Input type="number" value={cfg.smtp_port} onChange={(e) => up("smtp_port", Number(e.target.value))} placeholder="587" data-testid="smtp-port-input" /></div>
            <div className="flex items-center gap-2 pt-6"><Switch checked={cfg.use_tls} onCheckedChange={(v) => up("use_tls", v)} data-testid="smtp-tls-switch" /><span className="text-sm">TLS kullan</span></div>
            <div className="space-y-1.5"><Label>Kullanıcı adı</Label>
              <Input value={cfg.smtp_user} onChange={(e) => up("smtp_user", e.target.value)} placeholder="SES SMTP kullanıcı" data-testid="smtp-user-input" /></div>
            <div className="space-y-1.5"><Label>Parola {data?.has_password && <span className="text-xs text-muted-foreground">(kayıtlı)</span>}</Label>
              <Input type="password" value={cfg.smtp_password} onChange={(e) => up("smtp_password", e.target.value)} placeholder={data?.has_password ? "Değiştirmek için yazın" : "SMTP parola"} data-testid="smtp-pass-input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Gönderen e-posta</Label>
              <Input value={cfg.from_email} onChange={(e) => up("from_email", e.target.value)} placeholder="noreply@sirketiniz.com" data-testid="from-email-input" /></div>
            <div className="space-y-1.5"><Label>Gönderen adı</Label>
              <Input value={cfg.from_name} onChange={(e) => up("from_name", e.target.value)} placeholder="Fikirizm Work" data-testid="from-name-input" /></div>
          </div>
        </div>
        <Button onClick={save} disabled={saving} data-testid="mail-save-btn">{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
      </Card>

      <Card>
        <div className="flex items-center gap-2 text-sm font-medium"><Send className="h-4 w-4" /> Test E-postası Gönder</div>
        <div className="flex gap-2">
          <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="test@ornek.com" data-testid="test-email-input" />
          <Button variant="outline" onClick={test} disabled={testing} data-testid="test-email-btn">
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> {testing ? "Gönderiliyor..." : "Test et"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Mevcut ayarlarla bir test e-postası gönderir.</p>
      </Card>
    </div>
  );
}

function WorkspaceTab() {
  const { org, currentWorkspace } = useAppData();
  const queryClient = useQueryClient();
  const [orgName, setOrgName] = useState("");
  const [wsName, setWsName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setOrgName(org?.name || ""); }, [org]);
  useEffect(() => { setWsName(currentWorkspace?.name || ""); }, [currentWorkspace]);

  const save = async () => {
    setSaving(true);
    try {
      if (orgName.trim() && orgName.trim() !== org?.name) await API.patch("/organization", { name: orgName.trim() });
      if (wsName.trim() && currentWorkspace && wsName.trim() !== currentWorkspace.name)
        await API.patch(`/workspaces/${currentWorkspace.id}`, { name: wsName.trim() });
      await queryClient.refetchQueries({ queryKey: ["bootstrap"] });
      toast.success("Çalışma alanı güncellendi");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Organizasyon adı</Label>
          <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} data-testid="org-name-input" />
        </div>
        <div className="space-y-1.5">
          <Label>Çalışma alanı adı</Label>
          <Input value={wsName} onChange={(e) => setWsName(e.target.value)} data-testid="ws-name-input" />
        </div>
      </div>
      <Button onClick={save} disabled={saving} data-testid="workspace-save-btn">{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
    </Card>
  );
}
