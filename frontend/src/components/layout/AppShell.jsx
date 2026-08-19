import { useState, useEffect, createContext, useContext } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CommandPalette } from "@/components/CommandPalette";
import { useAppData } from "@/context/AppData";
import { useRealtime } from "@/hooks/useRealtime";

const BreadcrumbContext = createContext(() => {});
export const useBreadcrumb = () => useContext(BreadcrumbContext);

export function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState(null);
  const { currentWorkspaceId } = useAppData();

  useRealtime(currentWorkspaceId);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <BreadcrumbContext.Provider value={setBreadcrumb}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <div className="hidden md:block">
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar breadcrumb={breadcrumb} onOpenSearch={() => setSearchOpen(true)} />
          <main className="flex-1 overflow-y-auto" data-testid="main-content">
            {children}
          </main>
        </div>
      </div>
      <CommandPalette open={searchOpen} setOpen={setSearchOpen} />
    </BreadcrumbContext.Provider>
  );
}
