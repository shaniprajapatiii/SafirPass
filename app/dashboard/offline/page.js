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

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="container-page max-w-3xl space-y-8">
        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <WifiOff className="size-4 text-amber-600" /> Offline Enclave Verification
            </span>
            <h1 className="font-serif text-2xl font-bold text-slate-900">
              Offline Verification &amp; Enclave Cache
            </h1>
            <p className="text-xs text-slate-500">
              Verify credentials without cellular data in remote regions or underground transit.
            </p>
          </div>

          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
            {cache ? "Offline Pass Ready" : "No Cache Yet"}
          </span>
        </div>

        {/* Local Enclave Cache Details */}
        {cache ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <Smartphone className="size-8 text-blue-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">{cache.full_name || "Tourist Pass"}</h2>
                <p className="text-xs text-slate-500">Cached on {new Date(cache.cachedAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-1">
                <span className="text-slate-400 font-semibold uppercase">Tourist ID</span>
                <p className="font-mono font-bold text-slate-900 text-sm">{cache.tourist_id}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-1">
                <span className="text-slate-400 font-semibold uppercase">Verification Status</span>
                <p className="font-bold text-emerald-600 capitalize text-sm">{cache.status}</p>
              </div>
            </div>

            {/* Barcode graphic for offline scanners */}
            {cache.barcode && (
              <div className="text-center space-y-3 pt-4 border-t border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Code 128 Offline Scan Reference</span>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-inner flex justify-center">
                  <BarcodeGraphic value={cache.barcode} height={60} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-4">
            <WifiOff className="mx-auto size-12 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900">No Offline Pass Cached</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              To use offline mode, please view your verified Digital Tourist ID while connected to the internet. It will automatically cache securely to your device.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

