import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import API from "@/lib/api";
import { useAppData } from "@/context/AppData";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/components/layout/AppShell";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UserPlus, Users, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

const ROLE_META = {
  owner: { label: "Sahip", color: "#18181B" },
  admin: { label: "Yönetici", color: "#52525B" },
  member: { label: "Üye", color: "#A1A1AA" },
};

export default function MembersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const setBreadcrumb = useBreadcrumb();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setBreadcrumb(<span className="flex items-center gap-1.5 font-medium"><Users className="h-4 w-4" /> Üyeler</span>);
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: async () => (await API.get("/members")).data,
  });

  const canInvite = user?.role === "owner" || user?.role === "admin";

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["members"] });
    queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
  };
  const changeRole = async (id, role) => {
    try { await API.patch(`/members/${id}`, { role }); toast.success("Rol güncellendi"); refresh(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const removeMember = async (id) => {
    try { await API.delete(`/members/${id}`); toast.success("Üye çıkarıldı"); refresh(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const resend = async (id) => {
    try { await API.post(`/members/${id}/resend-invite`); toast.success("Davet yeniden gönderildi"); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Ekip Üyeleri</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{members.length} üye bu çalışma alanında</p>
        </div>
        {canInvite && <Button onClick={() => setOpen(true)} data-testid="invite-member-btn"><UserPlus className="mr-1.5 h-4 w-4" /> Üye davet et</Button>}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {members.map((m) => {
          const role = ROLE_META[m.role] || ROLE_META.member;
          return (
            <div key={m.user_id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0" data-testid={`member-${m.user_id}`}>
              <UserAvatar user={m} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.name} {m.user_id === user?.user_id && <span className="text-xs text-muted-foreground">(siz)</span>}
                  {m.status === "invited" && <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">Davet bekliyor</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              {canInvite && m.role !== "owner" && m.user_id !== user?.user_id ? (
                <div className="flex items-center gap-1.5">
                  {m.status === "invited" && (
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => resend(m.user_id)} data-testid={`resend-${m.user_id}`}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Select value={m.role} onValueChange={(v) => changeRole(m.user_id, v)}>
                    <SelectTrigger className="h-8 w-28" data-testid={`role-select-${m.user_id}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Üye</SelectItem>
                      <SelectItem value="admin">Yönetici</SelectItem>
                      {user?.role === "owner" && <SelectItem value="owner">Sahip</SelectItem>}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeMember(m.user_id)} data-testid={`remove-${m.user_id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ color: role.color, background: `${role.color}1f` }}>
                  {role.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <InviteDialog open={open} onOpenChange={setOpen} onDone={() => queryClient.invalidateQueries({ queryKey: ["members"] })} />
    </div>
  );
}

function InviteDialog({ open, onOpenChange, onDone }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("member");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => { if (open) { setEmail(""); setName(""); setRole("member"); } }, [open]);

  const invite = async () => {
    if (!email.trim() || !name.trim()) return;
    setSaving(true);
    try {
      await API.post("/members/invite", { email: email.trim(), name: name.trim(), role });
      toast.success("Davet gönderildi — e-postadaki bağlantıyla parolasını belirleyecek");
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      onDone(); onOpenChange(false);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Davet başarısız");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="invite-dialog">
        <DialogHeader><DialogTitle>Üye Davet Et</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Ad Soyad</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Üyenin adı" data-testid="invite-name-input" /></div>
          <div className="space-y-2"><Label>E-posta</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="uye@fikirizm.com" data-testid="invite-email-input" /></div>
          <div className="space-y-2"><Label>Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger data-testid="invite-role-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Üye</SelectItem>
                <SelectItem value="admin">Yönetici</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={invite} disabled={saving || !email.trim() || !name.trim()} data-testid="invite-submit-btn">Davet et</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
