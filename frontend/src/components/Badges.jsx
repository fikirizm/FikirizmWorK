import { PRIORITIES, IDEA_STATUS } from "@/lib/constants";
import { Flag } from "lucide-react";

export function StatusDot({ color, className = "" }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}

export function StatusBadge({ status }) {
  if (!status) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ color: status.color, backgroundColor: `${status.color}1f` }}
      data-testid={`status-badge-${status.id}`}
    >
      <StatusDot color={status.color} />
      {status.name}
    </span>
  );
}

export function PriorityBadge({ priority, showLabel = true }) {
  const p = PRIORITIES[priority] || PRIORITIES.medium;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium"
      style={{ color: p.color, backgroundColor: p.bg }}
      data-testid={`priority-badge-${priority}`}
    >
      <Flag className="h-3 w-3" fill={p.color} strokeWidth={0} />
      {showLabel && p.label}
    </span>
  );
}

export function IdeaStatusBadge({ status }) {
  const s = IDEA_STATUS[status] || IDEA_STATUS.new;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ color: s.color, backgroundColor: `${s.color}1f` }}
      data-testid={`idea-status-${status}`}
    >
      <StatusDot color={s.color} />
      {s.label}
    </span>
  );
}
