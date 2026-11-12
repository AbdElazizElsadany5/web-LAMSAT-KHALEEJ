import { useMemo } from "react";
import QRCode from "qrcode";

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
  title?: string;
}

export function QrCode({ value, size = 84, className, title }: QrCodeProps) {
  const qrMatrix = useMemo(() => {
    try {
      const qr = QRCode.create(value || "https://web-lamsat-khaleej.vercel.app", {
        errorCorrectionLevel: "M",
      });
      return qr.modules;
    } catch (e) {
      console.warn("Failed to generate QR code with M level, retrying with L:", e);
      try {
        const qrFallback = QRCode.create(value || "https://web-lamsat-khaleej.vercel.app", {
          errorCorrectionLevel: "L",
        });
        return qrFallback.modules;
      } catch (err) {
        console.error("Critical QR Code generation error:", err);
        return null;
      }
    }
  }, [value]);

  if (!qrMatrix) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          background: "#FFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          color: "#999",
        }}
      >
        QR Error
      </div>
    );
  }

  const moduleCount = qrMatrix.size;
  // Standard 2-module quiet zone (margin) for 100% camera scanning reliability
  const margin = 2;
  const totalGridSize = moduleCount + margin * 2;
  const cellSize = size / totalGridSize;

  const rects: React.ReactNode[] = [];
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (qrMatrix.get(r, c)) {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={(c + margin) * cellSize}
            y={(r + margin) * cellSize}
            width={cellSize}
            height={cellSize}
            fill="#000000"
          />
        );
      }
    }
  }

  return (
    <div
      className={className}
      style={{
        display: "inline-block",
        background: "#FFFFFF",
        padding: 4,
        borderRadius: 4,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
      title={title || "رمز QR الإلكتروني المعتمد للفاتورة"}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: "block" }}
        shapeRendering="crispEdges"
      >
        <rect width={size} height={size} fill="#FFFFFF" />
        {rects}
      </svg>
    </div>
  );
}
