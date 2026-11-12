export function BarberScissorsCombLogo({ size = 44 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        margin: "0 auto 6px",
        borderRadius: "50%",
        border: "1.8px solid #1A1A1A",
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "inset 0 0 0 2px #FFFFFF, inset 0 0 0 3px #B8962E",
      }}
    >
      <svg
        width={Math.round(size * 0.64)}
        height={Math.round(size * 0.64)}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Crossed Comb (diagonal bottom-left to top-right) */}
        <g transform="rotate(-45 32 32)">
          <rect x="10" y="27" width="44" height="5" rx="2" fill="#1A1A1A" />
          <line x1="14" y1="32" x2="14" y2="39" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="19" y1="32" x2="19" y2="39" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="24" y1="32" x2="24" y2="39" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="29" y1="32" x2="29" y2="39" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="34" y1="32" x2="34" y2="39" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="39" y1="32" x2="39" y2="39" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="44" y1="32" x2="44" y2="39" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="49" y1="32" x2="49" y2="39" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" />
        </g>

        {/* Crossed Barber Scissors */}
        <g transform="rotate(45 32 32)">
          {/* Upper & lower blades */}
          <path d="M24 29 L55 26 L53 31 L24 32 Z" fill="#1A1A1A" />
          <path d="M24 35 L55 38 L53 33 L24 32 Z" fill="#333333" />
          {/* Pivot screw */}
          <circle cx="31" cy="32" r="2" fill="#D4AF37" stroke="#1A1A1A" strokeWidth="1" />
          {/* Finger rings */}
          <circle cx="16" cy="25" r="5.5" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="2.6" />
          <circle cx="16" cy="39" r="5.5" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="2.6" />
        </g>
      </svg>
    </div>
  );
}

export function ThermalReceiptHeader({
  title,
  address,
  taxId,
  phone,
  isNarrow = false,
}: {
  title?: string;
  address?: string;
  taxId?: string;
  phone?: string;
  isNarrow?: boolean;
}) {
  return (
    <div
      className="thermal-paper-header"
      style={{
        textAlign: "center",
        marginBottom: isNarrow ? 8 : 10,
        paddingBottom: isNarrow ? 8 : 10,
        borderBottom: "1.5px solid #1A1A1A",
      }}
    >
      <BarberScissorsCombLogo size={isNarrow ? 38 : 48} />

      <div
        className="thermal-paper-logo"
        style={{
          fontSize: isNarrow ? 15 : 18,
          fontWeight: 900,
          color: "#000",
          letterSpacing: "-0.01em",
        }}
      >
        {title || "لمسة خليجي"}
      </div>

      <div
        style={{
          display: "inline-block",
          marginTop: 3,
          padding: "1px 8px",
          borderRadius: 4,
          border: "1px solid #1A1A1A",
          fontSize: isNarrow ? 8.5 : 9.5,
          fontWeight: 800,
          color: "#1A1A1A",
          letterSpacing: "0.02em",
        }}
      >
        أناقتك تبدأ من هنا
      </div>

      {address && (
        <div style={{ fontSize: isNarrow ? 9 : 10, color: "#333", marginTop: 5, fontWeight: 600 }}>
          {address}
        </div>
      )}
      {phone && (
        <div style={{ fontSize: isNarrow ? 8.5 : 9.5, color: "#222", marginTop: 2, fontWeight: 700, fontFamily: "Inter, Cairo" }}>
          هاتف: {phone}
        </div>
      )}
      {taxId && (
        <div style={{ fontSize: isNarrow ? 8 : 9, color: "#555", fontFamily: "Inter", marginTop: 2 }}>
          {taxId}
        </div>
      )}
    </div>
  );
}

