import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, formatApiError } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/WMark";

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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#f3f3f7] px-4 py-10">
      {/* brand motif */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(88,89,163,0.16), transparent 70%)" }} />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(252,234,16,0.18), transparent 70%)" }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(88,89,163,0.08) 1px, transparent 0)", backgroundSize: "28px 28px" }} />

      <div className="relative w-full max-w-md fik-fade-up">
        <div className="mb-7 flex justify-center">
          <Logo className="h-24 sm:h-28" force="light" />
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-[0_10px_40px_-12px_rgba(24,24,40,0.15)]">
          <div className="text-center">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-zinc-900">Giriş yap</h1>
            <p className="mt-1.5 text-sm text-zinc-500">Çalışma alanınıza erişmek için giriş yapın.</p>
          </div>

          <button
            onClick={googleLogin}
            data-testid="google-login-btn"
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-200 bg-white py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="" className="h-4 w-4" />
            Google ile devam et
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-zinc-400">
            <span className="h-px flex-1 bg-zinc-200" /> VEYA <span className="h-px flex-1 bg-zinc-200" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-zinc-700">E-posta</Label>
              <Input id="email" type="email" value={email} data-testid="login-email-input"
                onChange={(e) => setEmail(e.target.value)} required placeholder="ornek@fikirizm.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-zinc-700">Parola</Label>
              <Input id="password" type="password" value={password} data-testid="login-password-input"
                onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <Button type="submit"
              className="w-full bg-[#5859a3] text-white hover:bg-[#4a4b8f]"
              disabled={loading} data-testid="login-submit-btn">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Giriş yap
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Hesabınız yok mu?{" "}
            <Link to="/kayit" className="font-semibold text-[#5859a3] hover:underline" data-testid="go-register-link">
              Kayıt olun
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">
          Ekip · Görev · Fikir
        </p>
      </div>
    </div>
  );
}
