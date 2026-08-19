"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, QrCode, Lock, Building2 } from "lucide-react";
import { decodeShare } from "../../lib/credential";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("d") || "";
  const [payload, setPayload] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const decoded = decodeShare(token);
    if (decoded) {
      setPayload(decoded);
      setInvalid(false);
    } else {
      setInvalid(true);
    }
    setLoading(false);
  }, [token]);

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Header Branding */}
      <div className="text-center space-y-2">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
          <ShieldCheck className="size-7" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-slate-900">SafirPass Public Verifier</h1>
        <p className="text-xs text-slate-500">Government Authority Cryptographic Credential Scanner</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-md animate-pulse">
          <QrCode className="mx-auto size-8 text-slate-400" />
          <p className="mt-3 text-sm text-slate-600">Verifying cryptographic token signature...</p>
        </div>
      ) : payload ? (
        <div className="rounded-2xl border-2 border-emerald-500 bg-white p-6 shadow-xl space-y-6">
          {/* Validity Banner */}
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 border border-emerald-200">
            <CheckCircle2 className="size-8 text-emerald-600 shrink-0" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Verification Result</span>
              <h2 className="text-lg font-extrabold text-emerald-950">AUTHENTIC &amp; VALID CREDENTIAL</h2>
              <p className="text-xs text-emerald-700">Issued by Republic of India Immigration Authority</p>
            </div>
          </div>

          {/* Credential Attributes */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold uppercase text-slate-500">Tourist ID</span>
              <span className="font-mono text-sm font-bold text-blue-700">{payload.tid}</span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase text-slate-500">Approved Disclosed Attributes:</span>
              <div className="rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-200">
                {payload.fields.map((f, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 text-sm">
                    <span className="text-slate-600">{f.label}</span>
                    <span className="font-semibold text-slate-900">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-blue-50 p-3 text-[11px] text-blue-800 flex items-center gap-2">
            <Lock className="size-4 text-blue-600 shrink-0" />
            <span>Zero raw passport data or face biometrics were exposed during this verification scan.</span>
          </div>
        </div>
      ) : invalid ? (
        <div className="rounded-2xl border-2 border-red-500 bg-white p-6 shadow-xl space-y-4 text-center">
          <XCircle className="mx-auto size-12 text-red-600" />
          <h2 className="text-xl font-bold text-slate-900">INVALID OR EXPIRED CREDENTIAL</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            This QR code or token payload could not be verified. It may have expired, been tampered with, or revoked.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-md space-y-4">
          <QrCode className="mx-auto size-12 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">No verification token provided</h2>
          <p className="text-xs text-slate-600">
            Scan a tourist's SafirPass dynamic QR code or append <code>?d=TOKEN</code> to this page URL to verify identity credentials.
          </p>
        </div>
      )}
    </div>
  );
}

export default function PublicVerifyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 flex flex-col items-center justify-center">
      <Suspense fallback={
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-md">
          <QrCode className="mx-auto size-8 text-slate-400 animate-pulse" />
          <p className="mt-3 text-sm text-slate-600">Loading verification portal...</p>
        </div>
      }>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
