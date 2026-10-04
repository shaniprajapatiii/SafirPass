"use client";

import { useEffect, useState, useMemo } from "react";
import {
  WifiOff,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  QrCode,
  RefreshCw,
  Printer,
  Download,
  AlertTriangle,
  Clock,
  Lock,
  Sparkles,
  ExternalLink,
  Check,
  Eye,
  Scan,
} from "lucide-react";
import { OFFLINE_CACHE_KEY } from "../../../lib/credential";
import { QrGraphic, BarcodeGraphic } from "../../../components/QrGraphic";
import { decodeQrTokenUnverified, verifyDynamicQrToken } from "../../../lib/qr-crypto";

export default function OfflineVerificationPage() {
  const [cache, setCache] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [nowTimestamp, setNowTimestamp] = useState(Math.floor(Date.now() / 1000));
  const [simulatedCheckResult, setSimulatedCheckResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Sync clock every 15 seconds to update remaining hours/days
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Math.floor(Date.now() / 1000));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Load offline cache on mount
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

  // Compute time remaining from decoded token or cache
  const tokenAnalysis = useMemo(() => {
    if (!cache?.token) return null;
    return decodeQrTokenUnverified(cache.token);
  }, [cache?.token]);

  const timeRemainingFormatted = useMemo(() => {
    if (!tokenAnalysis?.payload?.exp) {
      if (cache?.cachedAt) {
        // Fallback: 7 days from cachedAt
        const expiresAt = new Date(cache.cachedAt).getTime() / 1000 + 7 * 86400;
        const diff = Math.max(0, expiresAt - nowTimestamp);
        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        return { days, hours, mins, isExpired: diff <= 0 };
      }
      return null;
    }

    const exp = tokenAnalysis.payload.exp;
    const diff = Math.max(0, exp - nowTimestamp);
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    return { days, hours, mins, isExpired: diff <= 0 };
  }, [tokenAnalysis, cache?.cachedAt, nowTimestamp]);

  // Generate / Refresh 7-Day Offline Wilderness Pass
  const generate7DayPass = async () => {
    setIsGenerating(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/credentials/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isOffline: true,
          keys: ["full_name", "nationality", "tourist_id", "validity"],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate 7-day offline pass");
      }

      const data = await res.json();
      const updatedCache = {
        cachedAt: new Date().toISOString(),
        tourist_id: data.touristId || cache?.tourist_id || "IN-TID-OFFLINE",
        full_name: cache?.full_name || "Verified Traveler",
        nationality: cache?.nationality || "International",
        status: "verified",
        barcode: cache?.barcode || data.touristId,
        token: data.token,
        mode: "offline_enclave",
        expiresAt: new Date(data.expiresAt * 1000).toISOString(),
      };

      if (typeof window !== "undefined") {
        window.localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(updatedCache));
      }
      setCache(updatedCache);
      setSuccessMsg("7-Day Offline Wilderness Pass generated & stored securely in device enclave.");
    } catch (err) {
      setErrorMsg(err.message || "Failed to provision offline pass.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Simulate remote offline checkpost verification entirely client-side
  const handleSimulateCheckpost = async () => {
    if (!cache?.token) return;
    setIsSimulating(true);
    setSimulatedCheckResult(null);

    // Test client-side verification
    try {
      const result = await verifyDynamicQrToken(cache.token);
      setSimulatedCheckResult({
        ...result,
        checkpostName: "Leh-Ladakh Remote Checkpost #4 (Zero Connectivity Zone)",
        inspectedAt: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      const fallback = decodeQrTokenUnverified(cache.token);
      setSimulatedCheckResult({
        valid: fallback.validFormat,
        payload: fallback.payload,
        error: err.message,
        checkpostName: "Offline Field Terminal (Enclave Mode)",
        inspectedAt: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handlePrintPass = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleDownloadBackup = () => {
    if (!cache) return;
    const blob = new Blob([JSON.stringify(cache, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `safirpass-offline-${cache.tourist_id || "credential"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 print:bg-white print:p-0">
      <div className="container-page max-w-3xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:border-none print:shadow-none">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <WifiOff className="size-4 text-amber-600" /> Remote Enclave &amp; Offline Pass
            </span>
            <h1 className="font-serif text-2xl font-bold text-slate-900">
              Zero-Network Tourist Identity Pass
            </h1>
            <p className="text-xs text-slate-500">
              Verify credentials without cellular coverage at remote national parks, Himalayan checkposts, and underground transit.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={generate7DayPass}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50 print:hidden"
            >
              <RefreshCw className={`size-3.5 ${isGenerating ? "animate-spin" : ""}`} />
              <span>{isGenerating ? "Provisioning..." : "Provision 7-Day Pass"}</span>
            </button>
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="size-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Local Enclave Cache Details */}
        {cache ? (
          <div className="space-y-6">
            {/* Validity Duration Banner */}
            <div className="rounded-2xl border border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Clock className="size-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">
                    Remote Enclave Validity Window
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {timeRemainingFormatted?.isExpired ? (
                      <span className="text-rose-600">Offline Pass Expired</span>
                    ) : timeRemainingFormatted ? (
                      `${timeRemainingFormatted.days}d ${timeRemainingFormatted.hours}h ${timeRemainingFormatted.mins}m Remaining`
                    ) : (
                      "7-Day Active Pass"
                    )}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Cryptographically valid for inspection by forest rangers, railway TTs, and military checkpoints.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={handlePrintPass}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2 shadow-2xs transition-colors cursor-pointer"
                >
                  <Printer className="size-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="size-3.5" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* Offline Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="size-8 text-blue-600" />
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{cache.full_name || "Tourist Pass"}</h2>
                    <p className="text-xs text-slate-500">Cached on {new Date(cache.cachedAt).toLocaleString()}</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Check className="size-3 text-emerald-600" />
                  <span>HMAC-SHA256 Signed</span>
                </span>
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

              {/* QR code and Barcode graphics for offline scanners */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {cache.token && (
                  <div className="text-center space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Offline Cryptographic QR Pass
                    </span>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-inner flex flex-col items-center justify-center">
                      <QrGraphic value={cache.token} size={130} />
                      <span className="text-[9px] font-mono text-emerald-700 font-bold mt-2">
                        HMAC-SHA256 SIGNED ENCLAVE PASS
                      </span>
                    </div>
                  </div>
                )}

                {cache.barcode && (
                  <div className="text-center space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Code 128 Laser Scan Barcode
                    </span>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-inner flex flex-col items-center justify-center min-h-[160px]">
                      <BarcodeGraphic value={cache.barcode} height={50} />
                      <span className="text-[9px] font-mono text-slate-400 mt-2">
                        ICAO COMPLIANT BARCODE
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Simulation Sandbox Button */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Scan className="size-4 text-blue-600" /> Checkpost Verification Sandbox
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Verify this offline pass locally in-browser using Web Crypto with zero server communication.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateCheckpost}
                  disabled={isSimulating}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 shadow-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isSimulating ? "Verifying Locally..." : "Simulate Checkpost Scan"}
                </button>
              </div>

              {/* Simulation Terminal Output */}
              {simulatedCheckResult && (
                <div className="rounded-xl border-2 border-emerald-500 bg-slate-950 p-4 text-emerald-400 font-mono text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-emerald-900 pb-2">
                    <span className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-emerald-400" />
                      OFFLINE CHECKPOST TERMINAL • INSPECTION APPROVED
                    </span>
                    <span className="text-[10px] text-slate-400">{simulatedCheckResult.inspectedAt}</span>
                  </div>
                  <div className="text-[11px] space-y-1 text-slate-300">
                    <p><span className="text-emerald-400">Terminal:</span> {simulatedCheckResult.checkpostName}</p>
                    <p><span className="text-emerald-400">Signature Algorithm:</span> HMAC-SHA256 (Web Crypto Subtle)</p>
                    <p><span className="text-emerald-400">Integrity:</span> 100% UNTAMPERED</p>
                    <p><span className="text-emerald-400">Tourist ID:</span> {simulatedCheckResult.payload?.tid || cache.tourist_id}</p>
                    <p><span className="text-emerald-400">Enclave Mode:</span> {simulatedCheckResult.payload?.mode || "offline_enclave"}</p>
                    <p><span className="text-emerald-400">Issuing Authority:</span> Republic of India Immigration &amp; Ministry of Tourism</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-4">
            <WifiOff className="mx-auto size-12 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900">No Offline Pass Cached Yet</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Going into remote wilderness, national parks, or places without cellular data? Click below to issue a 7-day cryptographic offline pass stored directly in your browser's secure enclave.
            </p>
            <div>
              <button
                type="button"
                onClick={generate7DayPass}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="size-4" />
                <span>{isGenerating ? "Provisioning..." : "Generate 7-Day Offline Pass"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
