import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Search, LogOut, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import { UserAvatar } from "@/components/UserAvatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const ROLE_LABELS = { owner: "Sahip", admin: "Yönetici", member: "Üye" };

export function Topbar({ breadcrumb, onOpenSearch }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-md">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        {breadcrumb}
      </div>

      <button
        onClick={onOpenSearch}
        data-testid="open-search-btn"
        className="hidden items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted sm:flex"
      >
        <Search className="h-4 w-4" />
        <span>Ara</span>
        <kbd className="ml-4 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium">
          {isMac ? "⌘" : "Ctrl"} K
        </kbd>
      </button>
      <button onClick={onOpenSearch} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted sm:hidden" data-testid="open-search-btn-mobile">
        <Search className="h-[18px] w-[18px]" />
      </button>

      <ThemeToggle />
      <NotificationCenter />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg p-0.5 pr-1 transition-colors hover:bg-muted" data-testid="user-menu-btn">
            <UserAvatar user={user} size={32} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="truncate font-medium">{user?.name}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
              <span className="mt-1 w-fit rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {ROLE_LABELS[user?.role] || "Üye"}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/uyeler")} data-testid="menu-members">
            <Settings className="mr-2 h-4 w-4" /> Ekip Yönetimi
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive" data-testid="logout-btn">
            <LogOut className="mr-2 h-4 w-4" /> Çıkış yap
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
