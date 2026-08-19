"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";

export function QrGraphic({ value, size = 200, showTimer = true }) {
  const canvasRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    }, (error) => {
      if (error) console.error("QR generation error:", error);
    });
  }, [value, size]);

  useEffect(() => {
    if (!showTimer) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [showTimer]);

  const percentage = (timeLeft / 30) * 100;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-md">
        <canvas ref={canvasRef} className="rounded-lg" />

        {showTimer && (
          <div className="absolute -top-3 -right-3 flex size-9 items-center justify-center rounded-full bg-slate-900 text-white font-mono text-xs font-bold shadow-lg border-2 border-white">
            <span>{timeLeft}s</span>
          </div>
        )}
      </div>

      {showTimer && (
        <div className="w-full max-w-[200px] space-y-1 text-center">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-blue-600 transition-all duration-1000 ease-linear"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            Cryptographic Payload Rotates in {timeLeft}s
          </span>
        </div>
      )}
    </div>
  );
}

export function BarcodeGraphic({ value, height = 50 }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        height: height,
        displayValue: true,
        fontOptions: "bold",
        fontSize: 12,
        margin: 4,
        background: "#ffffff",
        lineColor: "#0f172a",
      });
    } catch (e) {
      console.error("Barcode generation error:", e);
    }
  }, [value, height]);

  return <svg ref={svgRef} className="max-w-full" />;
}
