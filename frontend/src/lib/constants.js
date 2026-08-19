export const PRIORITIES = {
  low: { label: "Düşük", color: "#71717A", bg: "rgba(113,113,122,0.12)" },
  medium: { label: "Orta", color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  high: { label: "Yüksek", color: "#F97316", bg: "rgba(249,115,22,0.14)" },
  urgent: { label: "Acil", color: "#DC2626", bg: "rgba(220,38,38,0.14)" },
};

export const IDEA_STATUS = {
  new: { label: "Yeni", color: "#6366F1" },
  evaluating: { label: "Değerlendiriliyor", color: "#F59E0B" },
  approved: { label: "Onaylandı", color: "#10B981" },
  rejected: { label: "Reddedildi", color: "#EF4444" },
};

const AVATAR_COLORS = [
  "#6366F1", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#3B82F6",
];

export function avatarColor(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatDate(iso, opts = {}) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", ...opts }).format(d);
  } catch {
    return "";
  }
}

export function formatDateTime(iso) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function relativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "az önce";
  if (min < 60) return `${min} dk önce`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} saat önce`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} gün önce`;
  return formatDate(iso);
}

export function isOverdue(iso) {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

export function toDateInput(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export const CURRENCIES = {
  TRY: { symbol: "₺", label: "Türk Lirası (₺)" },
  USD: { symbol: "$", label: "Dolar ($)" },
  EUR: { symbol: "€", label: "Euro (€)" },
};

export function formatMoney(amount, currency = "TRY") {
  const sym = CURRENCIES[currency]?.symbol || "";
  const n = Number(amount || 0);
  return `${sym}${n.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`;
}

export function doneStatusId(statuses = []) {
  const flagged = statuses.find((s) => s.done);
  if (flagged) return flagged.id;
  return statuses.length ? statuses[statuses.length - 1].id : "done";
}
