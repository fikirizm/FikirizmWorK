import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import API, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Logo } from "@/components/WMark";

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setError("Geçersiz davet bağlantısı."); setLoading(false); return; }
    (async () => {
      try {
        const { data } = await API.get(`/invite/${token}`);
        setInvite(data);
      } catch (err) {
        setError(formatApiError(err.response?.data?.detail) || "Davet bulunamadı.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await API.post(`/invite/${token}/accept`, { password });
      if (data.token) localStorage.setItem("fik_token", data.token);
      setUser(data.user);
      toast.success("Hoş geldiniz! Hesabınız hazır.");
      navigate("/panel", { replace: true });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "İşlem başarısız");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm fik-fade-up">
        <div className="mb-6"><Logo className="h-9" /></div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Davet kontrol ediliyor...</div>
        ) : error ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <XCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
            <p className="font-medium">{error}</p>
            <Link to="/giris" className="mt-4 inline-block text-sm text-primary hover:underline">Giriş sayfasına dön</Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" /> {invite.org_name} ekibine davet edildiniz
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">Merhaba {invite.name} 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium">{invite.email}</span> için bir parola belirleyerek hesabınızı tamamlayın.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pw">Parola</Label>
                <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={6} placeholder="En az 6 karakter" data-testid="invite-password-input" autoFocus />
              </div>
              <Button type="submit" className="w-full" disabled={submitting} data-testid="invite-accept-btn">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Hesabı oluştur ve giriş yap
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
