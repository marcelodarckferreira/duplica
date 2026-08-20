import { cn } from "../lib/utils";

// Glifo oficial do WhatsApp (simple-icons) — lucide-react não tem ícones de
// marca, só o conjunto genérico, então este é um SVG embutido isolado aqui
// pra não duplicar o path em cada tela que precisar do link.
function WhatsAppGlyph(props: { size: number }) {
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347Z" />
      <path d="M12.05 2C6.508 2 2 6.477 2 11.987c0 1.836.507 3.581 1.397 5.075L2 22l5.128-1.34a10.05 10.05 0 0 0 4.922 1.267h.005c5.542 0 10.05-4.478 10.05-9.987C22.105 6.43 17.596 2 12.05 2Zm0 18.15h-.004a8.28 8.28 0 0 1-4.223-1.157l-.303-.18-3.043.795.813-2.966-.198-.304a8.207 8.207 0 0 1-1.264-4.353c0-4.55 3.723-8.253 8.302-8.253 2.219 0 4.302.865 5.87 2.428a8.194 8.194 0 0 1 2.428 5.83c0 4.554-3.723 8.253-8.302 8.253Z" />
    </svg>
  );
}

export function WhatsAppLink(props: {
  phone: string;
  label: string;
  message?: string;
  className?: string;
  size?: number;
}) {
  const digits = props.phone.replace(/\D/g, "");
  if (!digits) return null;

  const url = props.message
    ? `https://wa.me/55${digits}?text=${encodeURIComponent(props.message)}`
    : `https://wa.me/55${digits}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Enviar WhatsApp para ${props.label}`}
      title="Enviar WhatsApp"
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "grid h-7 w-7 shrink-0 place-items-center rounded border-0 bg-transparent p-0 text-[#25D366] [appearance:none] hover:bg-surface-soft",
        props.className,
      )}
    >
      <WhatsAppGlyph size={props.size ?? 16} />
    </a>
  );
}
