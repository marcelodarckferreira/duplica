import { cn } from "../lib/utils";

export function LogoMark(props: { className?: string; size?: number }) {
  const { className, size = 40 } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 10H36L44 18V48H14V10Z" fill="#135f56" />
      <path d="M36 10L44 18H36V10Z" fill="#0e3a34" />
      <path d="M22 18H44L52 26V56H22V18Z" fill="#16715f" />
      <path d="M44 18L52 26H44V18Z" fill="#123a43" />
      <rect x="27" y="34" width="20" height="3" rx="1.5" fill="#eaf4f1" />
      <rect x="27" y="41" width="20" height="3" rx="1.5" fill="#eaf4f1" />
      <rect x="27" y="48" width="13" height="3" rx="1.5" fill="#eaf4f1" />
    </svg>
  );
}

export function Logo(props: { iconOnly?: boolean; className?: string; size?: number; textClassName?: string }) {
  const { iconOnly, className, size = 44, textClassName } = props;
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark size={size} />
      {!iconOnly && (
        <span className={cn("text-2xl font-bold tracking-tight text-text", textClassName)}>Duplica</span>
      )}
    </span>
  );
}
