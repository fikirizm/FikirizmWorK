import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import API, { formatApiError } from "@/lib/api";
import { useBreadcrumb } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Mail, Server, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function MailSettings() {
  const setBreadcrumb = useBreadcrumb();
  const [cfg, setCfg] = useState(null);
  const [testTo, setTestTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setBreadcrumb(<span className="flex items-center gap-1.5 font-medium"><Mail className="h-4 w-4" /> Mail Ayarları</span>);
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  const { data } = useQuery({ queryKey: ["email-settings"], queryFn: async () => (await API.get("/settings/email")).data });
  useEffect(() => { if (data) setCfg({ ...data, smtp_password: "" }); }, [data]);

  if (!cfg) return <div className="p-6 text-muted-foreground">Yükleniyor...</div>;
  const up = (k, v) => setCfg((c) => ({ ...c, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...cfg };
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

  const isSmtp = cfg.provider === "smtp";

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Mail Ayarları</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Bildirim e-postalarının nasıl gönderileceğini yapılandırın.</p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="space-y-2">
          <Label>Sağlayıcı</Label>
          <Select value={cfg.provider} onValueChange={(v) => up("provider", v)}>
            <SelectTrigger data-testid="mail-provider-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="emergent">Emergent (yönetilen — kurulum gerektirmez)</SelectItem>
              <SelectItem value="smtp">Özel SMTP / Amazon SES</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {isSmtp ? "Amazon SES için SES SMTP uç noktası, kullanıcı adı ve şifresini kullanın." : "Ek kurulum gerektirmeden Emergent altyapısıyla e-posta gönderilir."}
          </p>
        </div>

        {isSmtp && (
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
                <Input value={cfg.from_name} onChange={(e) => up("from_name", e.target.value)} placeholder="Fikirizm Cloud" data-testid="from-name-input" /></div>
            </div>
          </div>
        )}

        <Button onClick={save} disabled={saving} data-testid="mail-save-btn">{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium"><Send className="h-4 w-4" /> Test E-postası Gönder</div>
        <div className="flex gap-2">
          <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="test@ornek.com" data-testid="test-email-input" />
          <Button variant="outline" onClick={test} disabled={testing} data-testid="test-email-btn">
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> {testing ? "Gönderiliyor..." : "Test et"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Mevcut ayarlarla bir test e-postası gönderir.</p>
      </div>
    </div>
  );
}
