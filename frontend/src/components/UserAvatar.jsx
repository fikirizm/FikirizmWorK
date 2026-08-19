import { avatarColor, initials } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function UserAvatar({ user, size = 28, className }) {
  const name = user?.name || user?.email || "?";
  const pic = user?.picture;
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (pic) {
    return (
      <img
        src={pic}
        alt={name}
        style={style}
        className={cn("rounded-full border border-border object-cover", className)}
      />
    );
  }
  return (
    <div
      style={{ ...style, backgroundColor: avatarColor(name) }}
      className={cn("flex items-center justify-center rounded-full font-semibold text-white border border-white/20", className)}
      title={name}
    >
      {initials(name)}
    </div>
  );
}

export function AvatarStack({ users = [], max = 3, size = 26 }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((u, i) => (
        <UserAvatar key={u?.user_id || i} user={u} size={size} className="ring-2 ring-background" />
      ))}
      {extra > 0 && (
        <div
          style={{ width: size, height: size, fontSize: size * 0.38 }}
          className="flex items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold ring-2 ring-background border border-border"
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
