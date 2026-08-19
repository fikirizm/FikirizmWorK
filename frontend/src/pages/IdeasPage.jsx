import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import API from "@/lib/api";
import { useAppData } from "@/context/AppData";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/components/layout/AppShell";
import { UserAvatar } from "@/components/UserAvatar";
import { IdeaStatusBadge } from "@/components/Badges";
import { RichTextEditor } from "@/components/RichTextEditor";
import { relativeTime, IDEA_STATUS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronUp, MessageSquare, Plus, Lightbulb, Send, ArrowRightLeft, Sparkles, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function IdeasPage() {
  const { currentWorkspaceId } = useAppData();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const setBreadcrumb = useBreadcrumb();
  const [sort, setSort] = useState("votes");
  const [createOpen, setCreateOpen] = useState(false);
  const [activeIdea, setActiveIdea] = useState(null);

  useEffect(() => {
    setBreadcrumb(<span className="flex items-center gap-1.5 font-medium"><Lightbulb className="h-4 w-4 text-amber-500" /> Fikirler</span>);
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ["ideas", currentWorkspaceId, sort],
    queryFn: async () => (await API.get(`/ideas?workspace_id=${currentWorkspaceId}&sort=${sort}`)).data,
    enabled: !!currentWorkspaceId,
    refetchInterval: 20000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ideas"] });

  const vote = async (idea, e) => {
    e.stopPropagation();
    await API.post(`/ideas/${idea.id}/vote`);
    invalidate();
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-6 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-light tracking-tighter sm:text-4xl">Fikirler & Öneriler</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ekip fikirlerini paylaşın, oylayın ve göreve dönüştürün.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-40" data-testid="ideas-sort"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="votes">En çok oy</SelectItem>
              <SelectItem value="newest">En yeni</SelectItem>
              <SelectItem value="discussed">En çok tartışılan</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateOpen(true)} data-testid="new-idea-btn"><Plus className="mr-1.5 h-4 w-4" /> Fikir</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : ideas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10"><Sparkles className="h-7 w-7 text-amber-500" /></div>
          <p className="font-heading text-lg font-semibold">Henüz fikir yok</p>
          <p className="max-w-xs text-sm text-muted-foreground">İlk fikri siz ekleyin — ekip oylasın ve en iyileri göreve dönüşsün.</p>
          <Button onClick={() => setCreateOpen(true)} className="mt-2"><Plus className="mr-1.5 h-4 w-4" /> İlk fikri ekle</Button>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {ideas.map((idea) => {
            const voted = (idea.upvotes || []).includes(user?.user_id);
            return (
              <div key={idea.id} onClick={() => setActiveIdea(idea)} data-testid={`idea-card-${idea.id}`}
                className="flex cursor-pointer gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md fik-fade-up">
                <button onClick={(e) => vote(idea, e)} data-testid={`vote-btn-${idea.id}`}
                  className={cn("flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg border transition-colors",
                    voted ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                  <ChevronUp className="h-5 w-5" />
                  <span className="font-heading text-lg font-bold tabular-nums">{idea.vote_count}</span>
                </button>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <IdeaStatusBadge status={idea.status} />
                    {idea.converted_task_id && <span className="text-xs font-medium text-emerald-500">✓ Göreve dönüştürüldü</span>}
                  </div>
                  <h3 className="font-heading text-base font-semibold leading-snug">{idea.title}</h3>
                  <div className="mt-1 line-clamp-2 text-sm text-muted-foreground prose-rte" dangerouslySetInnerHTML={{ __html: idea.description || "" }} />
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><UserAvatar user={{ name: idea.created_by_name }} size={18} /> {idea.created_by_name}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {idea.comment_count}</span>
                    <span>{relativeTime(idea.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateIdeaDialog open={createOpen} onOpenChange={setCreateOpen} workspaceId={currentWorkspaceId} onDone={invalidate} />
      <IdeaDrawer idea={activeIdea} open={!!activeIdea} onOpenChange={(v) => !v && setActiveIdea(null)} onChanged={invalidate} />
    </div>
  );
}

function CreateIdeaDialog({ open, onOpenChange, workspaceId, onDone }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setTitle(""); setDesc(""); } }, [open]);

  const create = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await API.post("/ideas", { workspace_id: workspaceId, title: title.trim(), description: desc });
      toast.success("Fikir eklendi");
      onDone(); onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="create-idea-dialog">
        <DialogHeader><DialogTitle>Yeni Fikir</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Başlık</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fikrinizi bir cümlede özetleyin" autoFocus data-testid="idea-title-input" />
          </div>
          <div className="space-y-2">
            <Label>Açıklama</Label>
            <RichTextEditor value={desc} onChange={setDesc} placeholder="Detayları açıklayın..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={create} disabled={saving || !title.trim()} data-testid="idea-submit-btn">Paylaş</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IdeaDrawer({ idea, open, onOpenChange, onChanged }) {
  const { user } = useAuth();
  const { memberMap } = useAppData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => { if (!open) setConfirmDel(false); }, [open]);

  const { data: comments = [] } = useQuery({
    queryKey: ["idea-comments", idea?.id],
    queryFn: async () => (await API.get(`/ideas/${idea.id}/comments`)).data,
    enabled: !!idea && open,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["idea-comments", idea?.id] });
    onChanged?.();
  };

  if (!idea) return null;
  const voted = (idea.upvotes || []).includes(user?.user_id);
  const isPriv = user?.role === "owner" || user?.role === "admin";
  const canDelete = isPriv || idea.created_by === user?.user_id;

  const del = async () => {
    try {
      await API.delete(`/ideas/${idea.id}`);
      toast.success("Fikir silindi");
      onChanged?.();
      onOpenChange(false);
    } catch (e) { toast.error(e.response?.data?.detail || "Silinemedi"); }
  };

  const changeStatus = async (status) => {
    await API.patch(`/ideas/${idea.id}`, { status });
    toast.success("Durum güncellendi");
    refresh();
    onOpenChange(false);
  };
  const vote = async () => { await API.post(`/ideas/${idea.id}/vote`); refresh(); };
  const send = async () => {
    if (!comment.trim()) return;
    await API.post(`/ideas/${idea.id}/comments`, { text: comment.trim() });
    setComment(""); refresh();
  };
  const convert = async () => {
    const { data } = await API.post(`/ideas/${idea.id}/convert`);
    toast.success("Fikir göreve dönüştürüldü");
    refresh();
    onOpenChange(false);
    navigate(`/proje/${data.project_id}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg" data-testid="idea-drawer">
        <SheetHeader><SheetTitle className="text-sm text-muted-foreground">Fikir Detayı</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="flex items-start gap-3">
            <button onClick={vote} data-testid="drawer-vote-btn"
              className={cn("flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg border transition-colors",
                voted ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
              <ChevronUp className="h-5 w-5" />
              <span className="font-heading text-lg font-bold tabular-nums">{(idea.upvotes || []).length}</span>
            </button>
            <div>
              <IdeaStatusBadge status={idea.status} />
              <h2 className="mt-2 font-heading text-xl font-bold leading-tight tracking-tight">{idea.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{idea.created_by_name} • {relativeTime(idea.created_at)}</p>
            </div>
          </div>

          <div className="prose-rte text-sm text-foreground/90" dangerouslySetInnerHTML={{ __html: idea.description || "<em>Açıklama yok</em>" }} />

          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3">
            <div className="col-span-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Durumu değiştir</div>
            {Object.entries(IDEA_STATUS).map(([k, v]) => (
              <button key={k} onClick={() => changeStatus(k)} data-testid={`set-status-${k}`}
                className={cn("rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                  idea.status === k ? "border-transparent text-white" : "border-border hover:bg-muted")}
                style={idea.status === k ? { background: v.color } : {}}>
                {v.label}
              </button>
            ))}
          </div>

          {!idea.converted_task_id && (
            <Button className="w-full" variant="secondary" onClick={convert} data-testid="convert-idea-btn">
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Göreve çevir
            </Button>
          )}

          {canDelete && (
            !confirmDel ? (
              <Button className="w-full" variant="outline" onClick={() => setConfirmDel(true)} data-testid="delete-idea-btn">
                <Trash2 className="mr-2 h-4 w-4 text-destructive" /> <span className="text-destructive">Fikri sil</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2">
                <span className="flex-1 text-sm text-destructive">Bu fikri silmek istediğinize emin misiniz?</span>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDel(false)}>Vazgeç</Button>
                <Button size="sm" variant="destructive" onClick={del} data-testid="delete-idea-confirm-btn">Sil</Button>
              </div>
            )
          )}

          <div className="space-y-3 border-t border-border pt-4">
            <h4 className="text-sm font-semibold">Yorumlar ({comments.length})</h4>
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2.5" data-testid={`idea-comment-${c.id}`}>
                <UserAvatar user={memberMap[c.user_id] || { name: c.user_name }} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{c.user_name}</span>
                    <span className="text-xs text-muted-foreground">{relativeTime(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-foreground/90">{c.text}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Input value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Yorum yaz..." className="h-9" data-testid="idea-comment-input" />
              <Button size="icon" className="h-9 w-9 shrink-0" onClick={send} data-testid="idea-comment-send"><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
