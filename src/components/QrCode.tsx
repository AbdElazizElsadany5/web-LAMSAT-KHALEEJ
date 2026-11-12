import { useState, useEffect } from "react";
import QRCode from "qrcode";

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
  title?: string;
}

export function QrCode({ value, size = 140, className, title }: QrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    const targetUrl = value || "https://web-lamsat-khaleej.vercel.app";

    QRCode.toDataURL(targetUrl, {
      width: Math.max(280, size * 2),
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
      .then((url) => {
        if (isMounted) setDataUrl(url);
      })
      .catch((err) => {
        console.warn("QR generation fallback to L level:", err);
        QRCode.toDataURL(targetUrl, {
          width: Math.max(280, size * 2),
          margin: 2,
          errorCorrectionLevel: "L",
        }).then((url) => {
          if (isMounted) setDataUrl(url);
        });
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  return (
    <div
      className={className}
      style={{
        display: "inline-block",
        background: "#FFFFFF",
        padding: 6,
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        textAlign: "center",
      }}
      title={title || "رمز QR الإلكتروني المعتمد للفاتورة"}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="QR Code"
          width={size}
          height={size}
          style={{
            display: "block",
            width: size,
            height: size,
            imageRendering: "pixelated",
            borderRadius: 4,
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            background: "#F5F5F5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            color: "#999",
          }}
        >
          جارٍ التحميل...
        </div>
      )}
    </div>
  );
}
