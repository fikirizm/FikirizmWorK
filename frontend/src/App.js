import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppDataProvider } from "@/context/AppData";
import { AppShell } from "@/components/layout/AppShell";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import AcceptInvite from "@/pages/AcceptInvite";
import Dashboard from "@/pages/Dashboard";
import ProjectPage from "@/pages/ProjectPage";
import IdeasPage from "@/pages/IdeasPage";
import MembersPage from "@/pages/MembersPage";
import SettingsPage from "@/pages/SettingsPage";
import ActivityPage from "@/pages/ActivityPage";
import { Loader2 } from "lucide-react";

function FullLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function ProtectedShell() {
  const { user, loading } = useAuth();
  if (loading || user === null) return <FullLoader />;
  if (!user) return <Navigate to="/giris" replace />;
  return (
    <AppDataProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </AppDataProvider>
  );
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (user) return <Navigate to="/panel" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/giris" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/kayit" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/davet" element={<AcceptInvite />} />
      <Route element={<ProtectedShell />}>
        <Route path="/panel" element={<Dashboard />} />
        <Route path="/proje/:projectId" element={<ProjectPage />} />
        <Route path="/fikirler" element={<IdeasPage />} />
        <Route path="/uyeler" element={<MembersPage />} />
        <Route path="/aktivite" element={<ActivityPage />} />
        <Route path="/ayarlar" element={<SettingsPage />} />
        <Route path="/ayarlar/mail" element={<Navigate to="/ayarlar" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/panel" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </ThemeProvider>
  );
}
