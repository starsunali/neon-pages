'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Renders a QR code to a <canvas> for a given URL. High resolution (1024px)
 * when `large` is set — used for the downloadable version.
 */
export default function QrCodeView({
  value,
  size = 180,
  large = false,
}: {
  value: string;
  size?: number;
  large?: boolean;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: large ? 1024 : size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0b0b1a', light: '#ffffff' },
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value, size, large]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: large ? 1024 : size, height: large ? 1024 : size }}
        className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5"
      >
        <span className="spinner" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={`QR code for ${value}`}
      width={large ? 1024 : size}
      height={large ? 1024 : size}
      className="rounded-xl border border-white/10"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}