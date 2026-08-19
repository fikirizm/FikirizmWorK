import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import API from "@/lib/api";
import { useAppData } from "@/context/AppData";
import { UserAvatar } from "@/components/UserAvatar";
import { formatMoney, formatDate, toDateInput } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import {
  Plus, TrendingUp, TrendingDown, Wallet, Trash2, Pencil, Lock, Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function SummaryCard({ icon: Icon, label, value, sub, tone }) {
  const tones = {
    green: "text-emerald-500 bg-emerald-500/10",
    red: "text-destructive bg-destructive/10",
    primary: "text-primary bg-primary/10",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 font-heading text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function BudgetView({ project, tasks = [] }) {
  const queryClient = useQueryClient();
  const { memberMap } = useAppData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["budget", project.id],
    queryFn: async () => (await API.get(`/projects/${project.id}/budget`)).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["budget", project.id] });

  const del = async (id) => {
    await API.delete(`/budget/${id}`);
    invalidate();
    toast.success("Kalem silindi");
  };

  if (isLoading || !data) {
    return <div className="grid gap-4 p-6 md:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}</div>;
  }

  const { summary: s, currency, categories, can_edit, items } = data;
  const chartData = [
    { name: "Gelir", Planlanan: s.planned_income, Gerçekleşen: s.actual_income },
    { name: "Gider", Planlanan: s.planned_expense, Gerçekleşen: s.actual_expense },
  ];

  const income = items.filter((i) => i.type === "income");
  const expense = items.filter((i) => i.type === "expense");

  return (
    <div className="space-y-6 p-6" data-testid="budget-view">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">Bütçe Planı</h2>
          <p className="text-sm text-muted-foreground">Para birimi: {currency} · {items.length} kalem</p>
        </div>
        {can_edit ? (
          <Button onClick={() => { setEditItem(null); setDialogOpen(true); }} data-testid="add-budget-btn"><Plus className="mr-1.5 h-4 w-4" /> Kalem ekle</Button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Yalnızca görüntüleme</span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={TrendingUp} label="Toplam Gelir (Gerç.)" value={formatMoney(s.actual_income, currency)} sub={`Planlanan: ${formatMoney(s.planned_income, currency)}`} tone="green" />
        <SummaryCard icon={TrendingDown} label="Toplam Gider (Gerç.)" value={formatMoney(s.actual_expense, currency)} sub={`Planlanan: ${formatMoney(s.planned_expense, currency)}`} tone="red" />
        <SummaryCard icon={Wallet} label="Bakiye (Gerç.)" value={formatMoney(s.actual_balance, currency)} sub={`Planlanan: ${formatMoney(s.planned_balance, currency)}`} tone={s.actual_balance >= 0 ? "green" : "red"} />
        <SummaryCard icon={Wallet} label="Planlanan Bakiye" value={formatMoney(s.planned_balance, currency)} tone="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Planlanan vs Gerçekleşen</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => formatMoney(v, currency)} />
              <Tooltip formatter={(v) => formatMoney(v, currency)} cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar dataKey="Planlanan" fill="#a5b4fc" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Gerçekleşen" fill="#6366F1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Kategori Bazlı Özet</h3>
          <div className="space-y-2">
            {s.by_category.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Kategori verisi yok</p> :
              s.by_category.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", c.type === "income" ? "bg-emerald-500" : "bg-destructive")} />
                    {c.category}
                  </span>
                  <span className="tabular-nums">
                    <span className="font-semibold">{formatMoney(c.actual, currency)}</span>
                    <span className="text-muted-foreground"> / {formatMoney(c.planned, currency)}</span>
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <BudgetTable title="Gelir Kalemleri" items={income} currency={currency} canEdit={can_edit}
        memberMap={memberMap} tasks={tasks} onEdit={(it) => { setEditItem(it); setDialogOpen(true); }} onDelete={del} tone="green" />
      <BudgetTable title="Gider Kalemleri" items={expense} currency={currency} canEdit={can_edit}
        memberMap={memberMap} tasks={tasks} onEdit={(it) => { setEditItem(it); setDialogOpen(true); }} onDelete={del} tone="red" />

      <BudgetItemDialog open={dialogOpen} onOpenChange={setDialogOpen} project={project}
        categories={categories} tasks={tasks} members={Object.values(memberMap)} item={editItem} onDone={invalidate} />
    </div>
  );
}

function BudgetTable({ title, items, currency, canEdit, memberMap, tasks, onEdit, onDelete, tone }) {
  const taskMap = Object.fromEntries(tasks.map((t) => [t.id, t]));
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <span className={cn("h-2 w-2 rounded-full", tone === "green" ? "bg-emerald-500" : "bg-destructive")} />
        <span className="text-sm font-semibold">{title}</span>
        <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Henüz kalem yok</p>
      ) : (
        <div className="divide-y divide-border">
          {items.map((it) => (
            <div key={it.id} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40" data-testid={`budget-item-${it.id}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{it.description || it.category}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5">{it.category}</span>
                  {it.date && <span>{formatDate(it.date)}</span>}
                  {it.responsible && memberMap[it.responsible] && <span>· {memberMap[it.responsible].name}</span>}
                  {it.task_id && taskMap[it.task_id] && <span className="flex items-center gap-0.5"><Link2 className="h-3 w-3" /> {taskMap[it.task_id].title}</span>}
                </div>
              </div>
              <div className="text-right tabular-nums">
                <p className="text-sm font-semibold">{formatMoney(it.actual_amount, currency)}</p>
                <p className="text-xs text-muted-foreground">plan: {formatMoney(it.planned_amount, currency)}</p>
              </div>
              {canEdit && (
                <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={() => onEdit(it)} className="rounded p-1 hover:bg-muted" data-testid={`budget-edit-${it.id}`}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  <button onClick={() => onDelete(it.id)} className="rounded p-1 hover:bg-muted" data-testid={`budget-delete-${it.id}`}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BudgetItemDialog({ open, onOpenChange, project, categories, tasks, members, item, onDone }) {
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [planned, setPlanned] = useState("");
  const [actual, setActual] = useState("");
  const [date, setDate] = useState("");
  const [responsible, setResponsible] = useState("none");
  const [taskId, setTaskId] = useState("none");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (item) {
        setType(item.type); setCategory(item.category); setDescription(item.description || "");
        setPlanned(String(item.planned_amount ?? "")); setActual(String(item.actual_amount ?? ""));
        setDate(toDateInput(item.date)); setResponsible(item.responsible || "none"); setTaskId(item.task_id || "none");
      } else {
        setType("expense"); setCategory(""); setDescription(""); setPlanned(""); setActual("");
        setDate(""); setResponsible("none"); setTaskId("none");
      }
    }
  }, [open, item]);

  const catList = categories?.[type] || [];

  const save = async () => {
    if (!category || !description) { toast.error("Kategori ve açıklama gerekli"); return; }
    setSaving(true);
    const payload = {
      type, category, description,
      planned_amount: parseFloat(planned) || 0, actual_amount: parseFloat(actual) || 0,
      date: date ? new Date(date).toISOString() : null,
      responsible: responsible === "none" ? null : responsible,
      task_id: taskId === "none" ? null : taskId,
    };
    try {
      if (item) await API.patch(`/budget/${item.id}`, payload);
      else await API.post(`/projects/${project.id}/budget`, payload);
      toast.success(item ? "Güncellendi" : "Kalem eklendi");
      onDone(); onOpenChange(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Kaydedilemedi");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="budget-dialog">
        <DialogHeader><DialogTitle>{item ? "Bütçe Kalemini Düzenle" : "Yeni Bütçe Kalemi"}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Tür</Label>
              <Select value={type} onValueChange={(v) => { setType(v); setCategory(""); }}>
                <SelectTrigger data-testid="budget-type-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Gelir</SelectItem>
                  <SelectItem value="expense">Gider</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="budget-category-select"><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  {catList.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Açıklama</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kalem açıklaması" data-testid="budget-desc-input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Planlanan tutar</Label>
              <Input type="number" value={planned} onChange={(e) => setPlanned(e.target.value)} placeholder="0" data-testid="budget-planned-input" /></div>
            <div className="space-y-1.5"><Label>Gerçekleşen tutar</Label>
              <Input type="number" value={actual} onChange={(e) => setActual(e.target.value)} placeholder="0" data-testid="budget-actual-input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Tarih</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="budget-date-input" /></div>
            <div className="space-y-1.5"><Label>Sorumlu</Label>
              <Select value={responsible} onValueChange={setResponsible}>
                <SelectTrigger data-testid="budget-responsible-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Yok</SelectItem>
                  {members.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>İlişkili görev (opsiyonel)</Label>
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger data-testid="budget-task-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Yok</SelectItem>
                {tasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={save} disabled={saving} data-testid="budget-save-btn">{item ? "Kaydet" : "Ekle"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
