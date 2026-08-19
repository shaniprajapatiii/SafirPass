"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Printer, QrCode, ShieldCheck, Smartphone, WifiOff, Check, AlertCircle } from "lucide-react";
import { useAuth } from "../../../lib/auth-context";
import { supabase } from "../../../lib/supabase";
import { QrGraphic, BarcodeGraphic } from "../../../components/QrGraphic";
import { ATTRIBUTES, OFFLINE_CACHE_KEY, attributeValue, barcodeValue, buildShare, encodeShare} from "../../../lib/credential";

const DEFAULT_KEYS = ["full_name", "nationality", "tourist_id", "validity"];

export default function DigitalIdPage() {
  const { user } = useAuth();
  const [kyc, setKyc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState(DEFAULT_KEYS);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from("kyc_applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setKyc(data || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const activeKyc = useMemo(() => {
    if (kyc) return kyc;
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("safirpass_active_kyc");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  }, [kyc]);

  const share = useMemo(() => {
    if (!activeKyc) return null;
    return buildShare(activeKyc, keys);
  }, [activeKyc, keys]);

  const token = useMemo(() => (share ? encodeShare(share) : ""), [share]);

  const shareUrl = useMemo(() => {
    if (!token) return "";
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}/verify?d=${token}`;
  }, [token]);

  // Offline Cache Sync
  useEffect(() => {
    if (typeof window === "undefined" || !activeKyc || !token) return;
    window.localStorage.setItem(
      OFFLINE_CACHE_KEY,
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        tourist_id: activeKyc.tourist_id,
        full_name: activeKyc.full_name,
        nationality: activeKyc.nationality,
        status: activeKyc.status,
        barcode: barcodeValue(activeKyc),
        token,
      })
    );
  }, [activeKyc, token]);

  const toggleKey = (key) => {
    setKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const downloadDocument = () => {
    const node = document.getElementById("credential-print-node");
    if (!node) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>SafirPass Digital Tourist ID - ${activeKyc?.tourist_id || "ID"}</title>
<style>body{font-family:sans-serif;color:#0f172a;margin:32px;} .card{border:1px solid #cbd5e1;border-radius:12px;padding:24px;margin-bottom:20px;background:#0f172a;color:#ffffff;} table{border-collapse:collapse;width:100%} td{padding:8px;border-bottom:1px solid #e2e8f0;font-size:14px}</style>
</head><body>${node.innerHTML}</body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `SafirPass-ID-${activeKyc?.tourist_id || "credential"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-md animate-pulse">
          <QrCode className="mx-auto size-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!activeKyc) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg space-y-4">
          <AlertCircle className="mx-auto size-12 text-amber-500" />
          <h2 className="text-xl font-bold text-slate-900">No Verified Credential Found</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            You must complete document OCR and facial liveness verification to generate your dynamic Digital Tourist ID.
          </p>
          <Link
            href="/dashboard/verify"
            className="inline-block rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-700"
          >
            Start e-KYC Verification
          </Link>
        </div>
      </div>
    );
  }

  const code128 = barcodeValue(activeKyc);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="container-page space-y-8">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:hidden">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Selective Disclosure Digital ID</span>
            <h1 className="font-serif text-2xl font-bold text-slate-900">
              Authority Digital Tourist ID
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Tourist ID: <span className="font-mono font-bold text-slate-900">{activeKyc.tourist_id}</span> · Updates dynamically based on selected attributes
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="size-4" /> Print
            </button>
            <button
              onClick={downloadDocument}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700"
            >
              <Download className="size-4" /> Download Document
            </button>
          </div>
        </div>

        {/* Dynamic Controls Grid */}
        <div className="grid gap-8 lg:grid-cols-3 print:hidden">
          {/* Attributes Disclosed Checklist */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Selective Information Disclosure</h3>
              <p className="text-xs text-slate-500">
                Check or uncheck information fields below. Your QR code will update in real time to encode only what you choose to share.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              {ATTRIBUTES.map((attr) => {
                const checked = keys.includes(attr.key);
                return (
                  <label
                    key={attr.key}
                    onClick={() => toggleKey(attr.key)}
                    className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                      checked ? "border-blue-200 bg-blue-50/50" : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border ${
                      checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                    }`}>
                      {checked && <Check className="size-3.5" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{attr.label}</p>
                      <p className="text-[11px] text-slate-500">{attr.hint}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Dynamic QR & Barcode Showcase */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row items-center justify-around gap-8">
              {/* Dynamic QR */}
              <div className="text-center space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Selective Disclosure Dynamic QR</span>
                <QrGraphic value={shareUrl || code128} size={210} showStatus={true} showBadge={true} />
              </div>

              {/* Code 128 Barcode */}
              <div className="text-center space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Code 128 Printed Barcode</span>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-inner flex justify-center">
                  <BarcodeGraphic value={code128} height={60} />
                </div>
                <span className="inline-block text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  Offline Reference Code
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600 flex items-center gap-3">
              <Smartphone className="size-5 text-blue-600 shrink-0" />
              <span>
                Your QR code updates immediately based on the selected attributes, allowing you to share only the minimum required details for verification.
              </span>
            </div>
          </div>
        </div>

        {/* Printable Digital Card Node */}
        <div id="credential-print-node" className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-white shadow-xl space-y-6 print:bg-white print:text-black print:border-black">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                  Republic of India · SafirPass Smart Tourist ID
                </span>
                <h2 className="font-serif text-3xl font-extrabold text-white">{activeKyc.full_name}</h2>
                <p className="text-sm text-slate-300">{activeKyc.nationality}</p>

                <div className="grid grid-cols-2 gap-4 text-xs pt-3">
                  <div>
                    <span className="text-slate-400 block uppercase">Tourist ID</span>
                    <span className="font-mono font-bold text-white text-sm">{activeKyc.tourist_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase">Status</span>
                    <span className="font-bold text-emerald-400 capitalize">{activeKyc.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase">Stay Validity</span>
                    <span className="font-bold text-white">{activeKyc.exit_date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase">Visa Category</span>
                    <span className="font-bold text-white">{activeKyc.visa_type}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white p-3 shadow-md shrink-0">
                <QrGraphic value={shareUrl || code128} size={140} showStatus={false} showBadge={false} />
              </div>
            </div>

            {/* Disclosed Attributes Table */}
            <div className="border-t border-slate-800 pt-6 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Disclosed Credential Attributes</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-slate-800">
                    {ATTRIBUTES.filter((a) => keys.includes(a.key)).map((a) => (
                      <tr key={a.key}>
                        <td className="py-2 pr-4 text-slate-400 font-medium">{a.label}</td>
                        <td className="py-2 font-bold text-white">{attributeValue(activeKyc, a.key)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
