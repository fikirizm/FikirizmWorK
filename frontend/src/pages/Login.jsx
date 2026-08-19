import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, formatApiError } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/WMark";

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-white lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(88,89,163,0.14), transparent 70%)" }} />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(252,234,16,0.16), transparent 70%)" }} />
      <div className="pointer-events-none absolute inset-0 opacity-60"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(88,89,163,0.09) 1px, transparent 0)", backgroundSize: "26px 26px" }} />
      <div className="relative flex flex-col items-center px-12">
        <Logo className="h-24" />
        <div className="mt-10 h-px w-16 bg-zinc-200" />
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.35em] text-zinc-400">
          Ekip · Görev · Fikir
        </p>
      </div>
    </div>
  );
}

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function googleLogin() {
  const redirectUrl = window.location.origin + "/panel";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("ingobiosport@gmail.com");
  const [password, setPassword] = useState("Fikirizm2025!");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Tekrar hoş geldiniz!");
      navigate("/panel", { replace: true });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <BrandPanel />
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-sm fik-fade-up">
          <div className="mb-8 lg:hidden">
            <Logo className="h-9" />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Giriş yap</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hesabınıza erişmek için bilgilerinizi girin.
          </p>

          <button
            onClick={googleLogin}
            data-testid="google-login-btn"
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-input bg-background py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="" className="h-4 w-4" />
            Google ile devam et
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> VEYA <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" type="email" value={email} data-testid="login-email-input"
                onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@fikirizm.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parola</Label>
              <Input id="password" type="password" value={password} data-testid="login-password-input"
                onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit-btn">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Giriş yap
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Hesabınız yok mu?{" "}
            <Link to="/kayit" className="font-medium text-primary hover:underline" data-testid="go-register-link">
              Kayıt olun
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
