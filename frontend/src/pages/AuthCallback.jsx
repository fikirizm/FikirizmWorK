import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      navigate("/giris", { replace: true });
      return;
    }
    const sessionId = match[1];
    let done = false;
    (async () => {
      try {
        const { data } = await API.post("/auth/session", { session_id: sessionId });
        if (done) return;
        if (data.token) localStorage.setItem("fik_token", data.token);
        setUser(data.user);
        window.history.replaceState(null, "", "/panel");
        navigate("/panel", { replace: true });
      } catch {
        setError(true);
        setTimeout(() => navigate("/giris", { replace: true }), 1500);
      }
    })();
    return () => { done = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">
        {error ? "Giriş başarısız, yönlendiriliyorsunuz..." : "Google ile giriş yapılıyor..."}
      </p>
    </div>
  );
}
