import { useState, useEffect, useRef } from "react";
import API from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppData } from "@/context/AppData";
import { useAuth } from "@/context/AuthContext";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextEditor } from "@/components/RichTextEditor";
import { UserAvatar, AvatarStack } from "@/components/UserAvatar";
import { PriorityBadge } from "@/components/Badges";
import { PRIORITIES, toDateInput, formatDateTime, doneStatusId, formatMoney } from "@/lib/constants";
import {
  Trash2, Plus, X, Calendar as CalIcon, Users, Flag, Tag, ListChecks,
  MessageSquare, CheckSquare, Send, GitBranch, Eye, Lock, Wallet, Paperclip, Download, FileText,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export function TaskDrawer({ taskId, project, open, onOpenChange, onDeleted }) {
  const queryClient = useQueryClient();
  const { members, memberMap } = useAppData();
  const { user } = useAuth();
  const statuses = project?.statuses || [];

  const { data: task } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => (await API.get(`/tasks/${taskId}`)).data,
    enabled: !!taskId && open,
  });

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [comment, setComment] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newSub, setNewSub] = useState("");
  const [newCheck, setNewCheck] = useState("");

  useEffect(() => {
    if (task) { setTitle(task.title); setDesc(task.description || ""); }
  }, [task]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const patch = async (updates) => {
    await API.patch(`/tasks/${taskId}`, updates);
    invalidate();
  };

  const del = async () => {
    await API.delete(`/tasks/${taskId}`);
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success("Görev silindi");
    onDeleted?.();
    onOpenChange(false);
  };

  const toggleAssignee = (id) => {
    const cur = task.assignees || [];
    patch({ assignees: cur.includes(id) ? cur.filter((a) => a !== id) : [...cur, id] });
  };

  const toggleVisibleTo = (id) => {
    const cur = task.visible_to || [];
    patch({ visible_to: cur.includes(id) ? cur.filter((a) => a !== id) : [...cur, id] });
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    patch({ tags: [...(task.tags || []), newTag.trim()] });
    setNewTag("");
  };
  const removeTag = (t) => patch({ tags: (task.tags || []).filter((x) => x !== t) });

  const addCheck = () => {
    if (!newCheck.trim()) return;
    const item = { id: `chk_${Date.now()}`, text: newCheck.trim(), done: false };
    patch({ checklist: [...(task.checklist || []), item] });
    setNewCheck("");
  };
  const toggleCheck = (id) => {
    patch({ checklist: (task.checklist || []).map((c) => c.id === id ? { ...c, done: !c.done } : c) });
  };
  const removeCheck = (id) => patch({ checklist: (task.checklist || []).filter((c) => c.id !== id) });

  const addSubtask = async () => {
    if (!newSub.trim()) return;
    await API.post("/tasks", {
      workspace_id: task.workspace_id, project_id: task.project_id,
      title: newSub.trim(), parent_id: task.id, status: statuses[0]?.id,
    });
    setNewSub("");
    invalidate();
  };

  const toggleSubtask = async (sub) => {
    const done = doneStatusId(statuses);
    const next = sub.status === done ? statuses[0]?.id : done;
    await API.patch(`/tasks/${sub.id}`, { status: next });
    invalidate();
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    await API.post(`/tasks/${taskId}/comments`, { text: comment.trim() });
    setComment("");
    invalidate();
  };

  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      await API.post(`/tasks/${taskId}/attachments`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Dosya yüklendi");
      invalidate();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Yükleme başarısız");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadFile = async (f) => {
    try {
      const res = await API.get(`/files/${f.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = f.original_filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("İndirme başarısız");
    }
  };

  const deleteFile = async (id) => {
    await API.delete(`/files/${id}`);
    invalidate();
  };

  const images = (task?.attachments || []).filter((f) => f.content_type?.startsWith("image/"));
  const [lightbox, setLightbox] = useState(-1);
  const fileUrl = (f) => `${process.env.REACT_APP_BACKEND_URL}/api/files/${f.id}/download?auth=${localStorage.getItem("fik_token")}`;

  const assignees = (task?.assignees || []).map((id) => memberMap[id]).filter(Boolean);
  const doneStatId = doneStatusId(statuses);
  const checkDone = (task?.checklist || []).filter((c) => c.done).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl" data-testid="task-drawer">
        {!task ? (
          <div className="space-y-4 p-6">
            <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-24 w-full animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <>
            <SheetHeader className="flex flex-row items-center justify-between border-b border-border px-6 py-4 space-y-0">
              <SheetTitle className="text-sm font-medium text-muted-foreground">Görev Detayı</SheetTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={del} data-testid="delete-task-btn">
                <Trash2 className="h-4 w-4" />
              </Button>
            </SheetHeader>

            <div className="space-y-6 p-6">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => title !== task.title && patch({ title })}
                data-testid="task-title-input"
                className="w-full border-none bg-transparent font-heading text-2xl font-bold tracking-tight outline-none placeholder:text-muted-foreground"
                placeholder="Görev başlığı"
              />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field icon={CheckSquare} label="Durum">
                  <Select value={task.status} onValueChange={(v) => patch({ status: v })}>
                    <SelectTrigger className="h-8" data-testid="task-status-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field icon={Flag} label="Öncelik">
                  <Select value={task.priority} onValueChange={(v) => patch({ priority: v })}>
                    <SelectTrigger className="h-8" data-testid="task-priority-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITIES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          <span className="flex items-center gap-2"><Flag className="h-3 w-3" fill={v.color} strokeWidth={0} /> {v.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field icon={Users} label="Atananlar">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex h-8 items-center gap-2 rounded-md border border-input px-2 hover:bg-muted" data-testid="task-assignees-btn">
                        {assignees.length ? <AvatarStack users={assignees} size={22} /> : <span className="text-muted-foreground">Ata</span>}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-1" align="start">
                      {members.map((m) => (
                        <button key={m.user_id} onClick={() => toggleAssignee(m.user_id)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted" data-testid={`assign-${m.user_id}`}>
                          <Checkbox checked={(task.assignees || []).includes(m.user_id)} />
                          <UserAvatar user={m} size={22} />
                          <span className="truncate text-sm">{m.name}</span>
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </Field>

                <Field icon={CalIcon} label="Son tarih">
                  <Input type="date" value={toDateInput(task.due_date)} className="h-8"
                    onChange={(e) => patch({ due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    data-testid="task-due-input" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field icon={Eye} label="Görünürlük">
                  <Select value={task.visibility || "project"} onValueChange={(v) => patch({ visibility: v })}>
                    <SelectTrigger className="h-8" data-testid="task-visibility-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project">Tüm proje üyeleri</SelectItem>
                      <SelectItem value="private">Gizli (seçili kişiler)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {task.visibility === "private" && (
                  <Field icon={Lock} label="Görebilecekler">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex h-8 items-center gap-2 rounded-md border border-input px-2 hover:bg-muted" data-testid="task-visibleto-btn">
                          {(task.visible_to || []).length ? (
                            <AvatarStack users={(task.visible_to || []).map((id) => memberMap[id]).filter(Boolean)} size={22} />
                          ) : <span className="text-muted-foreground">Kişi seç</span>}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-1" align="start">
                        {members.map((m) => (
                          <button key={m.user_id} onClick={() => toggleVisibleTo(m.user_id)}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted" data-testid={`visibleto-${m.user_id}`}>
                            <Checkbox checked={(task.visible_to || []).includes(m.user_id)} />
                            <UserAvatar user={m} size={22} />
                            <span className="truncate text-sm">{m.name}</span>
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </Field>
                )}
              </div>

              {task.budget_summary?.count > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5" data-testid="task-budget-summary">
                  <span className="flex items-center gap-1.5 text-sm font-medium"><Wallet className="h-4 w-4 text-primary" /> Bağlı Bütçe ({task.budget_summary.count})</span>
                  <span className="text-sm tabular-nums">
                    <span className="font-semibold">{formatMoney(task.budget_summary.actual, task.budget_summary.currency)}</span>
                    <span className="text-muted-foreground"> / plan {formatMoney(task.budget_summary.planned, task.budget_summary.currency)}</span>
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label icon={Tag}>Etiketler</Label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(task.tags || []).map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                      {t}
                      <button onClick={() => removeTag(t)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                  <input value={newTag} onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTag()}
                    placeholder="+ etiket" className="w-20 bg-transparent text-xs outline-none placeholder:text-muted-foreground" data-testid="task-tag-input" />
                </div>
              </div>

              <div className="space-y-2">
                <Label icon={MessageSquare}>Açıklama</Label>
                <RichTextEditor value={desc} onChange={setDesc} />
                {desc !== (task.description || "") && (
                  <Button size="sm" variant="secondary" onClick={() => patch({ description: desc })} data-testid="save-desc-btn">Açıklamayı kaydet</Button>
                )}
              </div>

              <div className="space-y-2">
                <Label icon={ListChecks}>Kontrol Listesi {task.checklist?.length ? `(${checkDone}/${task.checklist.length})` : ""}</Label>
                <div className="space-y-1">
                  {(task.checklist || []).map((c) => (
                    <div key={c.id} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted" data-testid={`checklist-${c.id}`}>
                      <Checkbox checked={c.done} onCheckedChange={() => toggleCheck(c.id)} />
                      <span className={`flex-1 text-sm ${c.done ? "text-muted-foreground line-through" : ""}`}>{c.text}</span>
                      <button onClick={() => removeCheck(c.id)} className="opacity-0 group-hover:opacity-100"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-1">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <input value={newCheck} onChange={(e) => setNewCheck(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCheck()}
                      placeholder="Madde ekle" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" data-testid="checklist-input" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label icon={GitBranch}>Alt Görevler</Label>
                <div className="space-y-1">
                  {(task.subtasks || []).map((s) => (
                    <div key={s.id} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted" data-testid={`subtask-${s.id}`}>
                      <Checkbox checked={s.status === doneStatId} onCheckedChange={() => toggleSubtask(s)} />
                      <span className={`flex-1 text-sm ${s.status === doneStatId ? "text-muted-foreground line-through" : ""}`}>{s.title}</span>
                      {s.assignees?.length > 0 && <AvatarStack users={s.assignees.map((id) => memberMap[id]).filter(Boolean)} size={20} />}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-1">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <input value={newSub} onChange={(e) => setNewSub(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                      placeholder="Alt görev ekle" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" data-testid="subtask-input" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label icon={Paperclip}>Dosya Ekleri</Label>
                <div className="space-y-1.5">
                  {(task.attachments || []).map((f) => (
                    <div key={f.id} className="group flex items-center gap-2 rounded-md border border-border px-2.5 py-2 hover:bg-muted/50" data-testid={`attachment-${f.id}`}>
                      {f.content_type?.startsWith("image/") ? (
                        <img
                          src={fileUrl(f)}
                          alt={f.original_filename}
                          className="h-9 w-9 shrink-0 cursor-pointer rounded object-cover border border-border"
                          onClick={() => setLightbox(images.findIndex((im) => im.id === f.id))}
                        />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <button onClick={() => downloadFile(f)} className="min-w-0 flex-1 truncate text-left text-sm hover:text-primary" data-testid={`attachment-download-${f.id}`}>
                        {f.original_filename}
                      </button>
                      <span className="shrink-0 text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
                      <button onClick={() => downloadFile(f)} className="opacity-0 group-hover:opacity-100"><Download className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => deleteFile(f.id)} className="opacity-0 group-hover:opacity-100" data-testid={`attachment-delete-${f.id}`}><X className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  ))}
                  <input ref={fileInputRef} type="file" className="hidden" onChange={uploadFile} data-testid="attachment-file-input" />
                  <Button variant="outline" size="sm" className="w-full" disabled={uploading}
                    onClick={() => fileInputRef.current?.click()} data-testid="attachment-upload-btn">
                    <Paperclip className="mr-1.5 h-4 w-4" /> {uploading ? "Yükleniyor..." : "Dosya ekle"}
                  </Button>
                </div>
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <Label icon={MessageSquare}>Yorumlar</Label>
                <div className="space-y-3">
                  {(task.comments || []).map((c) => (
                    <div key={c.id} className="flex gap-2.5" data-testid={`comment-${c.id}`}>
                      <UserAvatar user={memberMap[c.user_id] || { name: c.user_name }} size={28} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">{c.user_name}</span>
                          <span className="text-xs text-muted-foreground">{formatDateTime(c.created_at)}</span>
                        </div>
                        <p className="text-sm text-foreground/90">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <UserAvatar user={user} size={28} />
                  <Input value={comment} onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendComment()}
                    placeholder="Yorum yaz..." className="h-9" data-testid="comment-input" />
                  <Button size="icon" className="h-9 w-9 shrink-0" onClick={sendComment} data-testid="comment-send-btn"><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </>
        )}
        {lightbox >= 0 && images[lightbox] && (
          <div onClick={() => setLightbox(-1)} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6" data-testid="image-lightbox">
            <img src={fileUrl(images[lightbox])} alt="" className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
            <button onClick={() => setLightbox(-1)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" data-testid="lightbox-close"><X className="h-5 w-5" /></button>
            {images.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i - 1 + images.length) % images.length); }} className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" data-testid="lightbox-prev"><ChevronLeft className="h-6 w-6" /></button>
                <button onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i + 1) % images.length); }} className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" style={{ right: "3.5rem" }} data-testid="lightbox-next"><ChevronRight className="h-6 w-6" /></button>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      {children}
    </div>
  );
}

function Label({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-1.5 text-sm font-semibold">
      <Icon className="h-4 w-4 text-muted-foreground" /> {children}
    </div>
  );
}
