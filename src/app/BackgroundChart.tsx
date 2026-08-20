export function BackgroundChart(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 1000"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <radialGradient id="duplica-glow-1" cx="30%" cy="25%" r="60%">
          <stop offset="0%" stopColor="#6fd3ad" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#16715f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="duplica-glow-2" cx="70%" cy="80%" r="50%">
          <stop offset="0%" stopColor="#39a982" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#123a43" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Orbes de brilho verde-esmeralda vibrantes e pulsantes */}
      <circle cx="240" cy="250" r="350" fill="url(#duplica-glow-1)" className="animate-pulse" style={{ animationDuration: "6s" }} />
      <circle cx="560" cy="750" r="320" fill="url(#duplica-glow-2)" className="animate-pulse" style={{ animationDuration: "8s" }} />

      {/* Linhas de Fluxo de Impressão dinâmicas e perceptíveis */}
      <g stroke="#6fd3ad" strokeOpacity="0.35" strokeWidth="1.8" fill="none">
        <path d="M-100 150 C 200 100, 400 300, 900 200" strokeDasharray="10 6" className="animate-line-draw" />
        <path d="M-100 450 C 300 350, 500 600, 900 480" strokeDasharray="12 8" className="animate-line-draw" style={{ animationDelay: "1s" }} />
        <path d="M-100 780 C 250 700, 600 880, 900 800" strokeDasharray="8 6" className="animate-line-draw" style={{ animationDelay: "2s" }} />
      </g>

      {/* Documentos Duplicados e Papéis em tom verde-água nítido */}
      <g stroke="#6fd3ad" strokeWidth="1.6" fill="#6fd3ad" fillOpacity="0.06" className="animate-float-dot">
        {/* Bloco de Documento 1 - Topo Direita */}
        <g transform="translate(540, 120) rotate(12)" className="animate-pulse" style={{ animationDuration: "5s" }}>
          <rect x="0" y="0" width="110" height="150" rx="8" strokeOpacity="0.45" />
          <rect x="15" y="25" width="60" height="8" rx="4" fillOpacity="0.35" />
          <rect x="15" y="45" width="80" height="6" rx="3" fillOpacity="0.25" />
          <rect x="15" y="60" width="70" height="6" rx="3" fillOpacity="0.25" />
          <rect x="15" y="75" width="50" height="6" rx="3" fillOpacity="0.25" />
        </g>

        {/* Cópia Duplicada 1B */}
        <g transform="translate(565, 145) rotate(12)">
          <rect x="0" y="0" width="110" height="150" rx="8" strokeOpacity="0.55" fillOpacity="0.1" />
          <rect x="15" y="25" width="60" height="8" rx="4" fillOpacity="0.4" />
          <rect x="15" y="45" width="80" height="6" rx="3" fillOpacity="0.3" />
        </g>

        {/* Bloco de Documento 2 - Centro Esquerda */}
        <g transform="translate(80, 420) rotate(-15)" style={{ animationDelay: "1.2s" }}>
          <rect x="0" y="0" width="120" height="160" rx="8" strokeOpacity="0.45" />
          <rect x="18" y="28" width="70" height="9" rx="4.5" fillOpacity="0.35" />
          <rect x="18" y="50" width="84" height="6" rx="3" fillOpacity="0.25" />
          <rect x="18" y="66" width="60" height="6" rx="3" fillOpacity="0.25" />
        </g>

        {/* Cópia Duplicada 2B */}
        <g transform="translate(105, 445) rotate(-15)">
          <rect x="0" y="0" width="120" height="160" rx="8" strokeOpacity="0.6" fillOpacity="0.12" />
          <rect x="18" y="28" width="70" height="9" rx="4.5" fillOpacity="0.4" />
        </g>

        {/* Bloco de Documento 3 - Base Direita */}
        <g transform="translate(480, 680) rotate(8)" style={{ animationDelay: "2.2s" }}>
          <rect x="0" y="0" width="130" height="170" rx="8" strokeOpacity="0.4" />
          <rect x="20" y="30" width="75" height="10" rx="5" fillOpacity="0.3" />
          <rect x="20" y="54" width="90" height="7" rx="3.5" fillOpacity="0.2" />
        </g>
        <g transform="translate(510, 710) rotate(8)">
          <rect x="0" y="0" width="130" height="170" rx="8" strokeOpacity="0.5" fillOpacity="0.1" />
        </g>
      </g>

      {/* Marcas de Corte e Registro Gráfico */}
      <g stroke="#6fd3ad" strokeOpacity="0.4" strokeWidth="1.5">
        <path d="M 40 60 H 70 M 40 60 V 90" />
        <path d="M 760 60 H 730 M 760 60 V 90" />
        <path d="M 40 940 H 70 M 40 940 V 910" />
        <path d="M 760 940 H 730 M 760 940 V 910" />
      </g>
    </svg>
  );
}




