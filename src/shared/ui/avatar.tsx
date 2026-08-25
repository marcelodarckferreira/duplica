import { useEffect, useState } from "react";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function Avatar(props: { name: string; avatarUrl: string | null; size: number }) {
  // Se o arquivo referenciado sumiu do volume de uploads (avatar_path órfão
  // no banco), o <img> falha e cai pro fallback de iniciais em vez de
  // mostrar o ícone de imagem quebrada do navegador.
  const [failed, setFailed] = useState(false);
  // Sem isto, trocar de foto (ou de usuário exibido) depois de uma falha
  // anterior ficaria preso no fallback de iniciais mesmo com uma URL nova e
  // válida.
  useEffect(() => setFailed(false), [props.avatarUrl]);

  if (props.avatarUrl && !failed) {
    return (
      <img
        src={props.avatarUrl}
        alt={props.name}
        onError={() => setFailed(true)}
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
