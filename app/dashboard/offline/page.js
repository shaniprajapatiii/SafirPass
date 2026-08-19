"use client";

import { useEffect, useState } from "react";
import { WifiOff, ShieldCheck, Smartphone, CheckCircle2, QrCode } from "lucide-react";
import { OFFLINE_CACHE_KEY } from "../../../lib/credential";
import { QrGraphic, BarcodeGraphic } from "../../../components/QrGraphic";

export default function OfflineVerificationPage() {
  const [cache, setCache] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(OFFLINE_CACHE_KEY);
    if (stored) {
      try {
        setCache(JSON.parse(stored));
      } catch {
        setCache(null);
      }
    }
  }, []);

  const mockCache = cache || {
    cachedAt: new Date().toISOString(),
    tourist_id: "IN-TID-884920",
    full_name: "Alexander Wright",
    nationality: "United Kingdom",
    status: "verified",
    barcode: "INTID8849204921",
    token: "eyJ2IjoxLCJ0aWQiOiJJTi1USUQtODg0OTIwIn0",
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="container-page max-w-3xl space-y-8">
        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <WifiOff className="size-4 text-amber-600" /> Part 9 Zero-Connectivity Mode
            </span>
            <h1 className="font-serif text-2xl font-bold text-slate-900">
              Offline Verification &amp; Enclave Cache
            </h1>
            <p className="text-xs text-slate-500">
              Verify credentials without cellular data in remote regions or underground transit.
            </p>
          </div>

          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
            Offline Mode Ready
          </span>
        </div>

        {/* Local Enclave Cache Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Smartphone className="size-8 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Hardware Sealed Credential Token</h2>
              <p className="text-xs text-slate-500">Cached on {new Date(mockCache.cachedAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-1">
              <span className="text-slate-400 font-semibold uppercase">Tourist ID</span>
              <p className="font-mono font-bold text-slate-900 text-sm">{mockCache.tourist_id}</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-1">
              <span className="text-slate-400 font-semibold uppercase">Verification Status</span>
              <p className="font-bold text-emerald-600 capitalize text-sm">{mockCache.status}</p>
            </div>
          </div>

          {/* Barcode graphic for offline scanners */}
          <div className="text-center space-y-3 pt-4 border-t border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Code 128 Offline Scan Reference</span>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-inner flex justify-center">
              <BarcodeGraphic value={mockCache.barcode} height={60} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
