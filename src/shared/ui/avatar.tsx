function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function Avatar(props: { name: string; avatarUrl: string | null; size: number }) {
  if (props.avatarUrl) {
    return (
      <img
        src={props.avatarUrl}
        alt={props.name}
        className="rounded-full border border-border object-cover"
        style={{ width: props.size, height: props.size }}
      />
    );
  }
  return (
    <span
      className="grid place-items-center rounded-full bg-accent text-sm font-extrabold text-white"
      style={{ width: props.size, height: props.size }}
    >
      {initials(props.name)}
    </span>
  );
}
