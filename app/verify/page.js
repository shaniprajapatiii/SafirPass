"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  QrCode,
  Lock,
  Building2,
  Camera,
  RefreshCw,
  Clock,
  Radio,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { verifyDynamicQrToken, decodeQrTokenUnverified } from "@/lib/qr-crypto";

function VerifyContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("d") || searchParams.get("token") || "";

  const [inputToken, setInputToken] = useState(tokenParam);
  const [activeToken, setActiveToken] = useState(tokenParam);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const scannerRef = useRef(null);

  // Sync token from URL searchParams
  useEffect(() => {
    if (tokenParam) {
      setInputToken(tokenParam);
      setActiveToken(tokenParam);
    }
  }, [tokenParam]);

  // Execute verification against authority cryptographic API
  const performVerification = async (tok) => {
    if (!tok || !tok.trim()) {
      setResult(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setScannerError("");

    try {
      const res = await fetch("/api/credentials/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tok.trim() }),
      });

      const data = await res.json();
      setResult(data);
      if (typeof data.secondsRemaining === "number") {
        setSecondsRemaining(data.secondsRemaining);
      } else {
        setSecondsRemaining(null);
      }
    } catch (err) {
      // Offline fallback: verify client-side using Web Crypto subtle
      console.warn("Online verification failed, attempting offline enclave verification:", err.message);
      try {
        const clientVerif = await verifyDynamicQrToken(tok.trim());
        if (clientVerif.valid) {
          const payload = clientVerif.payload || {};
          setResult({
            valid: true,
            isOfflineVerified: true,
            touristId: payload.tid,
            status: payload.status || "verified",
            issuer: payload.iss || "Republic of India Immigration Authority",
            mode: payload.mode || "offline_enclave",
            fields: payload.fields || [],
            secondsRemaining: clientVerif.secondsRemaining,
            verifiedAt: clientVerif.verifiedAt,
            securityAudit: {
              algorithm: "HMAC-SHA256 (Client-Side Enclave Engine)",
              nonce: payload.nonce,
              pkiIssuer: "Republic of India Immigration Authority",
              tamperEvident: true,
              offlineCheckpostVerified: true,
            },
          });
          setSecondsRemaining(clientVerif.secondsRemaining ?? null);
          return;
        } else if (clientVerif.expired) {
          setResult({
            valid: false,
            expired: true,
            error: clientVerif.error || "Credential has expired.",
            payload: clientVerif.payload,
          });
          return;
        } else if (clientVerif.tampered) {
          setResult({
            valid: false,
            tampered: true,
            error: clientVerif.error || "Cryptographic signature mismatch.",
          });
          return;
        }
      } catch (clientErr) {
        console.warn("Client-side verification error:", clientErr);
      }

      setResult({
        valid: false,
        error: `Network error verifying credential: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeToken) {
      performVerification(activeToken);
    }
  }, [activeToken]);

  // Live countdown ticker if token is dynamic
  useEffect(() => {
    if (secondsRemaining == null || secondsRemaining <= 0) return;
    const ticker = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Token just expired
          performVerification(activeToken);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(ticker);
  }, [secondsRemaining, activeToken]);

  // HTML5 Camera QR Code Scanner integration
  const startCameraScanner = async () => {
    setScannerError("");
    setCameraActive(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scannerId = "safirpass-camera-reader";

      // Allow DOM to paint the reader element
      setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode(scannerId);
          scannerRef.current = html5QrCode;

          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          };

          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              // Successfully scanned QR code
              stopCameraScanner();
              // Parse ?d=TOKEN or raw token string
              let scannedToken = decodedText.trim();
              if (scannedToken.includes("?d=")) {
                scannedToken = scannedToken.split("?d=")[1].split("&")[0];
              } else if (scannedToken.includes("token=")) {
                scannedToken = scannedToken.split("token=")[1].split("&")[0];
              }
              setInputToken(scannedToken);
              setActiveToken(scannedToken);
            },
            () => {
              // Frame scan error (ignore normal searching frames)
            }
          );
        } catch (initErr) {
          console.warn("Scanner start error:", initErr);
          setScannerError(initErr.message || "Failed to access device camera.");
          setCameraActive(false);
        }
      }, 100);
    } catch (err) {
      setScannerError("Camera QR scanner library not available.");
      setCameraActive(false);
    }
  };

  const stopCameraScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.warn("Scanner stop note:", err);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (inputToken.trim()) {
      setActiveToken(inputToken.trim());
    }
  };

  return (
    <div className="w-full max-w-xl space-y-6">
      {/* Header Branding */}
      <div className="text-center space-y-2">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg border-2 border-white">
          <ShieldCheck className="size-8" />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          SafirPass Authority Verifier
        </h1>
        <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
          National Immigration &amp; Service Provider Cryptographic Verification Gateway • DPDP Act 2023 Compliant
        </p>
      </div>

      {/* Quick Action Control Bar: Camera Scanner & Manual Input */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase text-slate-600 tracking-wider">
            Verification Method
          </span>
          <button
            type="button"
            onClick={cameraActive ? stopCameraScanner : startCameraScanner}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              cameraActive
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <Camera className="size-3.5" />
            <span>{cameraActive ? "Close Camera" : "Scan With Camera"}</span>
          </button>
        </div>

        {/* Live Camera Scanner Box */}
        {cameraActive && (
          <div className="rounded-xl border-2 border-blue-500 bg-slate-950 p-3 space-y-2 animate-in fade-in">
            <div id="safirpass-camera-reader" className="w-full overflow-hidden rounded-lg min-h-[260px]" />
            <p className="text-center text-[11px] text-slate-300">
              Align tourist's dynamic QR code within the camera frame.
            </p>
          </div>
        )}

        {scannerError && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="size-4 text-rose-600 shrink-0" />
            <span>{scannerError}</span>
          </div>
        )}

        {/* Manual Token Input Fallback */}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Paste raw cryptographic token or scan URL..."
            value={inputToken}
            onChange={(e) => setInputToken(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 shadow-xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <RefreshCw className="size-3.5 animate-spin" /> : "Verify Token"}
          </button>
        </form>
      </div>

      {/* Verification State Renderings */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-md animate-pulse space-y-3">
          <QrCode className="mx-auto size-10 text-blue-500 animate-spin" />
          <h3 className="text-sm font-bold text-slate-800">Verifying HMAC-SHA256 Cryptographic Signature</h3>
          <p className="text-xs text-slate-500">Checking national immigration authority registry and anti-replay nonces...</p>
        </div>
      ) : result?.valid ? (
        /* ========================================================= */
        /* AUTHENTIC & VALID CREDENTIAL RESULT                       */
        /* ========================================================= */
        <div className="rounded-3xl border-2 border-emerald-500 bg-white p-6 shadow-xl space-y-6">
          {/* Validity Banner */}
          <div className="flex items-start justify-between gap-3 rounded-2xl bg-emerald-50/90 p-4 border border-emerald-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="size-8 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">
                  National Digital Identity Verification
                </span>
                <h2 className="text-lg font-black text-emerald-950">AUTHENTIC &amp; SIGNED CREDENTIAL</h2>
                <p className="text-xs text-emerald-700 font-medium">
                  {result.issuer || "Republic of India Immigration Authority"}
                </p>
              </div>
            </div>

            {/* Dynamic Expiry Pill */}
            {secondsRemaining != null && (
              <div className="text-right shrink-0">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-mono font-bold">
                  <Clock className="size-3 text-emerald-700" />
                  <span>{secondsRemaining}s left</span>
                </span>
                <span className="text-[9px] text-emerald-600 block mt-0.5">
                  {result.isOfflineVerified ? "Offline Enclave TTL" : "Live Dynamic Anti-Replay"}
                </span>
              </div>
            )}
          </div>

          {result.isOfflineVerified && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-center gap-2">
              <WifiOff className="size-4 text-amber-700 shrink-0" />
              <span>
                <strong>Remote Enclave Verified:</strong> Authenticated directly in-browser using HMAC-SHA256 signature without internet connection.
              </span>
            </div>
          )}

          {/* Tourist ID & Status Header */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Tourist ID</span>
              <p className="font-mono text-base font-black text-blue-900">{result.touristId}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Status In National Registry</span>
              <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 capitalize">
                {result.status || "verified"}
              </span>
            </div>
          </div>

          {/* Approved Disclosed Attributes */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Disclosed Attributes (Selective Privacy)
            </span>
            <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden shadow-2xs">
              {Array.isArray(result.fields) && result.fields.length > 0 ? (
                result.fields.map((f, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 text-xs sm:text-sm">
                    <span className="text-slate-500 font-medium">{f.label || f.key}</span>
                    <span className="font-bold text-slate-900">{f.value || "—"}</span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  No optional attributes disclosed. Basic identity confirmed.
                </div>
              )}
            </div>
          </div>

          {/* Cryptographic Security Audit Stamp */}
          <div className="rounded-2xl bg-blue-50/70 border border-blue-200 p-3.5 space-y-1.5 text-xs text-blue-900">
            <div className="flex items-center gap-1.5 font-bold text-blue-950">
              <Lock className="size-3.5 text-blue-600" />
              <span>Cryptographic Proof &amp; Zero-Knowledge Protection</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Signature verified via HMAC-SHA256 authority key. Raw passport biometrics and unselected personal data were not transmitted or exposed during this scan.
            </p>
            <div className="flex justify-between items-center pt-1 text-[10px] text-blue-700 font-mono border-t border-blue-200/60">
              <span>Verified: {new Date(result.verifiedAt || Date.now()).toLocaleTimeString()}</span>
              <span>Nonce: {result.securityAudit?.nonce?.slice(0, 8) || "VERIFIED"}</span>
            </div>
          </div>
        </div>
      ) : result?.expired ? (
        /* ========================================================= */
        /* EXPIRED DYNAMIC QR RESULT (ANTI-SCREENSHOT ENFORCEMENT)   */
        /* ========================================================= */
        <div className="rounded-3xl border-2 border-amber-500 bg-white p-6 shadow-xl space-y-5 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Clock className="size-8 animate-pulse" />
          </div>
          <div className="space-y-1">
            <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 border border-amber-300 uppercase">
              Security Notice
            </span>
            <h2 className="text-xl font-bold text-slate-900">DYNAMIC QR CODE EXPIRED</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              {result.error ||
                "This QR code has passed its 45-second validity window. Screenshots or stale printouts are strictly rejected by policy."}
            </p>
          </div>

          <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 text-xs text-amber-900 text-left space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="size-4 text-amber-700" />
              <span>Action for Verifier (Hotel / Airline / Police):</span>
            </p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Please request the tourist to open their SafirPass app on their mobile phone and present their current live rotating pass.
            </p>
          </div>

          <button
            type="button"
            onClick={() => performVerification(activeToken)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
            <span>Re-Check Token</span>
          </button>
        </div>
      ) : result?.tampered || result?.valid === false ? (
        /* ========================================================= */
        /* TAMPERED OR FORGED CREDENTIAL RESULT                      */
        /* ========================================================= */
        <div className="rounded-3xl border-2 border-rose-500 bg-white p-6 shadow-xl space-y-5 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
            <XCircle className="size-8" />
          </div>
          <div className="space-y-1">
            <span className="rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2.5 py-0.5 border border-rose-300 uppercase">
              Integrity Warning
            </span>
            <h2 className="text-xl font-bold text-slate-900">CRYPTOGRAPHIC SIGNATURE FAILURE</h2>
            <p className="text-xs text-rose-700 font-semibold max-w-md mx-auto leading-relaxed">
              {result.error || "The cryptographic signature could not be verified. This credential has been altered, forged, or revoked."}
            </p>
          </div>

          <div className="rounded-2xl bg-rose-50 p-4 border border-rose-200 text-xs text-rose-900 text-left space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="size-4 text-rose-700" />
              <span>Security Advisory:</span>
            </p>
            <p className="text-[11px] text-rose-800 leading-relaxed">
              Do not accept this pass as valid government identification. Contact local tourist police assistance at 1363 or 112 if counterfeit activity is suspected.
            </p>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* EMPTY STATE: READY TO SCAN                                */
        /* ========================================================= */
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-md space-y-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <QrCode className="size-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">Ready to Verify Credentials</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Scan a tourist's SafirPass dynamic QR code with your camera or paste a signed token above.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-2">
            <button
              type="button"
              onClick={startCameraScanner}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 shadow-xs transition-colors cursor-pointer"
            >
              <Camera className="size-4" />
              <span>Launch Camera Scanner</span>
            </button>
            <Link
              href="/dashboard/id"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 transition-colors"
            >
              <span>View My Pass</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PublicVerifyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center justify-center">
      <Suspense
        fallback={
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-md">
            <QrCode className="mx-auto size-8 text-slate-400 animate-pulse" />
            <p className="mt-3 text-sm text-slate-600">Loading SafirPass verification gateway...</p>
          </div>
        }
      >
        <VerifyContent />
      </Suspense>
    </div>
  );
}
