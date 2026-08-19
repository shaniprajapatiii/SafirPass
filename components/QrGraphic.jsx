"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";

export function QrGraphic({ value, size = 200, showStatus = true, showBadge = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      },
      (error) => {
        if (error) console.error("QR generation error:", error);
      }
    );
  }, [value, size]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-md">
        <canvas ref={canvasRef} className="rounded-lg" />

        {showBadge && (
          <div
            className="absolute -top-3 -right-3 flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-white font-mono text-[10px] font-bold shadow-lg border-2 border-white"
            title="Hardware-Signed Cryptographic Token"
          >
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE</span>
          </div>
        )}
      </div>

      {showStatus && (
        <div className="w-full max-w-[210px] space-y-1 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 py-1 px-3 rounded-full border border-slate-200">
            <span className="size-2 rounded-full bg-blue-600" />
            <span>Selective Disclosure Dynamic Token</span>
          </div>
          <p className="text-[10px] font-medium text-slate-500">
            Cryptographically Encoded Payload
          </p>
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
