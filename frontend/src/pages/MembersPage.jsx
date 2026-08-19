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
import { UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

const ROLE_META = {
  owner: { label: "Sahip", color: "#6366F1" },
  admin: { label: "Yönetici", color: "#0EA5E9" },
  member: { label: "Üye", color: "#71717A" },
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
                <p className="truncate text-sm font-medium">{m.name} {m.user_id === user?.user_id && <span className="text-xs text-muted-foreground">(siz)</span>}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ color: role.color, background: `${role.color}1f` }}>
                {role.label}
              </span>
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
      toast.success("Üye eklendi (varsayılan parola: Demo2025!)");
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
